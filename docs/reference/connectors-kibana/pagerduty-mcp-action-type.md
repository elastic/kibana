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

You can use this connector in **Agent Builder** and **Workflows**.

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

The PagerDuty connector exposes the following actions. The `browse*` and `manage*` actions call tools on the PagerDuty MCP server and take a single `request` object; set `request.action` to the operation to run. The remaining actions call the PagerDuty REST API directly.

`browseUsers`
:   Read users. Use `request.action: get` to return the current PagerDuty user — the account that owns the API key — with id, name, email, summary, role, and teams. Use this to confirm which user the connector is authenticated as and to obtain your user ID and email for write actions that require the `from` parameter. Use `list` to search users by name or team.

`triggerIncident` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Create a new PagerDuty incident. Requires a service ID (use `listServices` to find one), an incident title, and the `from` email of the acting user (call `browseUsers` (`get`) to retrieve it). Optionally accepts urgency, a body, an escalation policy override, and direct user assignments.

`acknowledgeIncident` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Acknowledge an active PagerDuty incident by its ID. Moves the incident status from "triggered" to "acknowledged". Requires the incident ID and the `from` email of the acting user.

`resolveIncident` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Resolve a PagerDuty incident by its ID. Moves the incident status to "resolved". Requires the incident ID and the `from` email of the acting user.

`updateIncident` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Update one or more fields on an existing PagerDuty incident (title, status, urgency, priority, or assignments). Requires the incident ID and the `from` email of the acting user.

`manageIncidents`
:   Modify incidents through the MCP server. Operations: `create`, `update` (acknowledge, resolve, or change urgency, assignment, or escalation level), `add_note`, `add_responders`, and `start_workflow`.

`listServices` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   List PagerDuty services. Supports free-text search and filtering by team IDs. Use this to look up a service ID before triggering an incident.

`browseServices`
:   Read services. Operations: `list` (filter by name or team) and `get`.

`manageServices`
:   Create or update services. Operations: `create` and `update`.

`addResponders` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Request additional responders for an active PagerDuty incident. Requires the incident ID, your user ID (call `browseUsers` (`get`) to retrieve it), a message, and at least one user ID or escalation policy ID to notify.

`runResponsePlay` {applies_to}`serverless:` {applies_to}`stack: ga 9.6+`
:   Execute a predefined PagerDuty response play against an incident. Requires the incident ID, the response play ID, the `from` email, and your user ID (call `browseUsers` (`get`) to retrieve it).

`browseIncidents`
:   Read incidents. Operations: `list` (filter by status, urgency, priority, service, team, and date range), `get`, `list_alerts`, `get_alert`, `list_notes`, `context` (related, past, or outlier incidents), `list_change_events`, `list_workflows`, and `get_workflow`.

`browseSchedules`
:   Read schedules and on-call data. Operations: `list`, `get`, `list_users`, and `list_oncalls` (current on-call assignments, filterable by schedule, user, escalation policy, and time range). For shift-based (v3) schedules, also `list_rotations`, `get_rotation`, `list_rotation_events`, `get_rotation_event`, `list_custom_shifts`, `get_custom_shift`, `list_overrides`, and `get_override`.

`browseEscalationPolicies`
:   Read escalation policies. Operations: `list` (free-text search and filtering by user or team IDs) and `get`.

`browseTeams`
:   Read teams. Operations: `list`, `get`, and `list_members`.

`manageSchedules`
:   Create, update, or delete schedules and their shifts. Operations include `create`, `update`, `create_override`, `delete_schedule_v3`, and the rotation, rotation event, custom shift, and override operations for shift-based schedules.

`manageTeams`
:   Create, update, or delete teams and membership. Operations: `create`, `update`, `delete`, `add_member`, and `remove_member`.

`browseEventOrchestrations`
:   Read event orchestrations. Operations: `list`, `get`, `get_router`, `get_service`, and `get_global`.

`manageEventOrchestrations`
:   Modify event orchestration routing. Operations: `update_router` and `append_router_rule`.

`browseAlertGrouping`
:   Read alert grouping settings. Operations: `list` and `get`.

`manageAlertGrouping`
:   Create, update, or delete alert grouping settings. Operations: `create`, `update`, and `delete`.

`browseChangeEvents`
:   Read change events. Operations: `list`, `get`, and `list_service`.

`browseStatusPages`
:   Read status pages. Operations: `list`, `list_severities`, `list_impacts`, `list_statuses`, `get_post`, and `list_post_updates`.

`manageStatusPages`
:   Create status page posts and post updates. Operations: `create_post` and `create_post_update`.

`browseActivity`
:   Read account activity log entries. Operations: `list_log_entries` and `get_log_entry`.

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
