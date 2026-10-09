/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Azure Monitor Connector
 *
 * Gives workflow authors alert read, alert-state write, metric and log query,
 * and alert-rule control actions over the Azure Resource Manager (ARM) and
 * Log Analytics REST APIs.
 *
 * Authentication is OAuth 2.0 Client Credentials (a service principal/app
 * registration). The token minted at connector-configuration time is scoped
 * to `https://management.azure.com/.default` and used for every ARM-backed
 * action via `ctx.client`. The Log Analytics query API requires a token
 * scoped to a *different* audience (`https://api.loganalytics.io/.default`),
 * so `runLogQuery` mints its own token from the same credentials via
 * `getLogAnalyticsAccessToken` (see `azure_ad_token.ts`) and overrides the
 * Authorization header for that one request.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { getLogAnalyticsAccessToken } from './azure_ad_token';
import {
  ListAlertsInputSchema,
  GetAlertInputSchema,
  GetAlertHistoryInputSchema,
  ChangeAlertStateInputSchema,
  GetAlertSummaryInputSchema,
  QueryMetricsInputSchema,
  RunLogQueryInputSchema,
  QueryActivityLogInputSchema,
  ListActivityLogAlertsInputSchema,
  ListMetricAlertRulesInputSchema,
  GetMetricAlertRuleInputSchema,
  SetMetricAlertRuleEnabledInputSchema,
  GetMetricAlertStatusInputSchema,
  ListActionGroupsInputSchema,
  CreateOrUpdateAlertProcessingRuleInputSchema,
  SetAlertProcessingRuleEnabledInputSchema,
  ListScheduledQueryRulesInputSchema,
  SetScheduledQueryRuleEnabledInputSchema,
} from './types';
import type {
  ListAlertsInput,
  GetAlertInput,
  GetAlertHistoryInput,
  ChangeAlertStateInput,
  GetAlertSummaryInput,
  QueryMetricsInput,
  RunLogQueryInput,
  QueryActivityLogInput,
  ListMetricAlertRulesInput,
  GetMetricAlertRuleInput,
  SetMetricAlertRuleEnabledInput,
  GetMetricAlertStatusInput,
  CreateOrUpdateAlertProcessingRuleInput,
  SetAlertProcessingRuleEnabledInput,
  ListScheduledQueryRulesInput,
  SetScheduledQueryRuleEnabledInput,
} from './types';

const ARM_BASE = 'https://management.azure.com';
const LOG_ANALYTICS_QUERY_BASE = 'https://api.loganalytics.azure.com/v1';

const ALERTS_API_VERSION = '2019-03-01';
const METRICS_API_VERSION = '2023-10-01';
const ACTIVITY_LOG_API_VERSION = '2015-04-01';
const ACTIVITY_LOG_ALERTS_API_VERSION = '2020-10-01';
const METRIC_ALERTS_API_VERSION = '2024-03-01-preview';
const ACTION_GROUPS_API_VERSION = '2021-09-01';
const ALERT_PROCESSING_RULES_API_VERSION = '2021-08-08';
const SCHEDULED_QUERY_RULES_API_VERSION = '2021-08-01';

function getSubscriptionId(ctx: ActionContext): string {
  const subscriptionId = ctx.config?.subscriptionId as string | undefined;
  if (!subscriptionId) {
    throw new Error(
      'Azure Monitor connector is missing the required subscriptionId configuration field.'
    );
  }
  return subscriptionId;
}

/**
 * Alerts Management operations (get/change-state/history/summary) accept the
 * subscription itself as the `scope` path segment, regardless of which
 * resource the underlying alert actually fired on — Azure resolves the
 * alert by ID within that scope. This lets every alert action take a plain
 * `alertId` GUID (as returned by listAlerts) without the caller having to
 * reconstruct the full per-resource ARM scope.
 */
function getSubscriptionScope(ctx: ActionContext): string {
  return `/subscriptions/${getSubscriptionId(ctx)}`;
}

function extractAzureErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      status?: number;
      statusText?: string;
      data?: { error?: { code?: string; message?: string } };
    };
    message?: string;
  };

  const azureError = err.response?.data?.error;
  if (azureError) {
    return `Azure API error [${azureError.code}]: ${azureError.message}`;
  }

  const rawBody =
    typeof err.response?.data === 'string'
      ? err.response.data
      : err.response?.data
      ? JSON.stringify(err.response.data)
      : '';
  const detail = rawBody ? ` — ${rawBody}` : '';

  if (err.response?.status === 401) {
    return `Authentication failed (401)${detail}`;
  } else if (err.response?.status === 403) {
    return `Access denied (403)${detail}`;
  }
  return `Azure API request failed: ${err.response?.statusText || err.message}${detail}`;
}

function throwAzureError(error: unknown): never {
  throw new Error(extractAzureErrorMessage(error));
}

export const AzureMonitor: ConnectorSpec = {
  metadata: {
    id: '.azure_monitor',
    displayName: 'Azure Monitor',
    description: i18n.translate('core.kibanaConnectorSpecs.azureMonitor.metadata.description', {
      defaultMessage:
        'List and triage Azure Monitor alerts, query metrics and logs, and control alert rules',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        isRecommended: true,
        defaults: {
          scope: 'https://management.azure.com/.default',
        },
        overrides: {
          meta: {
            scope: { hidden: true },
            tokenUrl: {
              label: i18n.translate('core.kibanaConnectorSpecs.azureMonitor.auth.tokenUrl.label', {
                defaultMessage: 'Token URL',
              }),
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.azureMonitor.auth.tokenUrl.helpText',
                {
                  defaultMessage:
                    "Replace '{tenantId}' with your Azure AD tenant ID. The app registration (service principal) must have the Monitoring Contributor role on the subscription (Monitoring Reader is enough for read-only actions), and the Log Analytics Reader role on any Log Analytics workspace queried with runLogQuery.",
                  values: { tenantId: '{tenant-id}' },
                }
              ),
            },
            clientId: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.azureMonitor.auth.clientId.helpText',
                {
                  defaultMessage: 'The Application (client) ID of the Azure AD app registration.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      subscriptionId: z
        .string()
        .min(1)
        .max(100)
        .regex(
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
          'Must be a valid Azure subscription ID (GUID).'
        )
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.azureMonitor.config.subscriptionId', {
            defaultMessage: 'Azure subscription ID',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate(
            'core.kibanaConnectorSpecs.azureMonitor.config.subscriptionId.label',
            {
              defaultMessage: 'Subscription ID',
            }
          ),
          placeholder: '00000000-0000-0000-0000-000000000000',
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.azureMonitor.config.subscriptionId.helpText',
            {
              defaultMessage:
                'The Azure subscription that every action in this connector operates against.',
            }
          ),
        }),
    })
  ),

  actions: {
    // https://learn.microsoft.com/en-us/rest/api/alerts-management/alerts/alerts/get-all
    listAlerts: {
      isTool: true,
      description:
        'List fired (or resolved) Azure Monitor alerts in the subscription, optionally filtered by time range, severity, monitor condition, state, or target resource. This is the primary triage entry point — call it first to discover alert IDs, then use getAlert/getAlertHistory/changeAlertState with the "id" field\'s final path segment (a GUID).',
      input: ListAlertsInputSchema,
      handler: async (ctx, input: ListAlertsInput) => {
        try {
          const response = await ctx.client.get(
            `${ARM_BASE}${getSubscriptionScope(ctx)}/providers/Microsoft.AlertsManagement/alerts`,
            {
              params: {
                'api-version': ALERTS_API_VERSION,
                ...(input?.targetResource && { targetResource: input.targetResource }),
                ...(input?.targetResourceGroup && {
                  targetResourceGroup: input.targetResourceGroup,
                }),
                ...(input?.targetResourceType && { targetResourceType: input.targetResourceType }),
                ...(input?.monitorService && { monitorService: input.monitorService }),
                ...(input?.monitorCondition && { monitorCondition: input.monitorCondition }),
                ...(input?.severity && { severity: input.severity }),
                ...(input?.alertState && { alertState: input.alertState }),
                ...(input?.alertRule && { alertRule: input.alertRule }),
                ...(input?.smartGroupId && { smartGroupId: input.smartGroupId }),
                ...(input?.timeRange && { timeRange: input.timeRange }),
                ...(input?.customTimeRange && { customTimeRange: input.customTimeRange }),
                ...(input?.includeContext !== undefined && {
                  includeContext: input.includeContext,
                }),
                ...(input?.pageCount !== undefined && { pageCount: input.pageCount }),
                ...(input?.sortBy && { sortBy: input.sortBy }),
                ...(input?.sortOrder && { sortOrder: input.sortOrder }),
              },
            }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/alerts-management/alerts/alerts/get-by-id
    getAlert: {
      isTool: true,
      description:
        'Get the full essentials (severity, state, monitor condition, target resource, alert rule) of a single Azure Monitor alert by its GUID. Use the alertId from listAlerts.',
      input: GetAlertInputSchema,
      handler: async (ctx, input: GetAlertInput) => {
        try {
          const response = await ctx.client.get(
            `${ARM_BASE}${getSubscriptionScope(
              ctx
            )}/providers/Microsoft.AlertsManagement/alerts/${encodeURIComponent(input.alertId)}`,
            { params: { 'api-version': ALERTS_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/alerts-management/alerts/alerts/get-history
    getAlertHistory: {
      isTool: true,
      description:
        'Get the change history of a single Azure Monitor alert: monitor condition flips (Fired/Resolved), alert state changes (New/Acknowledged/Closed), and applied alert processing rules. Use the alertId from listAlerts. Useful for audit trails and understanding what already happened to an alert.',
      input: GetAlertHistoryInputSchema,
      handler: async (ctx, input: GetAlertHistoryInput) => {
        try {
          const response = await ctx.client.get(
            `${ARM_BASE}${getSubscriptionScope(
              ctx
            )}/providers/Microsoft.AlertsManagement/alerts/${encodeURIComponent(
              input.alertId
            )}/history`,
            { params: { 'api-version': ALERTS_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/alerts-management/alerts/alerts/change-state
    changeAlertState: {
      isTool: true,
      description:
        'Change the state of an Azure Monitor alert to "New", "Acknowledged", or "Closed". This is the core incident-lifecycle write action — use it once a workflow has gathered enough context (via getAlert/queryMetrics/runLogQuery) to own triage of the alert.',
      input: ChangeAlertStateInputSchema,
      handler: async (ctx, input: ChangeAlertStateInput) => {
        try {
          const response = await ctx.client.post(
            `${ARM_BASE}${getSubscriptionScope(
              ctx
            )}/providers/Microsoft.AlertsManagement/alerts/${encodeURIComponent(
              input.alertId
            )}/changestate`,
            { comments: input.comment ?? '' },
            {
              params: {
                'api-version': ALERTS_API_VERSION,
                newState: input.newState,
              },
            }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/alerts-management/alerts/alerts/get-summary
    getAlertSummary: {
      isTool: true,
      description:
        'Get a summarized count of Azure Monitor alerts grouped by severity, alert state, monitor condition, monitor service, signal type, or alert rule (e.g. how many alerts are Sev0 vs Sev1). Use this to feed dashboards or threshold gates rather than listing and counting every alert individually. At most 2 groupBy fields may be supplied — the Azure API rejects more with a 400 error.',
      input: GetAlertSummaryInputSchema,
      handler: async (ctx, input: GetAlertSummaryInput) => {
        try {
          const response = await ctx.client.get(
            `${ARM_BASE}${getSubscriptionScope(
              ctx
            )}/providers/Microsoft.AlertsManagement/alertsSummary`,
            {
              params: {
                'api-version': ALERTS_API_VERSION,
                groupby: input.groupBy.join(','),
                ...(input.targetResource && { targetResource: input.targetResource }),
                ...(input.targetResourceGroup && {
                  targetResourceGroup: input.targetResourceGroup,
                }),
                ...(input.targetResourceType && { targetResourceType: input.targetResourceType }),
                ...(input.monitorService && { monitorService: input.monitorService }),
                ...(input.monitorCondition && { monitorCondition: input.monitorCondition }),
                ...(input.severity && { severity: input.severity }),
                ...(input.alertState && { alertState: input.alertState }),
                ...(input.alertRule && { alertRule: input.alertRule }),
                ...(input.timeRange && { timeRange: input.timeRange }),
                ...(input.customTimeRange && { customTimeRange: input.customTimeRange }),
                ...(input.includeSmartGroupsCount !== undefined && {
                  includeSmartGroupsCount: input.includeSmartGroupsCount,
                }),
              },
            }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/monitor/metrics/list
    queryMetrics: {
      isTool: true,
      description:
        'Query time-series metric values (e.g. CPU percentage, request count) for an Azure resource. Use this to pull the numbers that drove an alert, after identifying the target resource via getAlert. Returns one time series per metric/dimension combination.',
      input: QueryMetricsInputSchema,
      handler: async (ctx, input: QueryMetricsInput) => {
        try {
          const response = await ctx.client.get(
            `${ARM_BASE}${input.resourceId}/providers/Microsoft.Insights/metrics`,
            {
              params: {
                'api-version': METRICS_API_VERSION,
                metricnames: input.metricNames.join(','),
                ...(input.metricNamespace && { metricnamespace: input.metricNamespace }),
                ...(input.aggregation && { aggregation: input.aggregation.join(',') }),
                ...(input.timespan && { timespan: input.timespan }),
                ...(input.interval && { interval: input.interval }),
                ...(input.top !== undefined && { top: input.top }),
                ...(input.orderby && { orderby: input.orderby }),
                ...(input.filter && { $filter: input.filter }),
              },
            }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/azure/azure-monitor/logs/api/request-format
    runLogQuery: {
      isTool: true,
      description:
        "Run a KQL (Kusto Query Language) query against a Log Analytics workspace. Use this to enrich or investigate an alert (e.g. correlate with raw log events) from inside a workflow. Requires the connector's service principal to have the Log Analytics Reader role on the target workspace — this action mints a separate, workspace-scoped access token rather than reusing the connector's main ARM token.",
      input: RunLogQueryInputSchema,
      handler: async (ctx, input: RunLogQueryInput) => {
        try {
          const token = await getLogAnalyticsAccessToken(ctx);
          const response = await ctx.client.post(
            `${LOG_ANALYTICS_QUERY_BASE}/workspaces/${encodeURIComponent(input.workspaceId)}/query`,
            {
              query: input.query,
              ...(input.timespan && { timespan: input.timespan }),
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/monitor/activity-logs/list
    queryActivityLog: {
      isTool: true,
      description:
        'Query the Azure Monitor Activity Log (control-plane events: resource writes, role assignments, service health) within a time range, optionally scoped to a resource group or a single resource. Use this to correlate a configuration change with an alert.',
      input: QueryActivityLogInputSchema,
      handler: async (ctx, input: QueryActivityLogInput) => {
        try {
          // Agent-supplied values are interpolated into single-quoted OData
          // literals; OData escapes an embedded quote by doubling it
          // (' -> ''), so this prevents a value from breaking out of its
          // literal and injecting extra filter clauses.
          const escapeOData = (value: string) => value.replace(/'/g, "''");
          const filterParts = [
            `eventTimestamp ge '${escapeOData(input.startTime)}'`,
            `eventTimestamp le '${escapeOData(input.endTime)}'`,
          ];
          if (input.resourceGroupName) {
            filterParts.push(`resourceGroupName eq '${escapeOData(input.resourceGroupName)}'`);
          } else if (input.resourceId) {
            filterParts.push(`resourceUri eq '${escapeOData(input.resourceId)}'`);
          }

          const response = await ctx.client.get(
            `${ARM_BASE}/subscriptions/${getSubscriptionId(
              ctx
            )}/providers/Microsoft.Insights/eventtypes/management/values`,
            {
              params: {
                'api-version': ACTIVITY_LOG_API_VERSION,
                $filter: filterParts.join(' and '),
                ...(input.select && { $select: input.select.join(',') }),
              },
            }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/monitor/activity-log-alerts/list-by-subscription-id
    listActivityLogAlerts: {
      isTool: true,
      description:
        'List Activity Log Alert rules (rules that fire on control-plane events, e.g. "a VM was deleted") in the subscription, along with their enabled state, conditions, and action groups. Use this for review or reporting on which activity-log-based alerting is configured.',
      input: ListActivityLogAlertsInputSchema,
      handler: async (ctx) => {
        try {
          const response = await ctx.client.get(
            `${ARM_BASE}/subscriptions/${getSubscriptionId(
              ctx
            )}/providers/Microsoft.Insights/activityLogAlerts`,
            { params: { 'api-version': ACTIVITY_LOG_ALERTS_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/monitor/metric-alerts/list-by-subscription
    // https://learn.microsoft.com/en-us/rest/api/monitor/metric-alerts/list-by-resource-group
    listMetricAlertRules: {
      isTool: true,
      description:
        'List metric alert rule definitions in the subscription (or a single resource group). Use this to discover rule names before calling getMetricAlertRule or setMetricAlertRuleEnabled — the "read, then quiet" loop for silencing a noisy rule during maintenance.',
      input: ListMetricAlertRulesInputSchema,
      handler: async (ctx, input: ListMetricAlertRulesInput) => {
        try {
          const scope = input.resourceGroupName
            ? `/subscriptions/${getSubscriptionId(ctx)}/resourceGroups/${encodeURIComponent(
                input.resourceGroupName
              )}`
            : `/subscriptions/${getSubscriptionId(ctx)}`;
          const response = await ctx.client.get(
            `${ARM_BASE}${scope}/providers/Microsoft.Insights/metricAlerts`,
            { params: { 'api-version': METRIC_ALERTS_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/monitor/metric-alerts/get
    getMetricAlertRule: {
      isTool: true,
      description:
        'Get the full definition (criteria, scopes, severity, action groups) of a single metric alert rule by name. Use listMetricAlertRules first to discover rule names. Call this before reporting on, or reasoning about, a specific rule.',
      input: GetMetricAlertRuleInputSchema,
      handler: async (ctx, input: GetMetricAlertRuleInput) => {
        try {
          const response = await ctx.client.get(
            `${ARM_BASE}/subscriptions/${getSubscriptionId(
              ctx
            )}/resourceGroups/${encodeURIComponent(
              input.resourceGroupName
            )}/providers/Microsoft.Insights/metricAlerts/${encodeURIComponent(input.ruleName)}`,
            { params: { 'api-version': METRIC_ALERTS_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/monitor/metric-alerts/update
    setMetricAlertRuleEnabled: {
      isTool: true,
      description:
        'Enable or disable a metric alert rule without deleting or otherwise modifying it. Use this to silence a noisy rule during a maintenance window, then re-enable it afterward. Use listMetricAlertRules to discover rule names.',
      input: SetMetricAlertRuleEnabledInputSchema,
      handler: async (ctx, input: SetMetricAlertRuleEnabledInput) => {
        try {
          const response = await ctx.client.patch(
            `${ARM_BASE}/subscriptions/${getSubscriptionId(
              ctx
            )}/resourceGroups/${encodeURIComponent(
              input.resourceGroupName
            )}/providers/Microsoft.Insights/metricAlerts/${encodeURIComponent(input.ruleName)}`,
            { properties: { enabled: input.enabled } },
            { params: { 'api-version': METRIC_ALERTS_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/monitor/metric-alerts-status/list
    getMetricAlertStatus: {
      isTool: true,
      description:
        'Get the current fired/resolved status of a metric alert rule, with a per-dimension breakdown (e.g. per target resource). Use listMetricAlertRules first to discover rule names. Use this for a quick health/status check without listing every fired alert.',
      input: GetMetricAlertStatusInputSchema,
      handler: async (ctx, input: GetMetricAlertStatusInput) => {
        try {
          const response = await ctx.client.get(
            `${ARM_BASE}/subscriptions/${getSubscriptionId(
              ctx
            )}/resourceGroups/${encodeURIComponent(
              input.resourceGroupName
            )}/providers/Microsoft.Insights/metricAlerts/${encodeURIComponent(
              input.ruleName
            )}/status`,
            { params: { 'api-version': METRIC_ALERTS_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/monitor/action-groups/list-by-subscription-id
    listActionGroups: {
      isTool: true,
      description:
        'List all action groups (email/SMS/webhook/Automation/Function notification targets) in the subscription. Use this to report on who or what gets notified when an alert fires, or to find an action group ID for createOrUpdateAlertProcessingRule.',
      input: ListActionGroupsInputSchema,
      handler: async (ctx) => {
        try {
          const response = await ctx.client.get(
            `${ARM_BASE}/subscriptions/${getSubscriptionId(
              ctx
            )}/providers/Microsoft.Insights/actionGroups`,
            { params: { 'api-version': ACTION_GROUPS_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/alerts-management/processing-rules/alert-processing-rules/create-or-update
    createOrUpdateAlertProcessingRule: {
      isTool: true,
      description:
        'Create or fully replace an alert processing rule that adds action groups to, or suppresses all notifications for, alerts matching a scope and optional conditions — the mechanism that mutes or reroutes Azure Monitor alert notifications. Optionally scheduled to a one-off or recurring maintenance window. If a rule with the given name already exists in the resource group, it is completely replaced (not merged) — supply every field you want to keep.',
      input: CreateOrUpdateAlertProcessingRuleInputSchema,
      handler: async (ctx, input: CreateOrUpdateAlertProcessingRuleInput) => {
        try {
          const response = await ctx.client.put(
            `${ARM_BASE}/subscriptions/${getSubscriptionId(
              ctx
            )}/resourceGroups/${encodeURIComponent(
              input.resourceGroupName
            )}/providers/Microsoft.AlertsManagement/actionRules/${encodeURIComponent(
              input.ruleName
            )}`,
            {
              location: 'Global',
              properties: {
                ...(input.description && { description: input.description }),
                scopes: input.scopes,
                enabled: input.enabled,
                actions: [
                  {
                    actionType: input.actionType,
                    ...(input.actionType === 'AddActionGroups' && {
                      actionGroupIds: input.actionGroupIds,
                    }),
                  },
                ],
                ...(input.conditions && { conditions: input.conditions }),
                ...(input.schedule && { schedule: input.schedule }),
              },
            },
            { params: { 'api-version': ALERT_PROCESSING_RULES_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/alerts-management/processing-rules/alert-processing-rules/update
    setAlertProcessingRuleEnabled: {
      isTool: true,
      description:
        'Enable or disable an existing alert processing rule (e.g. turn suppression on for a maintenance window, then off afterward) without recreating it. Use createOrUpdateAlertProcessingRule to discover or set up rule names.',
      input: SetAlertProcessingRuleEnabledInputSchema,
      handler: async (ctx, input: SetAlertProcessingRuleEnabledInput) => {
        try {
          const response = await ctx.client.patch(
            `${ARM_BASE}/subscriptions/${getSubscriptionId(
              ctx
            )}/resourceGroups/${encodeURIComponent(
              input.resourceGroupName
            )}/providers/Microsoft.AlertsManagement/actionRules/${encodeURIComponent(
              input.ruleName
            )}`,
            { properties: { enabled: input.enabled } },
            { params: { 'api-version': ALERT_PROCESSING_RULES_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/monitor/scheduled-query-rules/list-by-subscription
    // https://learn.microsoft.com/en-us/rest/api/monitor/scheduled-query-rules/list-by-resource-group
    listScheduledQueryRules: {
      isTool: true,
      description:
        'List scheduled query rules (KQL-based log search alert rules) in the subscription (or a single resource group). Use this to discover rule names before calling setScheduledQueryRuleEnabled — mirrors the metric-rule "list, then quiet" loop, but for log-based alerts.',
      input: ListScheduledQueryRulesInputSchema,
      handler: async (ctx, input: ListScheduledQueryRulesInput) => {
        try {
          const scope = input.resourceGroupName
            ? `/subscriptions/${getSubscriptionId(ctx)}/resourceGroups/${encodeURIComponent(
                input.resourceGroupName
              )}`
            : `/subscriptions/${getSubscriptionId(ctx)}`;
          const response = await ctx.client.get(
            `${ARM_BASE}${scope}/providers/Microsoft.Insights/scheduledQueryRules`,
            { params: { 'api-version': SCHEDULED_QUERY_RULES_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/monitor/scheduled-query-rules/update
    setScheduledQueryRuleEnabled: {
      isTool: true,
      description:
        'Enable or disable a scheduled query rule (log search alert) without deleting it. Use this to mute a noisy KQL-based alert during known noise, then re-enable it afterward. Use listScheduledQueryRules to discover rule names.',
      input: SetScheduledQueryRuleEnabledInputSchema,
      handler: async (ctx, input: SetScheduledQueryRuleEnabledInput) => {
        try {
          const response = await ctx.client.patch(
            `${ARM_BASE}/subscriptions/${getSubscriptionId(
              ctx
            )}/resourceGroups/${encodeURIComponent(
              input.resourceGroupName
            )}/providers/Microsoft.Insights/scheduledQueryRules/${encodeURIComponent(
              input.ruleName
            )}`,
            { properties: { enabled: input.enabled } },
            { params: { 'api-version': SCHEDULED_QUERY_RULES_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },
  },

  skill: [
    'Azure Monitor connector — usage guidance:',
    '',
    'CORE TRIAGE LOOP:',
    '- listAlerts (filter by severity/state/time) → getAlert or getAlertHistory (using the GUID at the end of the "id" field) → queryMetrics/runLogQuery to gather evidence → changeAlertState to acknowledge or close.',
    "- Every alert action (getAlert, getAlertHistory, changeAlertState) takes just the alert's GUID — do not try to construct or pass a full ARM scope.",
    '',
    'MUTING NOISY RULES (maintenance windows):',
    '- Metric alert rules: listMetricAlertRules → setMetricAlertRuleEnabled(enabled=false), then re-enable afterward.',
    '- Scheduled query (log search) rules: listScheduledQueryRules → setScheduledQueryRuleEnabled, same pattern.',
    '- Broader suppression across many rules/resources: createOrUpdateAlertProcessingRule with actionType="RemoveAllActionGroups" and an optional schedule, then setAlertProcessingRuleEnabled to toggle it off when done. Prefer this over disabling individual rules when suppressing a whole resource group or subscription during a known maintenance window.',
    '',
    'AUTH SCOPES: runLogQuery uses a separately-scoped Log Analytics token, minted from the same service principal credentials — it requires the Log Analytics Reader role on the target workspace in addition to the Monitoring Contributor/Reader role used by every other action.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.azureMonitor.test.description', {
      defaultMessage:
        'Verifies Azure Monitor connectivity by listing action groups in the subscription',
    }),
    handler: async (ctx) => {
      try {
        const response = await ctx.client.get(
          `${ARM_BASE}/subscriptions/${getSubscriptionId(
            ctx
          )}/providers/Microsoft.Insights/actionGroups`,
          { params: { 'api-version': ACTION_GROUPS_API_VERSION } }
        );
        const count = Array.isArray(response.data?.value) ? response.data.value.length : 0;
        return {
          message: `Successfully connected to Azure Monitor: found ${count} action group(s)`,
        };
      } catch (error) {
        throwAzureError(error);
      }
    },
  },
};
