/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Shared enums
// =============================================================================

const ALERT_STATE_VALUES = ['New', 'Acknowledged', 'Closed'] as const;
const MONITOR_CONDITION_VALUES = ['Fired', 'Resolved'] as const;
const SEVERITY_VALUES = ['Sev0', 'Sev1', 'Sev2', 'Sev3', 'Sev4'] as const;
const MONITOR_SERVICE_VALUES = [
  'Application Insights',
  'ActivityLog Administrative',
  'ActivityLog Security',
  'ActivityLog Recommendation',
  'ActivityLog Policy',
  'ActivityLog Autoscale',
  'Log Analytics',
  'Nagios',
  'Platform',
  'SCOM',
  'ServiceHealth',
  'SmartDetector',
  'VM Insights',
  'Zabbix',
  'Resource Health',
] as const;
const TIME_RANGE_VALUES = ['1h', '1d', '7d', '30d'] as const;
const ALERTS_SORT_BY_VALUES = [
  'name',
  'severity',
  'alertState',
  'monitorCondition',
  'targetResource',
  'targetResourceName',
  'targetResourceGroup',
  'targetResourceType',
  'startDateTime',
  'lastModifiedDateTime',
] as const;
const ALERTS_SUMMARY_GROUP_BY_VALUES = [
  'severity',
  'alertState',
  'monitorCondition',
  'monitorService',
  'signalType',
  'alertRule',
] as const;
const ACTIVITY_LOG_SELECT_FIELDS = [
  'authorization',
  'claims',
  'correlationId',
  'description',
  'eventDataId',
  'eventName',
  'eventTimestamp',
  'httpRequest',
  'level',
  'operationId',
  'operationName',
  'properties',
  'resourceGroupName',
  'resourceProviderName',
  'resourceId',
  'status',
  'submissionTimestamp',
  'subStatus',
  'subscriptionId',
] as const;
const ALERT_PROCESSING_RULE_FIELD_VALUES = [
  'Severity',
  'MonitorService',
  'MonitorCondition',
  'SignalType',
  'TargetResourceType',
  'TargetResource',
  'TargetResourceGroup',
  'AlertRuleId',
  'AlertRuleName',
  'Description',
  'AlertContext',
] as const;
const ALERT_PROCESSING_RULE_OPERATOR_VALUES = [
  'Equals',
  'NotEquals',
  'Contains',
  'DoesNotContain',
] as const;
const DAYS_OF_WEEK_VALUES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const ISO_DATETIME_NO_TZ_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;

// =============================================================================
// Alerts (Alerts Management API)
// =============================================================================

export const ListAlertsInputSchema = lazySchema(() =>
  z
    .object({
      targetResource: z
        .string()
        .max(500)
        .optional()
        .describe(
          'Filter by the full ARM resource ID of the target resource, e.g. "/subscriptions/xxx/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1".'
        ),
      targetResourceGroup: z
        .string()
        .max(200)
        .optional()
        .describe('Filter by target resource group name.'),
      targetResourceType: z
        .string()
        .max(200)
        .optional()
        .describe('Filter by target resource type, e.g. "Microsoft.Compute/virtualMachines".'),
      monitorService: z
        .enum(MONITOR_SERVICE_VALUES)
        .optional()
        .describe('Filter by the monitor service that generated the alert.'),
      monitorCondition: z
        .enum(MONITOR_CONDITION_VALUES)
        .optional()
        .describe('Filter by monitor condition: "Fired" (still active) or "Resolved".'),
      severity: z
        .enum(SEVERITY_VALUES)
        .optional()
        .describe('Filter by severity, "Sev0" (highest) to "Sev4" (lowest).'),
      alertState: z
        .enum(ALERT_STATE_VALUES)
        .optional()
        .describe('Filter by alert state: "New", "Acknowledged", or "Closed".'),
      alertRule: z
        .string()
        .max(500)
        .optional()
        .describe('Filter by the name of the alert rule that fired the alert.'),
      smartGroupId: z
        .string()
        .max(200)
        .optional()
        .describe('Filter by the Smart Group ID the alert was grouped into.'),
      timeRange: z
        .enum(TIME_RANGE_VALUES)
        .optional()
        .describe(
          'Filter by a relative time range: "1h", "1d", "7d", or "30d". Defaults to "1d". Cannot be combined with customTimeRange.'
        ),
      customTimeRange: z
        .string()
        .max(100)
        .optional()
        .describe(
          'Filter by a custom time range in the format "<start>/<end>" using ISO-8601 timestamps, e.g. "2024-01-01T00:00:00Z/2024-01-02T00:00:00Z". Limited to within 30 days of the query time. Cannot be combined with timeRange.'
        ),
      includeContext: z
        .boolean()
        .optional()
        .describe(
          'Include monitor-service-specific contextual data for each alert. Defaults to false.'
        ),
      pageCount: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .describe(
          'Number of alerts returned per page (1-250, max 25 when includeContext is true). Defaults to 25.'
        ),
      sortBy: z
        .enum(ALERTS_SORT_BY_VALUES)
        .optional()
        .describe('Field to sort results by. Defaults to "lastModifiedDateTime".'),
      sortOrder: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction. Defaults to descending for time fields, ascending for others.'),
    })
    .refine((v) => !(v.timeRange && v.customTimeRange), {
      message: 'Provide either timeRange or customTimeRange, not both.',
      path: ['customTimeRange'],
    })
    .optional()
);
export type ListAlertsInput = z.infer<typeof ListAlertsInputSchema>;

