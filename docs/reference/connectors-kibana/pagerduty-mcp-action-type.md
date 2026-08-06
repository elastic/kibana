---
navigation_title: "PagerDuty"
type: reference
description: "Use the PagerDuty data source to access and manage incidents, escalation policies, schedules, on-calls, users, and teams using the PagerDuty MCP server."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# PagerDuty connector [pagerduty-mcp-action-type]

The PagerDuty data source connects to PagerDuty to access and manage incidents, escalation policies, schedules, on-calls, users, and teams. Use it in data and context sources and agentic workflows to search and retrieve PagerDuty data, and to take action by triggering, acknowledging, resolving, or updating incidents, adding responders, and running response plays.

## Add the PagerDuty data source

You add and configure the PagerDuty data source when setting up a data or context source in {{kib}}. You are prompted for an **API token**. Refer to [Get API credentials](#pagerduty-mcp-api-credentials) for instructions.

## Get API credentials [pagerduty-mcp-api-credentials]

To use the PagerDuty data source, you need a PagerDuty **API token** (REST API). This is not the same as an integration key used for the alerting connector.

1. Log in to [PagerDuty](https://www.pagerduty.com/).
2. Go to **Integrations** > **Developer Tools** > **API Access Keys** (or **User Settings** > **API Access** in some layouts).
3. Select **Create API User Token** (user token) or **Create Key** (general access key; requires admin). User tokens are scoped to your permissions.
4. Enter a description (for example, `Kibana data source`) and create the token.
5. Copy the token and store it securely. You cannot see it again after this point. Enter the token in the format `Token token=<your_token>` when configuring the connector.

For more details, refer to [PagerDuty API access keys](https://support.pagerduty.com/docs/api-access-keys) and [API authentication](https://developer.pagerduty.com/docs/rest-api-v2/authentication/).
