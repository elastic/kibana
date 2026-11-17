---
navigation_title: "AWS Systems Manager"
type: reference
description: "Use the AWS Systems Manager connector to find and inspect the managed nodes registered with AWS Systems Manager."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# AWS Systems Manager connector [aws-ssm-action-type]

The AWS Systems Manager connector connects directly to the [AWS Systems Manager API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/Welcome.html). It lets an agent find the nodes Systems Manager manages, such as EC2 instances and hybrid servers, check which of them are reachable, and run commands on them, without opening the AWS console.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.
::::

## Overview

The AWS Systems Manager connector signs requests to the AWS Systems Manager API using AWS Signature Version 4 (SigV4). You configure an AWS Access Key ID, Secret Access Key, and AWS Region when creating the connector; every action runs under that account and region.

## Create connectors in {{kib}} [define-aws-ssm-ui]

You can create an AWS Systems Manager connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [aws-ssm-connector-configuration]

AWS Region
:   The AWS region whose managed nodes you want to query, for example `us-east-1` or `eu-west-1`. Requests are sent to `ssm.<region>.amazonaws.com`.

Authentication
:   AWS Access Key ID and Secret Access Key. Both are required for every action. The IAM identity behind them needs `ssm:DescribeInstanceInformation`, `ssm:SendCommand`, and `ssm:GetCommandInvocation` — see [Get API credentials](#aws-ssm-api-credentials).

## Available actions [aws-ssm-connector-actions]

| Action | Description |
|--------|-------------|
| `describeInstanceInformation` | List managed nodes with their instance ID, SSM Agent ping status and version (and whether it is the latest), association status, resource type, platform, host name, and IP address. Stopped and terminated EC2 instances are not returned. Parameters: `instanceIds`, `pingStatus` (`Online`, `ConnectionLost`, `Inactive`), `platformType` (`Windows`, `Linux`, `MacOS`), `tags`, `maxResults` (5-50), `nextToken`. `tags` cannot be combined with the other filters. |
| `sendCommand` | Run an SSM document, such as `AWS-RunShellScript` or `AWS-RunPowerShellScript`, on up to 50 managed nodes. Returns a `commandId` immediately; the command runs asynchronously. Parameters: `instanceIds` (required, 1-50), `documentName` (required), `parameters` (for example `{ "commands": ["uptime"] }`), `documentVersion`, `comment`, `timeoutSeconds` (30-2592000). |
| `getCommandInvocation` | Get the status, exit code, standard output (up to 24,000 characters), and standard error (up to 8,000 characters) of a command on one node. Parameters: `commandId` (required), `instanceId` (required). |

::::{warning}
`sendCommand` runs commands with the privileges of SSM Agent on the node, usually root or SYSTEM, and an agent this connector is assigned to can call it without asking for confirmation. Limit what it can run with the IAM policy described in [Get API credentials](#aws-ssm-api-credentials), and assign the connector only to agents that should run commands on your nodes.
::::

## Connector networking configuration [aws-ssm-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [aws-ssm-api-credentials]

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/) and open **IAM**.
2. Create (or choose) an IAM user or role that will be used only for this connector, then attach a policy granting the Systems Manager actions it uses:
   - `ssm:DescribeInstanceInformation` and `ssm:GetCommandInvocation` on resource `*`. The AWS managed policy **AmazonSSMReadOnlyAccess** covers both.
   - `ssm:SendCommand` on both the documents it may run (for example `arn:aws:ssm:<region>::document/AWS-RunShellScript`) and the nodes it may run them on (for example `arn:aws:ec2:<region>:<account-id>:instance/*`, narrowed with a tag condition). Leave it out to keep the connector read-only; `sendCommand` then fails with `AccessDeniedException`.
3. Under **Security credentials**, create an **Access key** for that user and copy the **Access Key ID** and **Secret Access Key**. Store the secret access key securely — AWS only shows it once.
4. Note the AWS region where your managed nodes are registered (for example `us-east-1`).
5. When configuring the connector, enter the Access Key ID, Secret Access Key, and Region.
