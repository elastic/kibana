/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// ============================================================================
// Shared building blocks
// ============================================================================

export const MetricDimensionSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(255)
      .describe('Dimension name, e.g. "InstanceId", "FunctionName", "TableName".'),
    value: z.string().min(1).max(1024).describe('Dimension value, e.g. "i-1234567890abcdef0".'),
  })
);
export type MetricDimension = z.infer<typeof MetricDimensionSchema>;

export const MetricStatSchema = lazySchema(() =>
  z.object({
    namespace: z
      .string()
      .min(1)
      .max(255)
      .describe('The metric namespace, e.g. "AWS/EC2", "AWS/Lambda", or a custom namespace.'),
    metricName: z
      .string()
      .min(1)
      .max(255)
      .describe('The metric name, e.g. "CPUUtilization", "Errors", "Duration".'),
    dimensions: z
      .array(MetricDimensionSchema)
      .max(30)
      .optional()
      .describe('Dimensions that identify the specific metric to retrieve (up to 30).'),
    period: z
      .number()
      .int()
      .min(1)
      .describe(
        'Granularity, in seconds, of the returned data points. Must be a multiple of 60 for regular-resolution metrics (e.g. 60, 300, 3600), or 1/5/10/20/30/60/multiple-of-60 for high-resolution metrics.'
      ),
    stat: z
      .string()
      .min(1)
      .max(50)
      .describe(
        'The statistic to return: "SampleCount", "Average", "Sum", "Minimum", "Maximum", or a percentile such as "p99".'
      ),
    unit: z
      .string()
      .max(50)
      .optional()
      .describe(
        'Optional unit filter, e.g. "Seconds", "Bytes", "Percent", "Count". Omit unless you know the exact unit the metric was published with.'
      ),
  })
);
export type MetricStat = z.infer<typeof MetricStatSchema>;

export const MetricDataQuerySchema = lazySchema(() =>
  z
    .object({
      id: z
        .string()
        .min(1)
        .max(255)
        .regex(
          /^[a-z][a-zA-Z0-9_]*$/,
          'Must start with a lowercase letter and contain only letters, numbers, and underscores.'
        )
        .describe(
          'A short name that ties this query to its results, and that can be referenced as a variable from a metric math "expression". Must start with a lowercase letter and contain only letters, numbers, and underscores, e.g. "m1", "error_rate".'
        ),
      metricStat: MetricStatSchema.optional().describe(
        'Retrieves a single metric time series. Provide exactly one of "metricStat" or "expression".'
      ),
      expression: z
        .string()
        .min(1)
        .max(2048)
        .optional()
        .describe(
          'A Metrics Insights query (e.g. \'SELECT AVG(CPUUtilization) FROM SCHEMA("AWS/EC2", InstanceId)\') or a metric math expression referencing other queries\' ids (e.g. "errors / requests * 100"). Provide exactly one of "metricStat" or "expression".'
        ),
      label: z
        .string()
        .max(500)
        .optional()
        .describe('A human-readable label for this metric or expression in the results.'),
      returnData: z
        .boolean()
        .optional()
        .describe(
          "Whether to include this query's timestamps/values in the response. Defaults to true. Set to false for queries used only as inputs to a math expression."
        ),
    })
    .refine((value) => Boolean(value.metricStat) !== Boolean(value.expression), {
      message: 'Specify exactly one of "metricStat" or "expression", not both and not neither.',
    })
);
export type MetricDataQuery = z.infer<typeof MetricDataQuerySchema>;

const AlarmActionArnSchema = z
  .string()
  .min(1)
  .max(1024)
  .describe(
    'An Amazon Resource Name (ARN) to notify or invoke, e.g. an SNS topic ("arn:aws:sns:region:account-id:topic-name") or Lambda function ARN.'
  );

export const MetricDimensionFilterSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(255).describe('Dimension name to filter by.'),
    value: z.string().max(1024).optional().describe('Optional dimension value to filter by.'),
  })
);
export type MetricDimensionFilter = z.infer<typeof MetricDimensionFilterSchema>;