export const GetAlertInputSchema = lazySchema(() =>
  z.object({
    alertId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The unique alert GUID, e.g. "66114d64-d9d9-478b-95c9-b789d6502100". This is the final path segment of the "id" field returned by listAlerts.'
      ),
  })
);
export type GetAlertInput = z.infer<typeof GetAlertInputSchema>;

export const GetAlertHistoryInputSchema = GetAlertInputSchema;
export type GetAlertHistoryInput = GetAlertInput;

export const ChangeAlertStateInputSchema = lazySchema(() =>
  z.object({
    alertId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The unique alert GUID, e.g. "66114d64-d9d9-478b-95c9-b789d6502100". This is the final path segment of the "id" field returned by listAlerts.'
      ),
    newState: z
      .enum(ALERT_STATE_VALUES)
      .describe('The new state to set: "New", "Acknowledged", or "Closed".'),
    comment: z
      .string()
      .max(2000)
      .optional()
      .describe('Optional free-text reason for the state change, recorded in the alert history.'),
  })
);
export type ChangeAlertStateInput = z.infer<typeof ChangeAlertStateInputSchema>;

export const GetAlertSummaryInputSchema = lazySchema(() =>
  z
    .object({
      groupBy: z
        .array(z.enum(ALERTS_SUMMARY_GROUP_BY_VALUES))
        .min(1)
        .max(2)
        .describe(
          'Fields to group the alert counts by, e.g. ["severity", "alertState"]. Nested grouping is applied in array order. The Azure API rejects more than 2 fields with a 400 error.'
        ),
      targetResource: z
        .string()
        .max(500)
        .optional()
        .describe('Filter by the full ARM resource ID of the target resource.'),
      targetResourceGroup: z
        .string()
        .max(200)
        .optional()
        .describe('Filter by target resource group name.'),
      targetResourceType: z
        .string()
        .max(200)
        .optional()
        .describe('Filter by target resource type, e.g. "Microsoft.Compute/virtualMachines".'),
      monitorService: z
        .enum(MONITOR_SERVICE_VALUES)
        .optional()
        .describe('Filter by the monitor service that generated the alert.'),
      monitorCondition: z
        .enum(MONITOR_CONDITION_VALUES)
        .optional()
        .describe('Filter by monitor condition: "Fired" or "Resolved".'),
      severity: z
        .enum(SEVERITY_VALUES)
        .optional()
        .describe('Filter by severity, "Sev0" (highest) to "Sev4" (lowest).'),
      alertState: z
        .enum(ALERT_STATE_VALUES)
        .optional()
        .describe('Filter by alert state: "New", "Acknowledged", or "Closed".'),
      alertRule: z
        .string()
        .max(500)
        .optional()
        .describe('Filter by the name of the alert rule that fired the alert.'),
      timeRange: z
        .enum(TIME_RANGE_VALUES)
        .optional()
        .describe(
          'Filter by a relative time range: "1h", "1d", "7d", or "30d". Defaults to "1d". Cannot be combined with customTimeRange.'
        ),
      customTimeRange: z
        .string()
        .max(100)
        .optional()
        .describe(
          'Filter by a custom time range in the format "<start>/<end>" using ISO-8601 timestamps. Limited to within 30 days of the query time. Cannot be combined with timeRange.'
        ),
      includeSmartGroupsCount: z
        .boolean()
        .optional()
        .describe('Include the total count of Smart Groups in the summary. Defaults to false.'),
    })
    .refine((v) => !(v.timeRange && v.customTimeRange), {
      message: 'Provide either timeRange or customTimeRange, not both.',
      path: ['customTimeRange'],
    })
);
export type GetAlertSummaryInput = z.infer<typeof GetAlertSummaryInputSchema>;

