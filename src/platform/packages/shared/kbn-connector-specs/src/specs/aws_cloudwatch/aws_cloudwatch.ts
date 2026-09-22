/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import {
  callCloudWatchApi,
  callCloudWatchGetMetricWidgetImage,
  callCloudWatchLogsApi,
  toEpochMillis,
  toEpochSeconds,
} from './aws_cloudwatch_api';
import {
  AlarmNamesInputSchema,
  FilterLogEventsInputSchema,
  GetAlarmHistoryInputSchema,
  GetLogsQueryResultsInputSchema,
  GetMetricDataInputSchema,
  GetMetricWidgetImageInputSchema,
  ListAlarmsInputSchema,
  ListLogAnomaliesInputSchema,
  ListLogGroupsInputSchema,
  ListMetricsInputSchema,
  PutMetricAlarmInputSchema,
  SetAlarmStateInputSchema,
  StartLogsQueryInputSchema,
  type AlarmNamesInput,
  type FilterLogEventsInput,
  type GetAlarmHistoryInput,
  type GetLogsQueryResultsInput,
  type GetMetricDataInput,
  type GetMetricWidgetImageInput,
  type ListAlarmsInput,
  type ListLogAnomaliesInput,
  type ListLogGroupsInput,
  type ListMetricsInput,
  type MetricDataQuery,
  type PutMetricAlarmInput,
  type SetAlarmStateInput,
  type StartLogsQueryInput,
} from './types';

function toAwsMetricDataQuery(query: MetricDataQuery): Record<string, unknown> {
  return {
    Id: query.id,
    ...(query.metricStat && {
      MetricStat: {
        Metric: {
          Namespace: query.metricStat.namespace,
          MetricName: query.metricStat.metricName,
          ...(query.metricStat.dimensions && {
            Dimensions: query.metricStat.dimensions.map((dimension) => ({
              Name: dimension.name,
              Value: dimension.value,
            })),
          }),
        },
        Period: query.metricStat.period,
        Stat: query.metricStat.stat,
        ...(query.metricStat.unit && { Unit: query.metricStat.unit }),
      },
    }),
    ...(query.expression && { Expression: query.expression }),
    ...(query.label && { Label: query.label }),
    ...(query.returnData !== undefined && { ReturnData: query.returnData }),
  };
}