// ============================================================================
// CloudWatch (metrics & alarms) actions
// ============================================================================

export const ListAlarmsInputSchema = lazySchema(() =>
  z.object({
    alarmNamePrefix: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe(
        'Only return alarms whose name starts with this prefix. Cannot be combined with "alarmNames".'
      ),
    alarmNames: z
      .array(z.string().min(1).max(255))
      .max(100)
      .optional()
      .describe(
        'Exact alarm names to retrieve (up to 100). Cannot be combined with "alarmNamePrefix".'
      ),
    stateValue: z
      .enum(['OK', 'ALARM', 'INSUFFICIENT_DATA'])
      .optional()
      .describe('Only return alarms currently in this state.'),
    actionPrefix: z
      .string()
      .min(1)
      .max(1024)
      .optional()
      .describe(
        'Only return alarms that use an action ARN starting with this prefix, e.g. an SNS topic ARN, to find every alarm that notifies that topic.'
      ),
    maxRecords: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of alarms to return in this page (1-100). Defaults to 50.'),
    nextToken: z
      .string()
      .max(4000)
      .optional()
      .describe('Pagination token from a previous listAlarms response, to fetch the next page.'),
  })
);
export type ListAlarmsInput = z.infer<typeof ListAlarmsInputSchema>;

export const AlarmNamesInputSchema = lazySchema(() =>
  z.object({
    alarmNames: z
      .array(z.string().min(1).max(255))
      .min(1)
      .max(100)
      .describe('The names of the alarms to act on (1-100), from a prior listAlarms call.'),
  })
);
export type AlarmNamesInput = z.infer<typeof AlarmNamesInputSchema>;

export const GetMetricDataInputSchema = lazySchema(() =>
  z.object({
    metricDataQueries: z
      .array(MetricDataQuerySchema)
      .min(1)
      .max(100)
      .describe(
        'The metrics and/or metric math expressions to retrieve (up to 100 per call; AWS allows up to 500).'
      ),
    startTime: z
      .string()
      .min(1)
      .max(50)
      .describe(
        'Start of the time range to query, as an ISO 8601 timestamp, e.g. "2024-01-15T00:00:00Z".'
      ),
    endTime: z
      .string()
      .min(1)
      .max(50)
      .describe('End of the time range to query (exclusive), as an ISO 8601 timestamp.'),
    maxDatapoints: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Maximum number of data points to return before paginating. Defaults to 100800.'),
    scanBy: z
      .enum(['TimestampDescending', 'TimestampAscending'])
      .optional()
      .describe('Order of returned data points. Defaults to "TimestampDescending" (newest first).'),
    nextToken: z
      .string()
      .max(4000)
      .optional()
      .describe('Pagination token from a previous getMetricData response.'),
  })
);
export type GetMetricDataInput = z.infer<typeof GetMetricDataInputSchema>;

export const SetAlarmStateInputSchema = lazySchema(() =>
  z.object({
    alarmName: z
      .string()
      .min(1)
      .max(255)
      .describe('The name of the alarm to force into a new state.'),
    stateValue: z
      .enum(['OK', 'ALARM', 'INSUFFICIENT_DATA'])
      .describe('The state to force the alarm into.'),
    stateReason: z
      .string()
      .max(1023)
      .describe(
        'A human-readable reason for this state change, e.g. "Manually cleared during runbook test".'
      ),
    stateReasonData: z
      .record(z.string().max(200), z.unknown())
      .refine((value) => Object.keys(value).length <= 50, {
        message: 'stateReasonData may have at most 50 entries.',
      })
      .optional()
      .describe(
        'Optional machine-readable reason data, sent to CloudWatch as a JSON object. Required for EC2 Auto Scaling / Application Auto Scaling alarm actions to take the correct action; informational only for SNS/EC2 actions.'
      ),
  })
);
export type SetAlarmStateInput = z.infer<typeof SetAlarmStateInputSchema>;

