---
navigation_title: "AWS Systems Manager"
type: reference
description: "Use the AWS Systems Manager connector to find and inspect the managed nodes registered with AWS Systems Manager and their inventory, run commands on them, run Automation runbooks, and read and write Parameter Store values."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# AWS Systems Manager connector [aws-ssm-action-type]

The AWS Systems Manager connector connects directly to the [AWS Systems Manager API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/Welcome.html). It lets an agent find the nodes Systems Manager manages, such as EC2 instances and hybrid servers, check which of them are reachable and what software they run, run commands on them, run Automation runbooks, and read and write Parameter Store values, without opening the AWS console.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.
::::

## Overview

The AWS Systems Manager connector signs requests to the AWS Systems Manager API using AWS Signature Version 4 (SigV4). You configure an AWS Access Key ID, Secret Access Key, and AWS Region when creating the connector. Every action runs under that account and region.

## Create connectors in {{kib}} [define-aws-ssm-ui]

You can create an AWS Systems Manager connector in **{{stack-manage-app}}** → **{{connectors-ui}}**.

### Connector configuration [aws-ssm-connector-configuration]

AWS Region
:   The AWS region whose managed nodes you want to query, for example `us-east-1` or `eu-west-1`. Requests are sent to `ssm.<region>.amazonaws.com`.