export const AwsCloudwatch: ConnectorSpec = {
  metadata: {
    id: '.aws_cloudwatch',
    displayName: 'AWS CloudWatch',
    description: i18n.translate('core.kibanaConnectorSpecs.awsCloudwatch.metadata.description', {
      defaultMessage:
        'List and suppress alarms, query metrics and Logs Insights, and retrieve log events in AWS CloudWatch',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder'],
  },
  auth: {
    types: ['aws_credentials'],
  },
  schema: lazySchema(() =>
    z.object({
      region: z
        .string()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9-]+$/, 'Must be a valid AWS region name, e.g. "us-east-1".')
        .describe(
          'The AWS Region where your CloudWatch alarms, metrics, and log groups are located.'
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.awsCloudwatch.config.region.label', {
            defaultMessage: 'AWS Region',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.awsCloudwatch.config.region.helpText',
            {
              defaultMessage: 'For example, us-east-1',
            }
          ),
          placeholder: 'us-east-1',
        }),
    })
  ),
  actions: {
    // --- CloudWatch (metrics & alarms) ---

    listAlarms: {
      isTool: true,
      description:
        'List CloudWatch alarms and their current state (ALARM, OK, or INSUFFICIENT_DATA). Filter by name prefix, exact names, or state. Use this to find alarm names before calling enableAlarmActions, disableAlarmActions, setAlarmState, or getAlarmHistory.',
      input: ListAlarmsInputSchema,
      handler: async (ctx, input: ListAlarmsInput) => {
        const body: Record<string, unknown> = {};
        if (input.alarmNamePrefix) body.AlarmNamePrefix = input.alarmNamePrefix;
        if (input.alarmNames) body.AlarmNames = input.alarmNames;
        if (input.stateValue) body.StateValue = input.stateValue;
        if (input.actionPrefix) body.ActionPrefix = input.actionPrefix;
        if (input.maxRecords) body.MaxRecords = input.maxRecords;
        if (input.nextToken) body.NextToken = input.nextToken;

        return callCloudWatchApi(ctx, 'DescribeAlarms', body);
      },
    },

    enableAlarmActions: {
      isTool: true,
      description:
        'Resume (un-suppress) the notification and auto-scaling actions for one or more alarms, restoring them after a maintenance window. Use listAlarms first to find alarm names.',
      input: AlarmNamesInputSchema,
      handler: async (ctx, input: AlarmNamesInput) => {
        await callCloudWatchApi(ctx, 'EnableAlarmActions', { AlarmNames: input.alarmNames });
        return {
          alarmNames: input.alarmNames,
          message: `Enabled actions for ${input.alarmNames.length} alarm(s).`,
        };
      },
    },

    disableAlarmActions: {
      isTool: true,
      description:
        'Suppress the notification and auto-scaling actions for one or more alarms, without deleting the alarm. Use this to silence a known-noisy monitor during a deploy or maintenance window, then call enableAlarmActions to restore it afterward. Use listAlarms first to find alarm names.',
      input: AlarmNamesInputSchema,
      handler: async (ctx, input: AlarmNamesInput) => {
        await callCloudWatchApi(ctx, 'DisableAlarmActions', { AlarmNames: input.alarmNames });
        return {
          alarmNames: input.alarmNames,
          message: `Disabled actions for ${input.alarmNames.length} alarm(s).`,
        };
      },
    },

    setAlarmState: {
      isTool: false,
      description:
        'Force an alarm into a specific state (OK, ALARM, or INSUFFICIENT_DATA) for testing or to manually close a resolved alarm. The alarm typically returns to its real state within seconds once CloudWatch next evaluates it, so use getAlarmHistory to confirm a lasting change. This triggers any actions configured for the target state (e.g. sends an SNS notification) — use with care.',
      input: SetAlarmStateInputSchema,
      handler: async (ctx, input: SetAlarmStateInput) => {
        const body: Record<string, unknown> = {
          AlarmName: input.alarmName,
          StateValue: input.stateValue,
          StateReason: input.stateReason,
        };
        if (input.stateReasonData) {
          body.StateReasonData = JSON.stringify(input.stateReasonData);
        }
        await callCloudWatchApi(ctx, 'SetAlarmState', body);
        return {
          alarmName: input.alarmName,
          stateValue: input.stateValue,
          message: `Set alarm "${input.alarmName}" to state ${input.stateValue}.`,
        };
      },
    },

    getAlarmHistory: {
      isTool: true,
      description:
        'Retrieve the state-transition, configuration, and action history for an alarm (or all alarms). Use this to build an incident timeline or measure how long a monitor has been in ALARM. Timestamps in the response are Unix epoch seconds.',
      input: GetAlarmHistoryInputSchema,
      handler: async (ctx, input: GetAlarmHistoryInput) => {
        const body: Record<string, unknown> = {};
        if (input.alarmName) body.AlarmName = input.alarmName;
        if (input.historyItemType) body.HistoryItemType = input.historyItemType;
        if (input.startDate) body.StartDate = toEpochSeconds(input.startDate);
        if (input.endDate) body.EndDate = toEpochSeconds(input.endDate);
        if (input.maxRecords) body.MaxRecords = input.maxRecords;
        if (input.scanBy) body.ScanBy = input.scanBy;
        if (input.nextToken) body.NextToken = input.nextToken;

        return callCloudWatchApi(ctx, 'DescribeAlarmHistory', body);
      },
    },

    putMetricAlarm: {
      isTool: false,
      description:
        'Create a new metric alarm, or completely overwrite an existing one with this exact name. Use this to automate monitor setup or tune a threshold. This is an admin-style operation with side effects on notification wiring — review the alarm definition carefully, since it replaces the full prior configuration when updating.',
      input: PutMetricAlarmInputSchema,
      handler: async (ctx, input: PutMetricAlarmInput) => {
        const body: Record<string, unknown> = {
          AlarmName: input.alarmName,
          ComparisonOperator: input.comparisonOperator,
          EvaluationPeriods: input.evaluationPeriods,
        };
        if (input.alarmDescription) body.AlarmDescription = input.alarmDescription;
        if (input.datapointsToAlarm) body.DatapointsToAlarm = input.datapointsToAlarm;
        if (input.threshold !== undefined) body.Threshold = input.threshold;
        if (input.metricName) body.MetricName = input.metricName;
        if (input.namespace) body.Namespace = input.namespace;
        if (input.statistic) body.Statistic = input.statistic;
        if (input.dimensions) {
          body.Dimensions = input.dimensions.map((dimension) => ({
            Name: dimension.name,
            Value: dimension.value,
          }));
        }
        if (input.period) body.Period = input.period;
        if (input.metrics) body.Metrics = input.metrics.map(toAwsMetricDataQuery);
        if (input.unit) body.Unit = input.unit;
        if (input.treatMissingData) body.TreatMissingData = input.treatMissingData;
        if (input.actionsEnabled !== undefined) body.ActionsEnabled = input.actionsEnabled;
        if (input.alarmActions) body.AlarmActions = input.alarmActions;
        if (input.okActions) body.OKActions = input.okActions;
        if (input.insufficientDataActions)
          body.InsufficientDataActions = input.insufficientDataActions;

        await callCloudWatchApi(ctx, 'PutMetricAlarm', body);
        return {
          alarmName: input.alarmName,
          message: `Alarm "${input.alarmName}" was created or updated.`,
        };
      },
    },

    listMetrics: {
      isTool: true,
      description:
        'Discover available CloudWatch metrics and their dimensions, optionally filtered by namespace, metric name, or dimensions. Use this to resolve the exact namespace/metricName/dimensions to pass to getMetricData or putMetricAlarm before querying or alarming on a metric.',
      input: ListMetricsInputSchema,
      handler: async (ctx, input: ListMetricsInput) => {
        const body: Record<string, unknown> = {};
        if (input.namespace) body.Namespace = input.namespace;
        if (input.metricName) body.MetricName = input.metricName;
        if (input.dimensions) {
          body.Dimensions = input.dimensions.map((dimension) => ({
            Name: dimension.name,
            ...(dimension.value && { Value: dimension.value }),
          }));
        }
        if (input.recentlyActive) body.RecentlyActive = input.recentlyActive;
        if (input.nextToken) body.NextToken = input.nextToken;

        return callCloudWatchApi(ctx, 'ListMetrics', body);
      },
    },

    getMetricData: {
      isTool: true,
      description:
        'Retrieve metric time-series values (and any metric math expression results) for one or more metrics over a time window. Use listMetrics first if you are not sure of the exact namespace/metricName/dimensions. Use this to attach the metric behind an alert to an incident, or to branch a workflow on a threshold.',
      input: GetMetricDataInputSchema,
      handler: async (ctx, input: GetMetricDataInput) => {
        const body: Record<string, unknown> = {
          MetricDataQueries: input.metricDataQueries.map(toAwsMetricDataQuery),
          StartTime: toEpochSeconds(input.startTime),
          EndTime: toEpochSeconds(input.endTime),
        };
        if (input.maxDatapoints) body.MaxDatapoints = input.maxDatapoints;
        if (input.scanBy) body.ScanBy = input.scanBy;
        if (input.nextToken) body.NextToken = input.nextToken;

        return callCloudWatchApi(ctx, 'GetMetricData', body);
      },
    },

    getMetricWidgetImage: {
      isTool: true,
      description:
        'Render a snapshot graph of one or more CloudWatch metrics as a PNG image, to attach to an incident ticket or chat message. ' +
        'WARNING: the response contains a large base64-encoded image. Only call this when you have a plan to display or forward the image — do not call it just to inspect metric values (use getMetricData for that).',
      input: GetMetricWidgetImageInputSchema,
      handler: async (ctx, input: GetMetricWidgetImageInput) => {
        const imageBuffer = await callCloudWatchGetMetricWidgetImage(ctx, input.metricWidget);
        return {
          contentType: 'image/png',
          encoding: 'base64',
          content: imageBuffer.toString('base64'),
        };
      },
    },

    // --- CloudWatch Logs ---

    listLogGroups: {
      isTool: true,
      description:
        'List CloudWatch Logs log groups, optionally filtered by name prefix or substring. Use this to resolve which log group(s) to pass to filterLogEvents or startLogsQuery.',
      input: ListLogGroupsInputSchema,
      handler: async (ctx, input: ListLogGroupsInput) => {
        const body: Record<string, unknown> = {};
        if (input.logGroupNamePrefix) body.logGroupNamePrefix = input.logGroupNamePrefix;
        if (input.logGroupNamePattern) body.logGroupNamePattern = input.logGroupNamePattern;
        if (input.logGroupClass) body.logGroupClass = input.logGroupClass;
        if (input.limit) body.limit = input.limit;
        if (input.nextToken) body.nextToken = input.nextToken;

        return callCloudWatchLogsApi(ctx, 'DescribeLogGroups', body);
      },
    },

    filterLogEvents: {
      isTool: true,
      description:
        'Search log events in a single log group by filter pattern and/or time range — a fast grep for enrichment without running a full Logs Insights query. For aggregations, joins across log groups, or complex filtering, use startLogsQuery/getLogsQueryResults instead. Use listLogGroups first to find the log group name.',
      input: FilterLogEventsInputSchema,
      handler: async (ctx, input: FilterLogEventsInput) => {
        const body: Record<string, unknown> = {};
        if (input.logGroupName) body.logGroupName = input.logGroupName;
        if (input.logGroupIdentifier) body.logGroupIdentifier = input.logGroupIdentifier;
        if (input.filterPattern) body.filterPattern = input.filterPattern;
        if (input.startTime) body.startTime = toEpochMillis(input.startTime);
        if (input.endTime) body.endTime = toEpochMillis(input.endTime);
        if (input.logStreamNamePrefix) body.logStreamNamePrefix = input.logStreamNamePrefix;
        if (input.logStreamNames) body.logStreamNames = input.logStreamNames;
        if (input.limit) body.limit = input.limit;
        if (input.startFromHead !== undefined) body.startFromHead = input.startFromHead;
        if (input.nextToken) body.nextToken = input.nextToken;

        return callCloudWatchLogsApi(ctx, 'FilterLogEvents', body);
      },
    },

    startLogsQuery: {
      isTool: true,
      description:
        'Start an asynchronous CloudWatch Logs Insights query over one or more log groups and a time range — the core primitive for pulling the logs behind an alert. Returns a queryId; pass it to getLogsQueryResults to poll for results, since queries run asynchronously and are not complete immediately.',
      input: StartLogsQueryInputSchema,
      handler: async (ctx, input: StartLogsQueryInput) => {
        const body: Record<string, unknown> = {
          queryString: input.queryString,
          startTime: toEpochSeconds(input.startTime),
          endTime: toEpochSeconds(input.endTime),
        };
        if (input.logGroupName) body.logGroupName = input.logGroupName;
        if (input.logGroupNames) body.logGroupNames = input.logGroupNames;
        if (input.limit) body.limit = input.limit;

        return callCloudWatchLogsApi(ctx, 'StartQuery', body);
      },
    },

    getLogsQueryResults: {
      isTool: true,
      description:
        'Poll for the results of a Logs Insights query started by startLogsQuery. Check the "status" field: "Running" or "Scheduled" means the query has not finished yet — call this again after a short delay. "Complete" means "results" contains the final rows.',
      input: GetLogsQueryResultsInputSchema,
      handler: async (ctx, input: GetLogsQueryResultsInput) => {
        return callCloudWatchLogsApi(ctx, 'GetQueryResults', { queryId: input.queryId });
      },
    },

    listLogAnomalies: {
      isTool: true,
      description:
        'List anomalies surfaced by CloudWatch Logs anomaly detectors, to feed unexpected log patterns into a triage workflow. Optionally scope to a specific anomaly detector or to only suppressed/unsuppressed anomalies.',
      input: ListLogAnomaliesInputSchema,
      handler: async (ctx, input: ListLogAnomaliesInput) => {
        const body: Record<string, unknown> = {};
        if (input.anomalyDetectorArn) body.anomalyDetectorArn = input.anomalyDetectorArn;
        if (input.suppressionState) body.suppressionState = input.suppressionState;
        if (input.limit) body.limit = input.limit;
        if (input.nextToken) body.nextToken = input.nextToken;

        return callCloudWatchLogsApi(ctx, 'ListAnomalies', body);
      },
    },
  },

  skill: [
    'Alarm workflow: call listAlarms to find alarm names and states, then disableAlarmActions to silence a noisy monitor during a maintenance window, and enableAlarmActions afterward to restore it.',
    'setAlarmState only forces a temporary state for testing — the alarm returns to its real evaluated state within seconds, so it is not a way to permanently silence an alarm (use disableAlarmActions for that).',
    'Metric workflow: use listMetrics to discover the exact namespace/metricName/dimensions for a metric, then getMetricData to pull its time series, or putMetricAlarm to alarm on it.',
    'getMetricData supports metric math: give one MetricDataQuery an "expression" that references the "id" of other queries (e.g. "errors / requests * 100") to compute derived series like error rates.',
    'Log workflow: use listLogGroups to find the log group name, then either filterLogEvents for a quick pattern search, or startLogsQuery + getLogsQueryResults (poll until status is not "Running"/"Scheduled") for CloudWatch Logs Insights queries (aggregations, stats, joins across log groups).',
    'All timestamps you provide as input (startTime, endTime, startDate, endDate) must be ISO 8601 strings, e.g. "2024-01-15T00:00:00Z" — the connector converts them to the epoch seconds/milliseconds each underlying AWS API expects.',
    'getMetricWidgetImage and getAlarmHistory/getMetricData can return large or numerous results; prefer getMetricData or filterLogEvents/startLogsQuery for investigation, and only call getMetricWidgetImage when you specifically need an image to attach somewhere.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.awsCloudwatch.test.description', {
      defaultMessage: 'Verifies the connection by listing CloudWatch metrics',
    }),
    handler: async (ctx) => {
      const response = await callCloudWatchApi(ctx, 'ListMetrics', {});
      const metrics = (response.metrics as unknown[]) || [];
      return {
        message: `Successfully connected to AWS CloudWatch. Found ${metrics.length} metric(s) in this page.`,
      };
    },
  },
};
