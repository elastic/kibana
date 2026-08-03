---
navigation_title: "Azure monitor"
type: reference
description: "Use the Azure monitor connector to list and triage Azure Monitor alerts, query metrics and logs, and control alert rules."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Azure monitor connector [azure-monitor-action-type]

The Azure Monitor connector connects directly to the Azure Resource Manager (ARM) and Log Analytics REST APIs. It lets a workflow or agent triage an Azure Monitor alert without leaving Elastic: list and inspect fired or resolved alerts, change an alert's state, query the metrics or logs behind it, correlate it with Activity Log events, and mute noisy alert rules during a maintenance window.

## Overview

This is a **custom connector** that authenticates as an Azure AD app registration (service principal) using the OAuth 2.0 Client Credentials grant.

## Create connectors in {{kib}} [define-azure-monitor-ui]

You can create an Azure monitor connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [azure-monitor-connector-configuration]

Subscription ID
:   The Azure subscription (a GUID) that every action in this connector operates against.

Token URL
:   The Azure AD v2.0 token endpoint for your tenant: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`, with `{tenant-id}` replaced by your Azure AD tenant ID.

Client ID
:   The Application (client) ID of the Azure AD app registration.

Client Secret
:   A client secret created for the Azure AD app registration.

The app registration must have the **Monitoring Contributor** role on the subscription (**Monitoring Reader** is enough if you only use read-only actions), and the **Log Analytics Reader** role on any Log Analytics workspace queried with `runLogQuery`.

## Available actions [azure-monitor-available-actions]

| Action | Description |
|--------|-------------|
| `listAlerts` | List fired or resolved alerts in the subscription. Parameters: `targetResource`, `targetResourceGroup`, `targetResourceType`, `monitorService`, `monitorCondition`, `severity`, `alertState`, `alertRule`, `smartGroupId`, `timeRange`, `customTimeRange`, `includeContext`, `pageCount`, `sortBy`, `sortOrder` (all optional). |
| `getAlert` | Get the full essentials of a single alert. Parameters: `alertId` (required). |
| `getAlertHistory` | Get the change history of a single alert. Parameters: `alertId` (required). |
| `changeAlertState` | Change an alert's state to `New`, `Acknowledged`, or `Closed`. Parameters: `alertId`, `newState` (both required), `comment`. |
| `getAlertSummary` | Get alert counts grouped by severity, state, condition, service, signal type, or rule. Parameters: `groupBy` (required), plus the same filters as `listAlerts`, and `includeSmartGroupsCount`. |
| `queryMetrics` | Query time-series metric values for a resource. Parameters: `resourceId`, `metricNames` (both required), `metricNamespace`, `aggregation`, `timespan`, `interval`, `top`, `orderby`, `filter`. |
| `runLogQuery` | Run a KQL query against a Log Analytics workspace. Parameters: `workspaceId`, `query` (both required), `timespan`. |
| `queryActivityLog` | Query the Activity Log (control-plane events) within a time range. Parameters: `startTime`, `endTime` (both required), `resourceGroupName`, `resourceId`, `select`. |
| `listActivityLogAlerts` | List Activity Log Alert rules in the subscription. No parameters. |
| `listMetricAlertRules` | List metric alert rule definitions. Parameters: `resourceGroupName`. |
| `getMetricAlertRule` | Get a single metric alert rule's definition. Parameters: `resourceGroupName`, `ruleName` (both required). |
| `setMetricAlertRuleEnabled` | Enable or disable a metric alert rule. Parameters: `resourceGroupName`, `ruleName`, `enabled` (all required). |
| `getMetricAlertStatus` | Get a metric alert rule's current fired/resolved status. Parameters: `resourceGroupName`, `ruleName` (both required). |
| `listActionGroups` | List action groups (notification targets) in the subscription. No parameters. |
| `createOrUpdateAlertProcessingRule` | Create or fully replace an alert processing rule that adds action groups to, or suppresses notifications for, matching alerts. Parameters: `resourceGroupName`, `ruleName`, `scopes`, `actionType` (all required), `actionGroupIds`, `enabled`, `description`, `conditions`, `schedule`. |
| `setAlertProcessingRuleEnabled` | Enable or disable an alert processing rule. Parameters: `resourceGroupName`, `ruleName`, `enabled` (all required). |
| `listScheduledQueryRules` | List scheduled query (log search alert) rules. Parameters: `resourceGroupName`. |
| `setScheduledQueryRuleEnabled` | Enable or disable a scheduled query rule. Parameters: `resourceGroupName`, `ruleName`, `enabled` (all required). |

## Connector networking configuration [azure-monitor-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [azure-monitor-api-credentials]

To use the Azure monitor connector, you need to:

1. In the [Azure Portal](https://portal.azure.com/), go to **Microsoft Entra ID > App registrations** and create a new app registration (or reuse an existing one). Note its **Application (client) ID** and **Directory (tenant) ID**.
2. Under **Certificates & secrets**, create a new client secret and copy its value — it's only shown once.
3. Assign the app registration the **Monitoring Contributor** role (or **Monitoring Reader** for read-only use) on the subscription: go to the subscription's **Access control (IAM) > Add role assignment**.
4. If you plan to use `runLogQuery`, also assign the app registration the **Log Analytics Reader** role on each Log Analytics workspace it needs to query.
5. When configuring the connector, enter the subscription ID, the token URL (`https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`), the client ID, and the client secret.