// =============================================================================
// Metrics
// =============================================================================

export const QueryMetricsInputSchema = lazySchema(() =>
  z.object({
    resourceId: z
      .string()
      .min(1)
      .max(1000)
      .regex(
        /^\/subscriptions\//,
        'Must be a full ARM resource ID starting with "/subscriptions/".'
      )
      .describe(
        'Full ARM resource ID of the resource to query metrics for, e.g. "/subscriptions/xxx/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1".'
      ),
    metricNames: z
      .array(z.string().max(200))
      .min(1)
      .max(20)
      .describe(
        'Names of the metrics to retrieve, e.g. ["Percentage CPU"]. Consult the vendor\'s metric definitions for the resource type to find valid names.'
      ),
    metricNamespace: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Metric namespace to query, e.g. "Microsoft.Compute/virtualMachines". Required for resource types that expose more than one metric namespace (e.g. storage accounts).'
      ),
    aggregation: z
      .array(z.enum(['Average', 'Count', 'Minimum', 'Maximum', 'Total']))
      .max(5)
      .optional()
      .describe("Aggregation types to retrieve. Defaults to the metric's primary aggregation."),
    timespan: z
      .string()
      .max(100)
      .optional()
      .describe(
        'Time range in the format "<start>/<end>" using ISO-8601 timestamps, e.g. "2024-01-01T00:00:00Z/2024-01-01T04:00:00Z". Defaults to the last hour.'
      ),
    interval: z
      .string()
      .max(20)
      .optional()
      .describe(
        'Time grain of the query in ISO-8601 duration format, e.g. "PT1M", "PT1H", "P1D", or "FULL" for a single datapoint spanning the whole timespan. Defaults to "PT1M".'
      ),
    top: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe(
        'Maximum number of time series to return when the metric has dimensions. Only used together with filter.'
      ),
    orderby: z
      .string()
      .max(100)
      .optional()
      .describe(
        'Aggregation and direction to sort returned time series by, e.g. "Average asc". Only used together with filter.'
      ),
    filter: z
      .string()
      .max(1000)
      .optional()
      .describe(
        'OData filter to scope results to specific metric dimension values, e.g. "BlobType eq \'BlockBlob\'".'
      ),
  })
);
export type QueryMetricsInput = z.infer<typeof QueryMetricsInputSchema>;

// =============================================================================
// Log Analytics query
// =============================================================================

export const RunLogQueryInputSchema = lazySchema(() =>
  z.object({
    workspaceId: z
      .string()
      .min(1)
      .max(100)
      .regex(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
        "Must be the Log Analytics workspace GUID (found on the workspace's Overview page in the Azure Portal, not the ARM resource ID)."
      )
      .describe('The Log Analytics workspace GUID to query.'),
    query: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'The KQL (Kusto Query Language) query to run, e.g. "AzureActivity | summarize count() by Category".'
      ),
    timespan: z
      .string()
      .max(100)
      .optional()
      .describe(
        'Time range to scope the query, either an ISO-8601 duration (e.g. "PT12H") or a "<start>/<end>" pair of ISO-8601 timestamps. If the query itself also specifies a time range, the intersection of the two is used.'
      ),
  })
);
export type RunLogQueryInput = z.infer<typeof RunLogQueryInputSchema>;

// =============================================================================
// Activity log
// =============================================================================

export const QueryActivityLogInputSchema = lazySchema(() =>
  z
    .object({
      startTime: z
        .string()
        .max(50)
        .describe(
          'Start of the time range (inclusive), ISO-8601 timestamp, e.g. "2024-01-01T00:00:00Z".'
        ),
      endTime: z
        .string()
        .max(50)
        .describe(
          'End of the time range (inclusive), ISO-8601 timestamp, e.g. "2024-01-02T00:00:00Z".'
        ),
      resourceGroupName: z
        .string()
        .max(200)
        .optional()
        .describe(
          'Scope results to a single resource group by name. Cannot be combined with resourceId.'
        ),
      resourceId: z
        .string()
        .max(1000)
        .optional()
        .describe(
          'Scope results to a single resource by full ARM resource ID. Cannot be combined with resourceGroupName.'
        ),
      select: z
        .array(z.enum(ACTIVITY_LOG_SELECT_FIELDS))
        .max(ACTIVITY_LOG_SELECT_FIELDS.length)
        .optional()
        .describe('Limit the response to only these event fields. Omit to receive all fields.'),
    })
    .refine((v) => !(v.resourceGroupName && v.resourceId), {
      message: 'Provide either resourceGroupName or resourceId, not both.',
      path: ['resourceId'],
    })
);
export type QueryActivityLogInput = z.infer<typeof QueryActivityLogInputSchema>;