export const GetAlarmHistoryInputSchema = lazySchema(() =>
  z.object({
    alarmName: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe('The alarm to retrieve history for. Omit to retrieve history for all alarms.'),
    historyItemType: z
      .enum([
        'ConfigurationUpdate',
        'StateUpdate',
        'Action',
        'AlarmContributorStateUpdate',
        'AlarmContributorAction',
      ])
      .optional()
      .describe('Only return history entries of this type.'),
    startDate: z
      .string()
      .max(50)
      .optional()
      .describe('Start of the time range, as an ISO 8601 timestamp.'),
    endDate: z
      .string()
      .max(50)
      .optional()
      .describe('End of the time range, as an ISO 8601 timestamp.'),
    maxRecords: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of history records to return (1-100).'),
    scanBy: z
      .enum(['TimestampDescending', 'TimestampAscending'])
      .optional()
      .describe('Order of returned history. Defaults to "TimestampDescending" (newest first).'),
    nextToken: z
      .string()
      .max(4000)
      .optional()
      .describe('Pagination token from a previous getAlarmHistory response.'),
  })
);
export type GetAlarmHistoryInput = z.infer<typeof GetAlarmHistoryInputSchema>;

export const PutMetricAlarmInputSchema = lazySchema(() =>
  z
    .object({
      alarmName: z
        .string()
        .min(1)
        .max(255)
        .describe(
          'Name for the alarm, unique within the region. Creates a new alarm, or overwrites an existing one with this exact name.'
        ),
      alarmDescription: z
        .string()
        .max(1024)
        .optional()
        .describe('Description shown in the console.'),
      comparisonOperator: z
        .enum([
          'GreaterThanOrEqualToThreshold',
          'GreaterThanThreshold',
          'LessThanThreshold',
          'LessThanOrEqualToThreshold',
          'LessThanLowerOrGreaterThanUpperThreshold',
          'LessThanLowerThreshold',
          'GreaterThanUpperThreshold',
        ])
        .describe(
          'How to compare the metric statistic to the threshold. The "LowerThreshold"/"UpperThreshold" values are only for anomaly-detection-based alarms.'
        ),
      evaluationPeriods: z
        .number()
        .int()
        .min(1)
        .describe(
          'Number of periods over which data is compared to the threshold ("N" in an "M out of N" alarm).'
        ),
      datapointsToAlarm: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          'Number of breaching data points required to trigger the alarm ("M" in an "M out of N" alarm). Omit to require all evaluationPeriods to breach.'
        ),
      threshold: z
        .number()
        .optional()
        .describe(
          'The value to compare the statistic against. Required for static-threshold alarms; omit for anomaly-detection alarms.'
        ),
      metricName: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe(
          'The metric to watch. Provide this with "namespace" and "statistic" for a simple alarm, or use "metrics" instead for a math-expression alarm.'
        ),
      namespace: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe('The metric namespace, e.g. "AWS/EC2".'),
      statistic: z
        .enum(['SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum'])
        .optional()
        .describe('The statistic to evaluate against the threshold.'),
      dimensions: z
        .array(MetricDimensionSchema)
        .max(30)
        .optional()
        .describe('Dimensions identifying the specific metric to watch.'),
      period: z
        .number()
        .int()
        .min(10)
        .optional()
        .describe(
          'Evaluation granularity, in seconds. Must be 10, 20, 30, or a multiple of 60. Required for simple (non-expression) alarms.'
        ),
      metrics: z
        .array(MetricDataQuerySchema)
        .max(20)
        .optional()
        .describe(
          'Metric math expression definition for an expression-based alarm. Exactly one entry must have returnData set to true; its result is the value the alarm watches. Use this instead of metricName/namespace/statistic/dimensions/period.'
        ),
      unit: z
        .string()
        .max(50)
        .optional()
        .describe('Unit of measure for the statistic, e.g. "Seconds", "Percent", "Count".'),
      treatMissingData: z
        .enum(['breaching', 'notBreaching', 'ignore', 'missing'])
        .optional()
        .describe('How the alarm should treat missing data points. Defaults to "missing".'),
      actionsEnabled: z
        .boolean()
        .optional()
        .describe('Whether alarm actions execute on state changes. Defaults to true.'),
      alarmActions: z
        .array(AlarmActionArnSchema)
        .max(5)
        .optional()
        .describe(
          'ARNs to notify/invoke when the alarm enters ALARM state, e.g. an SNS topic ARN.'
        ),
      okActions: z
        .array(AlarmActionArnSchema)
        .max(5)
        .optional()
        .describe('ARNs to notify/invoke when the alarm returns to OK state.'),
      insufficientDataActions: z
        .array(AlarmActionArnSchema)
        .max(5)
        .optional()
        .describe('ARNs to notify/invoke when the alarm enters INSUFFICIENT_DATA state.'),
    })
    .refine((value) => Boolean(value.metricName) !== Boolean(value.metrics), {
      message:
        'Specify either "metricName" (with namespace/statistic/period) for a simple alarm, or "metrics" for an expression-based alarm, not both.',
    })
);
export type PutMetricAlarmInput = z.infer<typeof PutMetricAlarmInputSchema>;

