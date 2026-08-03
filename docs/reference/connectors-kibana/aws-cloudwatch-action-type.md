---
navigation_title: "AWS CloudWatch"
type: reference
description: "Use the AWS CloudWatch connector to list and suppress alarms, query metrics and Logs Insights, and retrieve log events."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# AWS CloudWatch connector [aws-cloudwatch-action-type]

The AWS CloudWatch connector calls the [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/Welcome.html) and [Amazon CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/Welcome.html) APIs so a workflow or agent can triage alerts: list and suppress noisy alarms, pull the metric data and dashboards behind an alert, and search or query the logs around an incident.

## Create connectors in {{kib}} [define-aws-cloudwatch-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [aws-cloudwatch-connector-configuration]

AWS CloudWatch connectors have the following configuration properties:

AWS Region
:   The AWS Region where your CloudWatch alarms, metrics, and log groups are located, for example `us-east-1`. All actions run against this single region; to work across multiple regions, create one connector per region.

### Authentication [aws-cloudwatch-connector-authentication]

**AWS credentials**

Access Key ID
:   The AWS IAM access key ID used to sign every request with Signature Version 4 (SigV4).

Secret Access Key
:   The AWS IAM secret access key paired with the access key ID above.

## Test connectors [aws-cloudwatch-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test calls the CloudWatch `ListMetrics` API to verify connectivity and that the credentials can authenticate against CloudWatch in the configured region.

## Connector actions [aws-cloudwatch-connector-actions]

The AWS CloudWatch connector has the following actions:

`listAlarms`
:   List alarms and their current state (`ALARM`, `OK`, or `INSUFFICIENT_DATA`). Filter by name prefix, exact names, state, or an action ARN prefix. Use this first to find the alarm names other actions need.

`enableAlarmActions`
:   Resume the notification and auto-scaling actions for one or more alarms (`alarmNames`), restoring them after a maintenance window.

`disableAlarmActions`
:   Suppress the notification and auto-scaling actions for one or more alarms (`alarmNames`) without deleting them — useful for silencing a known-noisy alarm during a deploy.

`setAlarmState`
:   Force an alarm (`alarmName`) into a specific state (`stateValue`, `stateReason`) for testing. The alarm typically returns to its real evaluated state within seconds, so this is not a way to permanently silence an alarm — use `disableAlarmActions` for that.

`getAlarmHistory`
:   Retrieve the state-transition, configuration, and action history for an alarm, or for all alarms if `alarmName` is omitted. Timestamps in the response are Unix epoch seconds.

`putMetricAlarm`
:   Create a new metric alarm, or completely overwrite an existing one with the same `alarmName`. Supports both a simple metric/threshold alarm and a metric-math-expression alarm (`metrics`).

`listMetrics`
:   Discover available metrics and their dimensions, optionally filtered by `namespace`, `metricName`, or `dimensions`. Use this to resolve the exact identifiers `getMetricData` and `putMetricAlarm` need.

`getMetricData`
:   Retrieve time-series values for one or more metrics (`metricDataQueries`) over a time range, including metric math expressions computed across them (for example, an error rate derived from two other metrics).

`getMetricWidgetImage`
:   Render a snapshot graph of one or more metrics as a PNG image (`metricWidget`, a [Metric Widget Structure](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Metric-Widget-Structure.html) JSON string), returned as base64-encoded image content.

`listLogGroups`
:   List CloudWatch Logs log groups, optionally filtered by name prefix or substring. Use this to find the log group name `filterLogEvents` and `startLogsQuery` need.

`filterLogEvents`
:   Search log events in a single log group (`logGroupName` or `logGroupIdentifier`) by filter pattern and/or time range — a fast search for enrichment, without running a full Logs Insights query.

`startLogsQuery`
:   Start an asynchronous [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html) query (`queryString`) over one or more log groups and a time range. Returns a `queryId` to pass to `getLogsQueryResults`.

`getLogsQueryResults`
:   Poll for the results of a query started by `startLogsQuery` (`queryId`). Check the `status` field: `Running`/`Scheduled` means the query has not finished yet.

`listLogAnomalies`
:   List anomalies surfaced by CloudWatch Logs anomaly detectors, optionally scoped to a specific detector ARN or to only suppressed/unsuppressed anomalies.

::::{note}
All timestamp inputs (`startTime`, `endTime`, `startDate`, `endDate`) are ISO 8601 strings, for example `2024-01-15T00:00:00Z`. The connector converts them to the Unix epoch seconds or milliseconds each underlying AWS API expects.
::::

## Get API credentials [aws-cloudwatch-api-credentials]

1. Sign in to the [AWS IAM console](https://console.aws.amazon.com/iam/).
2. Create (or choose) an IAM user or role dedicated to this connector.
3. Attach a policy granting at least the following actions, scoped to the resources you want the connector to manage:
   - `cloudwatch:DescribeAlarms`, `cloudwatch:EnableAlarmActions`, `cloudwatch:DisableAlarmActions`, `cloudwatch:SetAlarmState`, `cloudwatch:DescribeAlarmHistory`, `cloudwatch:PutMetricAlarm`, `cloudwatch:ListMetrics`, `cloudwatch:GetMetricData`, `cloudwatch:GetMetricWidgetImage`
   - `logs:DescribeLogGroups`, `logs:FilterLogEvents`, `logs:StartQuery`, `logs:GetQueryResults`, `logs:ListAnomalies`
4. Create an access key for that user (**Security credentials** > **Access keys** > **Create access key**), or use a role's temporary credentials.
5. Copy the **Access key ID** and **Secret access key**, and enter them along with the AWS Region when configuring the connector in {{kib}}.
