---
navigation_title: "AWS EC2"
type: reference
description: "Use the AWS EC2 connector to inspect, stop, start, reboot, and terminate EC2 instances, and to quarantine them with security group changes."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# AWS EC2 connector [aws-ec2-action-type]

The AWS EC2 connector calls the [Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/Welcome.html) API so a workflow or agent can carry out instance-level remediation and network containment: resolve an alert to a real instance, isolate it by changing its security groups, stop, start, reboot, or terminate it, and capture an EBS snapshot as evidence first.

## Create connectors in {{kib}} [define-aws-ec2-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [aws-ec2-connector-configuration]

AWS EC2 connectors have the following configuration properties:

AWS Region
:   The AWS Region the instances live in, for example `us-east-1`. EC2 is a regional service, so a connector only reaches resources in this region. To work across multiple regions, create one connector per region.

### Authentication [aws-ec2-connector-authentication]

**AWS credentials**

Access Key ID
:   The AWS IAM access key ID used to sign every request with Signature Version 4 (SigV4).

Secret Access Key
:   The AWS IAM secret access key paired with the access key ID above.

## Test connectors [aws-ec2-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test calls the EC2 `DescribeRegions` API to verify connectivity and that the credentials can authenticate against EC2 in the configured region. It does not require any instance to exist.

## Connector actions [aws-ec2-connector-actions]

The AWS EC2 connector has the following actions:

`describeInstances`
:   Look up instances and return each one's state, instance type, private and public IP, VPC, subnet, availability zone, attached security groups, and tags. Run this first to resolve an alert to a real instance and to capture the security groups a containment step must restore later. Never returns instance user data, which commonly contains secrets.

`describeSecurityGroups`
:   List security groups with their current inbound and outbound rules, VPC, and tags. Run it before a containment step to record the existing exposure.

`describeSecurityGroupRules`
:   List individual security group rules, each with its own rule id. Prefer this when you intend to revoke or modify a rule, because acting on a rule id is exact.

`startInstance`
:   Start a stopped instance. Asynchronous: the response reports the transition, typically `pending`, rather than a running instance.

`stopInstance`
:   Stop a running instance while preserving its EBS volumes. Asynchronous: the response reports `stopping`, not `stopped`. Stopping discards memory contents, so capture volatile evidence first if it matters.

`rebootInstance`
:   Reboot an instance. AWS only queues the request, so a success means "accepted" and the response carries no state transition.

`terminateInstance`
:   Permanently destroy an instance. Irreversible: EBS volumes marked delete-on-termination are destroyed and instance store data is lost. Asynchronous: the response reports `shutting-down`.

`modifyInstanceSecurityGroups`
:   Replace the security groups attached to a running instance, isolating it without stopping it so memory and disk stay intact for investigation. Replace semantics: the ids you pass become the instance's complete group list. The result returns the previous ids so the change can be undone.

`authorizeSecurityGroupIngress`
:   Add inbound rules to a security group. Not idempotent: re-adding an existing rule fails as a duplicate.

`revokeSecurityGroupIngress`
:   Remove inbound rules from a security group to sever attacker access. Reports `changed: false` with the unmatched rules when nothing was actually revoked.

`authorizeSecurityGroupEgress`
:   Add outbound rules to a security group, reversing an egress block.

`revokeSecurityGroupEgress`
:   Remove outbound rules to stop data exfiltration or command-and-control traffic. Use it to strip the allow-all rule a new group starts with.

`modifySecurityGroupRules`
:   Change an existing rule in place, identified by its rule id. Reads the rule back afterwards to confirm the change landed.

`createSecurityGroup`
:   Create a security group, used to stand up an isolation group on demand. A new group has no inbound rules but one allow-all outbound rule, so it is not yet a quarantine.

`deleteSecurityGroup`
:   Delete a security group once an incident is closed. Fails while the group is still attached to any instance or referenced by another group.

`createTags`
:   Add or overwrite tags on instances or other EC2 resources, for example to record `IncidentStatus=quarantined`. Upsert semantics: an existing key is overwritten.

`deleteTags`
:   Remove specific tags from EC2 resources. The tag list is required, because omitting it would delete every user tag on every listed resource.

`createSnapshot`
:   Capture a point-in-time snapshot of an EBS volume, the standard evidence-preservation step before terminating a compromised instance. Asynchronous: poll until it reports `completed`.

`describeSnapshots`
:   List EBS snapshots with their status and progress, used to confirm a forensic snapshot finished. Defaults to snapshots this account owns.

`describeVpcs`
:   List VPCs with their CIDR blocks, tenancy, state, and whether each is the default. Use it to pick the VPC when creating an isolation group.

`describeSubnets`
:   List subnets with their VPC, availability zone, CIDR, available IP count, and whether they auto-assign public IPs.

`describeImages`
:   Look up AMIs by id or filter, returning name, owner, architecture, platform, state, and whether the image is public. Defaults to images this account owns.

## Get API credentials [aws-ec2-api-credentials]

To use the AWS EC2 connector, you need an AWS IAM access key ID and secret access key for a principal allowed to call the EC2 actions you intend to use:

1. In the AWS console, open **IAM > Users** and select or create a user for {{kib}}.
2. Attach a policy granting only the EC2 permissions you need. Read-only triage needs `ec2:DescribeInstances`, `ec2:DescribeSecurityGroups`, `ec2:DescribeSecurityGroupRules`, `ec2:DescribeVpcs`, `ec2:DescribeSubnets`, `ec2:DescribeImages`, `ec2:DescribeSnapshots`, and `ec2:DescribeRegions` for the connector test. Containment and lifecycle actions additionally need permissions such as `ec2:ModifyInstanceAttribute`, `ec2:AuthorizeSecurityGroupIngress`, `ec2:RevokeSecurityGroupIngress`, `ec2:AuthorizeSecurityGroupEgress`, `ec2:RevokeSecurityGroupEgress`, `ec2:ModifySecurityGroupRules`, `ec2:CreateSecurityGroup`, `ec2:DeleteSecurityGroup`, `ec2:CreateTags`, `ec2:DeleteTags`, `ec2:CreateSnapshot`, `ec2:StopInstances`, `ec2:StartInstances`, `ec2:RebootInstances`, and `ec2:TerminateInstances`.
3. Scope the policy with resource ARNs or condition keys such as `ec2:ResourceTag` so the connector cannot act on instances outside its intended blast radius.
4. Open the **Security credentials** tab and create an access key, then supply the access key ID and secret access key when you configure the connector.