export const ListMetricsInputSchema = lazySchema(() =>
  z.object({
    namespace: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe('Only return metrics in this namespace, e.g. "AWS/EC2", "AWS/Lambda".'),
    metricName: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe('Only return metrics with this exact name.'),
    dimensions: z
      .array(MetricDimensionFilterSchema)
      .max(10)
      .optional()
      .describe('Only return metrics that have these dimensions (up to 10).'),
    recentlyActive: z
      .enum(['PT3H'])
      .optional()
      .describe(
        'Set to "PT3H" to only return metrics with data points published in the last 3 hours.'
      ),
    nextToken: z
      .string()
      .max(4000)
      .optional()
      .describe('Pagination token from a previous listMetrics response.'),
  })
);
export type ListMetricsInput = z.infer<typeof ListMetricsInputSchema>;

export const GetMetricWidgetImageInputSchema = lazySchema(() =>
  z.object({
    metricWidget: z
      .string()
      .min(1)
      .max(100000)
      .describe(
        'A JSON string (per AWS\'s "Metric Widget Structure and Syntax") describing the graph, e.g. \'{"metrics":[["AWS/EC2","CPUUtilization","InstanceId","i-1234567890abcdef0"]],"period":300,"start":"-PT3H","end":"PT0H","title":"CPU Utilization"}\'.'
      ),
  })
);
export type GetMetricWidgetImageInput = z.infer<typeof GetMetricWidgetImageInputSchema>;

// ============================================================================
// CloudWatch Logs actions
// ============================================================================

export const ListLogGroupsInputSchema = lazySchema(() =>
  z.object({
    logGroupNamePrefix: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe(
        'Only return log groups whose name starts with this prefix. Mutually exclusive with logGroupNamePattern.'
      ),
    logGroupNamePattern: z
      .string()
      .max(512)
      .optional()
      .describe(
        'Only return log groups whose name contains this case-sensitive substring. Mutually exclusive with logGroupNamePrefix.'
      ),
    logGroupClass: z
      .enum(['STANDARD', 'INFREQUENT_ACCESS', 'DELIVERY'])
      .optional()
      .describe('Only return log groups of this storage class.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of log groups to return (1-50). Defaults to 50.'),
    nextToken: z
      .string()
      .max(4000)
      .optional()
      .describe('Pagination token from a previous listLogGroups response.'),
  })
);
export type ListLogGroupsInput = z.infer<typeof ListLogGroupsInputSchema>;

