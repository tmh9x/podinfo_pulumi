import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const vpc = new aws.ec2.Vpc("my-vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
});

const publicSubnet = new aws.ec2.Subnet("public-subnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: "eu-central-1a",
  mapPublicIpOnLaunch: true,
});

const ig = new aws.ec2.InternetGateway("ig", {
  vpcId: vpc.id,
});

const rt = new aws.ec2.RouteTable("rt", {
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: ig.id,
    },
  ],
  vpcId: vpc.id,
});

new aws.ec2.RouteTableAssociation("rta", {
  routeTableId: rt.id,
  subnetId: publicSubnet.id,
});

const securityGroup = new aws.ec2.SecurityGroup("web-sg", {
  vpcId: vpc.id,
  ingress: [
    {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      fromPort: 22,
      toPort: 22,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    {
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
});

const instance = new aws.ec2.Instance("web-server", {
  instanceType: "t2.micro",
  vpcSecurityGroupIds: [securityGroup.id],
  subnetId: publicSubnet.id,
  ami: "ami-0f673487d7e5f89ca",
  tags: {
    Name: "web-server",
  },
  userData: pulumi.interpolate`#!/bin/bash
        sudo yum install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo docker run -d -p 80:9898 stefanprodan/podinfo
    `,
});

export const publicIp = instance.publicIp;
