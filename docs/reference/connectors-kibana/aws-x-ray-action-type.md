---
navigation_title: "AWS X-Ray"
type: reference
description: "Use the AWS X-Ray connector to retrieve insights, service graphs, and trace summaries and details for distributed tracing anomalies."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# AWS X-Ray connector [aws-x-ray-action-type]

The AWS X-Ray connector connects directly to the [AWS X-Ray API](https://docs.aws.amazon.com/xray/latest/api/welcome.html). It lets a workflow or agent react to a distributed-tracing anomaly without opening the X-Ray console: pull an open insight, read what broke, snapshot the service graph, search the traces behind it, and drill into full trace detail.

## Overview

This is a **custom connector** that signs requests to the AWS X-Ray API using AWS Signature Version 4 (SigV4). You configure an AWS Access Key ID, Secret Access Key, and AWS Region when creating the connector; every action runs under that account and region.

## Create connectors in {{kib}} [define-aws-x-ray-ui]

You can create an AWS X-Ray connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [aws-x-ray-connector-configuration]

AWS Region
:   The AWS region that hosts the X-Ray data you want to query, for example `us-east-1` or `eu-west-1`. Requests are sent to `xray.<region>.amazonaws.com`.

Authentication
:   AWS Access Key ID and Secret Access Key. Both are required for every action. The IAM identity behind them needs read access to X-Ray — see [Get API credentials](#aws-x-ray-api-credentials).

## Available actions [aws-x-ray-connector-actions]

| Action | Description |
|--------|-------------|
| `getInsightSummaries` | List open and closed insights for a group in a time range, optionally filtered by state. Parameters: `startTime` (required), `endTime` (required), `groupArn` or `groupName` (one required), `maxResults`, `nextToken`, `states`. |
| `getInsight` | Get the full summary of a single insight: categories, root-cause service, impact statistics, and top anomalous services. Parameters: `insightId` (required). |
| `getServiceGraph` | Get the service map for a time range, with per-node error, fault, and latency statistics. Parameters: `startTime` (required), `endTime` (required), `groupArn`, `groupName`, `nextToken`. |
| `getTraceSummaries` | Search for trace IDs and summaries in a time range using an optional filter expression. Parameters: `startTime` (required), `endTime` (required), `filterExpression`, `nextToken`, `sampling`, `samplingStrategy`, `timeRangeType`. |
| `batchGetTraces` | Retrieve full segment detail for up to 5 trace IDs. Parameters: `traceIds` (required, 1-5 items), `nextToken`. |
| `getInsightImpactGraph` | Get the service graph scoped to a single insight, showing downstream services the anomaly touched. Parameters: `insightId` (required), `startTime` (required), `endTime` (required, must be within 6 hours of `startTime`), `nextToken`. |
| `getInsightEvents` | Get the ordered timeline of states X-Ray recorded while reevaluating an insight. Parameters: `insightId` (required), `maxResults`, `nextToken`. |
| `getTimeSeriesServiceStatistics` | Get error, fault, and response-time statistics as a time series for a service or group. Parameters: `startTime` (required), `endTime` (required), `entitySelectorExpression`, `forecastStatistics`, `groupArn`, `groupName`, `nextToken`, `period`. |
| `getGroups` | List all active X-Ray groups. Parameters: `nextToken`. |
| `getTraceGraph` | Build a service graph for a specific set of trace IDs, for per-request topology. Parameters: `traceIds` (required, 1-5 items), `nextToken`. |
| `startTraceRetrieval` | Start an asynchronous historical trace retrieval job against the Transaction Search log group. Parameters: `startTime` (required), `endTime` (required), `traceIds` (required, up to 100 items; pass an empty array for all traces in range). |
| `getRetrievedTracesGraph` | Get the service graph produced by a completed `startTraceRetrieval` job. Parameters: `retrievalToken` (required), `nextToken`. |
| `getSamplingRules` | List all sampling rules, to audit how much trace data X-Ray is capturing. Parameters: `nextToken`. |

All time parameters (`startTime`, `endTime`) are Unix timestamps in seconds.

## Connector networking configuration [aws-x-ray-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [aws-x-ray-api-credentials]

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/) and open **IAM**.
2. Create (or choose) an IAM user or role that will be used only for this connector, then attach a policy granting read access to X-Ray. The AWS managed policy **AWSXRayReadOnlyAccess** covers every action this connector exposes (`xray:Get*`, `xray:BatchGetTraces`, `xray:StartTraceRetrieval`). To scope permissions more tightly, grant exactly the `xray:Get*`, `xray:BatchGetTraces`, and `xray:StartTraceRetrieval` actions this connector uses instead of the full `xray:*` namespace.
3. Under **Security credentials**, create an **Access key** for that user and copy the **Access Key ID** and **Secret Access Key**. Store the secret access key securely — AWS only shows it once.
4. Note the AWS region where your X-Ray traces and groups live (for example `us-east-1`).
5. When configuring the connector, enter the Access Key ID, Secret Access Key, and Region.