export const FilterLogEventsInputSchema = lazySchema(() =>
  z
    .object({
      logGroupName: z
        .string()
        .min(1)
        .max(512)
        .optional()
        .describe(
          'The log group to search, by name. Provide exactly one of logGroupName or logGroupIdentifier.'
        ),
      logGroupIdentifier: z
        .string()
        .min(1)
        .max(2048)
        .optional()
        .describe(
          'The log group to search, by name or ARN (required if the log group is in a linked source account). Provide exactly one of logGroupName or logGroupIdentifier.'
        ),
      filterPattern: z
        .string()
        .max(1024)
        .optional()
        .describe(
          'CloudWatch Logs filter pattern, e.g. "ERROR" or "?ERROR ?WARN". Omit to match all events.'
        ),
      startTime: z
        .string()
        .max(50)
        .optional()
        .describe('Only return events at or after this time, as an ISO 8601 timestamp.'),
      endTime: z
        .string()
        .max(50)
        .optional()
        .describe('Only return events before this time, as an ISO 8601 timestamp.'),
      logStreamNamePrefix: z
        .string()
        .min(1)
        .max(512)
        .optional()
        .describe(
          'Only search log streams whose name starts with this prefix. Mutually exclusive with logStreamNames.'
        ),
      logStreamNames: z
        .array(z.string().min(1).max(512))
        .max(100)
        .optional()
        .describe(
          'Only search these specific log streams (up to 100). Mutually exclusive with logStreamNamePrefix.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe('Maximum number of events to return (1-10000). Defaults to 10000.'),
      startFromHead: z
        .boolean()
        .optional()
        .describe(
          'If true (default), returns the oldest matching events first; if false, the newest first.'
        ),
      nextToken: z
        .string()
        .max(4000)
        .optional()
        .describe('Pagination token from a previous filterLogEvents response.'),
    })
    .refine((value) => Boolean(value.logGroupName) !== Boolean(value.logGroupIdentifier), {
      message: 'Specify exactly one of "logGroupName" or "logGroupIdentifier".',
    })
);
export type FilterLogEventsInput = z.infer<typeof FilterLogEventsInputSchema>;

export const StartLogsQueryInputSchema = lazySchema(() =>
  z
    .object({
      logGroupName: z
        .string()
        .min(1)
        .max(512)
        .optional()
        .describe(
          'A single log group to query, by name. Provide exactly one of logGroupName or logGroupNames, unless the queryString itself includes a SOURCE command.'
        ),
      logGroupNames: z
        .array(z.string().min(1).max(512))
        .max(50)
        .optional()
        .describe(
          'Multiple log groups to query (up to 50). Provide exactly one of logGroupName or logGroupNames, unless the queryString itself includes a SOURCE command.'
        ),
      queryString: z
        .string()
        .min(1)
        .max(10000)
        .describe(
          "The CloudWatch Logs Insights query, e.g. 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20'."
        ),
      startTime: z
        .string()
        .min(1)
        .max(50)
        .describe('Start of the time range to query (inclusive), as an ISO 8601 timestamp.'),
      endTime: z
        .string()
        .min(1)
        .max(50)
        .describe('End of the time range to query (inclusive), as an ISO 8601 timestamp.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe(
          'Maximum number of log events the query should return. Keep this modest (e.g. 20-100) to avoid overwhelming results; AWS allows up to 100000.'
        ),
    })
    .describe(
      'Starts an asynchronous Logs Insights query and returns a queryId. Poll getLogsQueryResults with that id until status is not "Running"/"Scheduled".'
    )
);
export type StartLogsQueryInput = z.infer<typeof StartLogsQueryInputSchema>;

export const GetLogsQueryResultsInputSchema = lazySchema(() =>
  z.object({
    queryId: z
      .string()
      .min(1)
      .max(256)
      .describe('The query id returned by a previous startLogsQuery call.'),
  })
);
export type GetLogsQueryResultsInput = z.infer<typeof GetLogsQueryResultsInputSchema>;

export const ListLogAnomaliesInputSchema = lazySchema(() =>
  z.object({
    anomalyDetectorArn: z
      .string()
      .min(1)
      .max(2048)
      .optional()
      .describe(
        'Only return anomalies found by this specific anomaly detector ARN. Omit to return anomalies from all detectors.'
      ),
    suppressionState: z
      .enum(['SUPPRESSED', 'UNSUPPRESSED'])
      .optional()
      .describe('Only return anomalies that are currently suppressed, or currently unsuppressed.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of anomalies to return (1-50). Defaults to 50.'),
    nextToken: z
      .string()
      .max(4000)
      .optional()
      .describe('Pagination token from a previous listLogAnomalies response.'),
  })
);
export type ListLogAnomaliesInput = z.infer<typeof ListLogAnomaliesInputSchema>;