export const ListActivityLogAlertsInputSchema = lazySchema(() => z.object({}));
export type ListActivityLogAlertsInput = z.infer<typeof ListActivityLogAlertsInputSchema>;

// =============================================================================
// Metric alert rules
// =============================================================================

export const ListMetricAlertRulesInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Limit results to a single resource group. Omit to list every metric alert rule in the subscription.'
      ),
  })
);
export type ListMetricAlertRulesInput = z.infer<typeof ListMetricAlertRulesInputSchema>;

export const GetMetricAlertRuleInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z
      .string()
      .min(1)
      .max(200)
      .describe('Resource group containing the metric alert rule.'),
    ruleName: z
      .string()
      .min(1)
      .max(260)
      .describe('Name of the metric alert rule. Use listMetricAlertRules to discover rule names.'),
  })
);
export type GetMetricAlertRuleInput = z.infer<typeof GetMetricAlertRuleInputSchema>;

export const SetMetricAlertRuleEnabledInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z
      .string()
      .min(1)
      .max(200)
      .describe('Resource group containing the metric alert rule.'),
    ruleName: z
      .string()
      .min(1)
      .max(260)
      .describe('Name of the metric alert rule. Use listMetricAlertRules to discover rule names.'),
    enabled: z.boolean().describe('true to enable the rule, false to disable it.'),
  })
);
export type SetMetricAlertRuleEnabledInput = z.infer<typeof SetMetricAlertRuleEnabledInputSchema>;

export const GetMetricAlertStatusInputSchema = GetMetricAlertRuleInputSchema;
export type GetMetricAlertStatusInput = GetMetricAlertRuleInput;

// =============================================================================
// Action groups
// =============================================================================

export const ListActionGroupsInputSchema = lazySchema(() => z.object({}));
export type ListActionGroupsInput = z.infer<typeof ListActionGroupsInputSchema>;

// =============================================================================
// Alert processing rules
// =============================================================================

const AlertProcessingRuleConditionSchema = z.object({
  field: z.enum(ALERT_PROCESSING_RULE_FIELD_VALUES).describe('Alert field to filter on.'),
  operator: z.enum(ALERT_PROCESSING_RULE_OPERATOR_VALUES).describe('Comparison operator.'),
  values: z
    .array(z.string().max(500))
    .min(1)
    .max(50)
    .describe(
      'Values to compare the field against. The condition matches if the field matches any of these values.'
    ),
});

const AlertProcessingRuleRecurrenceSchema = z
  .object({
    recurrenceType: z
      .enum(['Daily', 'Weekly', 'Monthly'])
      .describe('How often the recurrence repeats.'),
    startTime: z
      .string()
      .max(20)
      .describe('Start time of day the recurrence applies, format "HH:mm:ss", e.g. "22:00:00".'),
    endTime: z
      .string()
      .max(20)
      .describe('End time of day the recurrence applies, format "HH:mm:ss", e.g. "04:00:00".'),
    daysOfWeek: z
      .array(z.enum(DAYS_OF_WEEK_VALUES))
      .max(7)
      .optional()
      .describe(
        'Days the recurrence applies to. Required, and only used, when recurrenceType is "Weekly".'
      ),
    daysOfMonth: z
      .array(z.number().int().min(1).max(31))
      .max(31)
      .optional()
      .describe(
        'Days of the month the recurrence applies to (1-31). Required, and only used, when recurrenceType is "Monthly".'
      ),
  })
  .refine((v) => v.recurrenceType !== 'Weekly' || (v.daysOfWeek && v.daysOfWeek.length > 0), {
    message: 'daysOfWeek is required and must be non-empty when recurrenceType is "Weekly".',
    path: ['daysOfWeek'],
  })
  .refine((v) => v.recurrenceType !== 'Monthly' || (v.daysOfMonth && v.daysOfMonth.length > 0), {
    message: 'daysOfMonth is required and must be non-empty when recurrenceType is "Monthly".',
    path: ['daysOfMonth'],
  });

