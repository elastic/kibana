---
navigation_title: "AWS Systems Manager"
type: reference
description: "Use the AWS Systems Manager connector to find and inspect the managed nodes registered with AWS Systems Manager."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# AWS Systems Manager connector [aws-ssm-action-type]

The AWS Systems Manager connector connects directly to the [AWS Systems Manager API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/Welcome.html). It lets an agent find the nodes Systems Manager manages, such as EC2 instances and hybrid servers, and check which of them are reachable, without opening the AWS console.

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
:   AWS Access Key ID and Secret Access Key. Both are required for every action. The IAM identity behind them needs read access to Systems Manager — see [Get API credentials](#aws-ssm-api-credentials).

## Available actions [aws-ssm-connector-actions]

| Action | Description |
|--------|-------------|
| `describeInstanceInformation` | List managed nodes with their instance ID, SSM Agent ping status and version, platform, host name, and IP address. Parameters: `instanceIds`, `pingStatus` (`Online`, `ConnectionLost`, `Inactive`), `platformType` (`Windows`, `Linux`, `MacOS`), `tags`, `maxResults` (5-50), `nextToken`. `tags` cannot be combined with the other filters. |

## Connector networking configuration [aws-ssm-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [aws-ssm-api-credentials]

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/) and open **IAM**.
2. Create (or choose) an IAM user or role that will be used only for this connector, then attach a policy granting read access to Systems Manager. The AWS managed policy **AmazonSSMReadOnlyAccess** covers every action this connector exposes. To scope permissions more tightly, grant only `ssm:DescribeInstanceInformation`.
3. Under **Security credentials**, create an **Access key** for that user and copy the **Access Key ID** and **Secret Access Key**. Store the secret access key securely — AWS only shows it once.
4. Note the AWS region where your managed nodes are registered (for example `us-east-1`).
5. When configuring the connector, enter the Access Key ID, Secret Access Key, and Region.
