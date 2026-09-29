---
navigation_title: "PagerDuty"
type: reference
description: "Use the PagerDuty data source to access and manage incidents, escalation policies, schedules, on-calls, users, and teams in PagerDuty."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# PagerDuty connector [pagerduty-mcp-action-type]

The PagerDuty data source connects to PagerDuty to access and manage incidents, escalation policies, schedules, on-calls, users, and teams. Use it in data and context sources and agentic workflows to search and retrieve PagerDuty data, and to take action by triggering, acknowledging, resolving, or updating incidents, adding responders, and running response plays.

## Create connectors in {{kib}} [define-pagerduty-mcp-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [pagerduty-mcp-connector-configuration]

PagerDuty connectors have the following configuration properties:

MCP Server URL
:   The URL of the PagerDuty MCP server. Defaults to `https://mcp.pagerduty.com/mcp`.

API Key
:   Your PagerDuty API key. Enter it in the format `Token token=YOUR_API_KEY`. Refer to [Get API credentials](#pagerduty-mcp-api-credentials) for instructions.

## Test connectors [pagerduty-mcp-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

## Pagerduty connector actions [pagerduty-connector-actions]

The PagerDuty connector exposes the following actions:

`getUserData`
:   Return the current PagerDuty user — the account that owns the API key. Returns id, name, email, summary, role, and teams. Use this to confirm which user the connector is authenticated as and to obtain your user ID and email for write actions that require the `from` parameter.

`triggerIncident` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Create a new PagerDuty incident. Requires a service ID (use `listServices` to find one), an incident title, and the `from` email of the acting user (call `getUserData` to retrieve it). Optionally accepts urgency, a body, an escalation policy override, and direct user assignments.

`acknowledgeIncident` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Acknowledge an active PagerDuty incident by its ID. Moves the incident status from "triggered" to "acknowledged". Requires the incident ID and the `from` email of the acting user.

`resolveIncident` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Resolve a PagerDuty incident by its ID. Moves the incident status to "resolved". Requires the incident ID and the `from` email of the acting user.

`updateIncident` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Update one or more fields on an existing PagerDuty incident (title, status, urgency, priority, or assignments). Requires the incident ID and the `from` email of the acting user.

`listServices` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   List PagerDuty services. Supports free-text search and filtering by team IDs. Use this to look up a service ID before triggering an incident.

`addResponders` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Request additional responders for an active PagerDuty incident. Requires the incident ID, your user ID (call `getUserData` to retrieve it), a message, and at least one user ID or escalation policy ID to notify.

`runResponsePlay` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Execute a predefined PagerDuty response play against an incident. Requires the incident ID, the response play ID, the `from` email, and your user ID (call `getUserData` to retrieve it).

`listIncidents`
:   List PagerDuty incidents. Supports filtering by status, service IDs, user IDs, urgency, and date range. Supports sorting by incident_number, created_at, resolved_at, or urgency.

`listSchedules`
:   List PagerDuty on-call schedules. Supports free-text search and filtering by team or user IDs.

`listEscalationPolicies`
:   List PagerDuty escalation policies. Supports free-text search and filtering by user or team IDs.

`listOncalls`
:   Get current on-call assignments in PagerDuty. Supports filtering by schedule IDs, user IDs, or escalation policy IDs, and time range queries using ISO 8601 dates.

`listUsers`
:   List PagerDuty users. Supports free-text search across name and email fields.

`listTeams`
:   List PagerDuty teams. Supports free-text search across name and description fields.

`getIncident`
:   Get a specific PagerDuty incident by its ID. Returns the incident's summary, status, urgency, service, assignments, and timestamps.

`getSchedule`
:   Get a specific PagerDuty on-call schedule by its ID. Returns the schedule's name, description, time zone, layers, and assigned users.

`getEscalationPolicy`
:   Get a specific PagerDuty escalation policy by its ID. Returns the policy's name, escalation rules, associated services, and teams.

`getTeam`
:   Get a specific PagerDuty team by its ID. Returns the team's id, name, description, and summary.

`listTools`
:   List all tools available on the PagerDuty MCP server. Use this to discover available capabilities.

`callTool`
:   Call any tool on the PagerDuty MCP server directly by name. Use this as an escape hatch when a specific tool is not yet exposed as a named action.

## Connector networking configuration [pagerduty-mcp-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [pagerduty-mcp-api-credentials]

To use the PagerDuty data source, you need a PagerDuty **API token**. This is not the same as an integration key used for the alerting connector.

1. Log in to [PagerDuty](https://www.pagerduty.com/).
2. Go to **Integrations** > **Developer Tools** > **API Access Keys** (or **User Settings** > **API Access** in some layouts).
3. Select **Create API User Token** (user token) or **Create Key** (general access key; requires admin). User tokens are scoped to your permissions.
4. Enter a description (for example, `Kibana data source`) and create the token.
5. Copy the token and store it securely. You cannot see it again after this point. Enter the token in the format `Token token=<your_token>` when configuring the connector.

For more details, refer to [PagerDuty API access keys](https://support.pagerduty.com/docs/api-access-keys) and [API authentication](https://developer.pagerduty.com/docs/rest-api-v2/authentication/).