const AlertProcessingRuleScheduleSchema = z.object({
  effectiveFrom: z
    .string()
    .max(30)
    .regex(
      ISO_DATETIME_NO_TZ_REGEX,
      'Must be ISO-8601 date-time without a timezone suffix, e.g. "2024-01-15T18:00:00".'
    )
    .optional()
    .describe(
      'Start of a one-off maintenance window (local time in timeZone), ISO-8601 without a timezone suffix.'
    ),
  effectiveUntil: z
    .string()
    .max(30)
    .regex(
      ISO_DATETIME_NO_TZ_REGEX,
      'Must be ISO-8601 date-time without a timezone suffix, e.g. "2024-01-15T22:00:00".'
    )
    .optional()
    .describe(
      'End of a one-off maintenance window (local time in timeZone), ISO-8601 without a timezone suffix.'
    ),
  timeZone: z
    .string()
    .max(100)
    .optional()
    .describe(
      'Windows time zone name the schedule times are interpreted in, e.g. "Pacific Standard Time", "India Standard Time". Defaults to UTC if omitted.'
    ),
  recurrences: z
    .array(AlertProcessingRuleRecurrenceSchema)
    .max(10)
    .optional()
    .describe(
      'Recurring schedule windows (e.g. every weekend, or outside business hours). Combine with effectiveFrom/effectiveUntil to bound how long the recurrence applies.'
    ),
});

export const CreateOrUpdateAlertProcessingRuleInputSchema = lazySchema(() =>
  z
    .object({
      resourceGroupName: z
        .string()
        .min(1)
        .max(200)
        .describe('Resource group to create (or update) the alert processing rule in.'),
      ruleName: z
        .string()
        .min(1)
        .max(260)
        .describe(
          'Name for the alert processing rule. If a rule with this name already exists in the resource group, it is fully replaced.'
        ),
      scopes: z
        .array(z.string().max(500))
        .min(1)
        .max(50)
        .describe(
          'ARM resource IDs the rule applies to (a subscription, resource group, or individual resource). Alerts firing on, or under, any of these scopes are affected.'
        ),
      actionType: z
        .enum(['AddActionGroups', 'RemoveAllActionGroups'])
        .describe(
          'What the rule does to matching alerts: "AddActionGroups" appends the given action groups\' notifications, "RemoveAllActionGroups" suppresses all notifications (e.g. during a maintenance window).'
        ),
      actionGroupIds: z
        .array(z.string().max(500))
        .max(20)
        .optional()
        .describe(
          'ARM resource IDs of the action groups to add. Required when actionType is "AddActionGroups"; ignored otherwise.'
        ),
      enabled: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether the rule is active. Defaults to true.'),
      description: z
        .string()
        .max(500)
        .optional()
        .describe('Human-readable description of what the rule does.'),
      conditions: z
        .array(AlertProcessingRuleConditionSchema)
        .max(10)
        .optional()
        .describe(
          'Optional filters that narrow which alerts within scopes the rule applies to. All conditions must match (AND).'
        ),
      schedule: AlertProcessingRuleScheduleSchema.optional().describe(
        'Optional scheduling to limit when the rule is active (a one-off maintenance window and/or a recurring window). Omit to make the rule always active while enabled.'
      ),
    })
    .refine(
      (v) =>
        v.actionType !== 'AddActionGroups' || (v.actionGroupIds && v.actionGroupIds.length > 0),
      {
        message:
          'actionGroupIds is required and must be non-empty when actionType is "AddActionGroups".',
        path: ['actionGroupIds'],
      }
    )
);
export type CreateOrUpdateAlertProcessingRuleInput = z.infer<
  typeof CreateOrUpdateAlertProcessingRuleInputSchema
>;

export const SetAlertProcessingRuleEnabledInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z
      .string()
      .min(1)
      .max(200)
      .describe('Resource group containing the alert processing rule.'),
    ruleName: z.string().min(1).max(260).describe('Name of the alert processing rule to toggle.'),
    enabled: z.boolean().describe('true to enable the rule, false to disable it.'),
  })
);
export type SetAlertProcessingRuleEnabledInput = z.infer<
  typeof SetAlertProcessingRuleEnabledInputSchema
>;

// =============================================================================
// Scheduled query rules (log search alert rules)
// =============================================================================

export const ListScheduledQueryRulesInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Limit results to a single resource group. Omit to list every scheduled query rule in the subscription.'
      ),
  })
);
export type ListScheduledQueryRulesInput = z.infer<typeof ListScheduledQueryRulesInputSchema>;

export const SetScheduledQueryRuleEnabledInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z
      .string()
      .min(1)
      .max(200)
      .describe('Resource group containing the scheduled query rule.'),
    ruleName: z
      .string()
      .min(1)
      .max(260)
      .describe(
        'Name of the scheduled query rule. Use listScheduledQueryRules to discover rule names.'
      ),
    enabled: z.boolean().describe('true to enable the rule, false to disable it.'),
  })
);
export type SetScheduledQueryRuleEnabledInput = z.infer<
  typeof SetScheduledQueryRuleEnabledInputSchema
>;