Authentication
:   AWS Access Key ID and Secret Access Key. Both are required for every action. The IAM identity behind them needs the Systems Manager permissions of the actions you want to use — see [Get API credentials](#aws-ssm-api-credentials).

## Available actions [aws-ssm-connector-actions]

| Action | Description |
|--------|-------------|
| `describeInstanceInformation` | List managed nodes with their instance ID, SSM Agent ping status and version (and whether it is the latest), association status, resource type, platform, host name, and IP address. Stopped and terminated EC2 instances are not returned. Parameters: `instanceIds`, `pingStatus` (`Online`, `ConnectionLost`, `Inactive`), `platformType` (`Windows`, `Linux`, `MacOS`), `tags`, `maxResults` (5-50), `nextToken`. `tags` cannot be combined with the other filters. |
| `getInventory` | Read the inventory collected from one managed node, such as its installed software, Windows updates, or patch compliance, with the time it was collected. A node has no inventory until Inventory collection is set up for it in Systems Manager. Parameters: `instanceId`, `typeName` (for example `AWS:Application`, `AWS:WindowsUpdate`, `AWS:PatchSummary`), `filters` (up to 5, each with `key`, `values`, and `type`: `Equal`, `NotEqual`, `BeginWith`, `LessThan`, `GreaterThan`), `maxResults` (1-50), `nextToken`. |
| `findNodesByInventory` | Find the managed nodes whose inventory matches filters, for example the nodes with an application installed, with their host name, platform, IP address, and status. Parameters: `filters` (as for `getInventory`, with keys written as `<type>.<attribute>`, for example `AWS:Application.Name`), `maxResults` (1-50), `nextToken`. |
| `listDocuments` | List the Command documents and Automation runbooks the account can run, with their name, display name, type, owner, platforms, default version, and target resource type. Parameters: `documentType` (`Command`, `Automation`), `owner` (`Self`, `Amazon`, `Private`, `Public`, `ThirdParty`), `namePrefix`, `platformType` (`Linux`, `Windows`), `maxResults` (1-50), `nextToken`. |
| `getDocument` | Read a document as YAML, including its description, parameters, and steps. Parameters: `name` (required), `documentVersion`. |
| `sendCommand` | Run an SSM document, such as `AWS-RunShellScript` or `AWS-RunPowerShellScript`, on up to 50 managed nodes. Returns a `commandId` immediately, and the command runs asynchronously. Parameters: `instanceIds` (required, 1-50), `documentName` (required), `parameters` (for example `{ "commands": ["uptime"] }`), `documentVersion`, `comment`, `timeoutSeconds` (30-2592000). |
| `getCommandInvocation` | Get the status, exit code, standard output, and standard error (up to 24,000 characters each) of a command on one node. Parameters: `commandId` (required), `instanceId` (required), `pluginName` (the step to read, for documents with more than one step). |
| `listCommands` | List the commands sent in the last 30 days with their document, parameters (for `AWS-RunShellScript`, the shell commands that ran), comment, target nodes, status, and completion counts. Parameters: `commandId`, `instanceId`, `status`, `documentName`, `invokedAfter`, `invokedBefore` (ISO 8601), `maxResults` (1-50), `nextToken`. |
| `cancelCommand` | Cancel a command, on every node it was sent to or only on some of them. Nodes that already finished keep their result. Parameters: `commandId` (required), `instanceIds` (1-50). |
| `startAutomationExecution` | Start an Automation runbook, such as `AWS-RestartEC2Instance`. Returns an `automationExecutionId` immediately, and the runbook runs asynchronously. Parameters: `documentName` (required), `parameters` (for example `{ "InstanceId": ["i-0123456789abcdef0"] }`), `documentVersion`, `clientToken`. |
| `getAutomationExecution` | Get the status of a runbook execution, the step it is on, its failure message and outputs, and each step with its action, status, failure message and details, and outputs. Parameters: `automationExecutionId` (required). |
| `listAutomationExecutions` | List runbook executions, running and finished, with their runbook, status, who started them, start and end times, current step, and failure message. Parameters: `documentNamePrefix`, `status` (up to 10 statuses), `startTimeAfter`, `startTimeBefore` (ISO 8601), `maxResults` (1-50), `nextToken`. |
| `stopAutomationExecution` | Cancel a runbook execution. Steps that already ran are not undone. Parameters: `automationExecutionId` (required). |
| `getParameter` | Read a Parameter Store parameter: its type, value, version, data type, and last modified date. `SecureString` parameters are never decrypted, so their value is returned as null. Parameters: `name` (required, optionally with `:<version>` or `:<label>`). |
| `putParameter` | Create a `String` or `StringList` Parameter Store parameter, or replace the value of an existing one, and return its new version. `SecureString` parameters cannot be written or overwritten. Values over 4,096 characters (up to 8,192) need the account's default parameter tier set to Advanced or Intelligent-Tiering. Parameters: `name`, `value`, `type` (`String`, `StringList`) (all required), `description`, `overwrite` (required to replace an existing value). |

::::{warning}
`sendCommand` runs commands with the privileges of SSM Agent on the node, usually root or SYSTEM, `startAutomationExecution` runs runbooks that change AWS resources, and `putParameter` can replace parameter values that applications read. An agent this connector is assigned to can call all three without asking for confirmation. Limit what they can run with the IAM policy described in [Get API credentials](#aws-ssm-api-credentials), and assign the connector only to agents that should change your nodes and resources.
::::

## Connector networking configuration [aws-ssm-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [aws-ssm-api-credentials]

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/) and open **IAM**.
2. Create (or choose) an IAM user or role that will be used only for this connector, then attach a policy granting the Systems Manager actions it uses:
   - `ssm:DescribeInstanceInformation`, `ssm:ListDocuments`, `ssm:GetDocument`, `ssm:ListCommands`, `ssm:GetCommandInvocation`, `ssm:GetAutomationExecution`, `ssm:DescribeAutomationExecutions`, `ssm:ListInventoryEntries`, and `ssm:GetInventory` on resource `*`, and `ssm:GetParameter` on the parameters it can read (for example `arn:aws:ssm:<region>:<account-id>:parameter/myapp/*`). The AWS managed policy **AmazonSSMReadOnlyAccess** covers them. The connector never asks for `SecureString` values to be decrypted, so it needs no `kms:Decrypt` permission.
   - `ssm:SendCommand` on both the documents it can run (for example `arn:aws:ssm:<region>::document/AWS-RunShellScript`) and the nodes it can run them on (for example `arn:aws:ec2:<region>:<account-id>:instance/*` for EC2 instances and `arn:aws:ssm:<region>:<account-id>:managed-instance/*` for hybrid nodes, narrowed with a tag condition), and `ssm:CancelCommand` on resource `*`.
   - `ssm:StartAutomationExecution` on both the runbooks it can run (for example `arn:aws:ssm:<region>::document/AWS-RestartEC2Instance` for a runbook owned by AWS, or `arn:aws:ssm:<region>:<account-id>:document/MyRunbook` for one in your account) and `arn:aws:ssm:<region>:<account-id>:automation-execution/*`, and `ssm:StopAutomationExecution` on resource `*`. A runbook runs as the role passed in its `AutomationAssumeRole` parameter, which also needs `iam:PassRole` for that role, or else with these credentials, which then need every permission the runbook uses.
   - `ssm:PutParameter` and `ssm:GetParameter` on the parameters it can write (for example `arn:aws:ssm:<region>:<account-id>:parameter/myapp/flags/*`). Before overwriting a parameter, the connector reads its type to refuse overwriting a `SecureString`.
   - Leave out the permissions of the second, third, and fourth items to keep the connector read-only. Those actions then fail with `AccessDeniedException`.
3. Under **Security credentials**, create an **Access key** for that user and copy the **Access Key ID** and **Secret Access Key**. Store the secret access key securely — AWS only shows it once.
4. Note the AWS region where your managed nodes are registered (for example `us-east-1`).
5. When configuring the connector, enter the Access Key ID, Secret Access Key, and Region.
