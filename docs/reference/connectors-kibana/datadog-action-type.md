---
navigation_title: "Datadog"
type: reference
description: "Use the Datadog connector to list and mute monitors, manage downtimes and incidents, post events, query metrics and logs, and start a workflow from a monitor webhook."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Datadog connector [datadog-action-type]

The Datadog connector connects directly to the Datadog REST API. It lets a workflow or agent triage firing monitors — list monitors, fetch alert events, confirm with metric or log queries — then mute monitors, schedule downtimes, open or update incidents, and post events, without opening the Datadog console. It can also start a workflow from a monitor webhook.

You can use this connector in **Agent Builder** and **Workflows**.

## Overview

The Datadog connector uses Datadog's regional API hosts with API key and Application key authentication. You configure the Datadog site (region) and both keys when creating the connector.

## Create connectors in {{kib}} [define-datadog-ui]

You can create a Datadog connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [datadog-connector-configuration]

Datadog site
:   The Datadog site where the account lives (for example `datadoghq.com` for US1, `datadoghq.eu` for EU1, `us3.datadoghq.com` for US3). Requests go to the matching `api.*` host.

Authentication
:   API Key and Application Key. Both are required for monitor, downtime, incident, event, metric, and log actions. Create them under **Organization Settings > API Keys** and **Organization Settings > Application Keys** in Datadog.

## Receive Datadog webhook events [datadog-inbound-events]

The connector can start a workflow from a Datadog monitor webhook. A saved connector does not receive events until **Receive events** is turned on for that connector. After you save a new connector, {{kib}} shows the **Webhook URL** and the ingest token once, so copy them then. For an existing connector, save it, then select **Rotate ingest token**. A new token stops the previous one from working. This toggle appears when `xpack.actions.inboundEvents.enabled` is `true`.

In Datadog, you need permission to create a webhook integration and to attach it to a monitor. Datadog must be able to reach a {{kib}} URL. Datadog cannot call `localhost`.

In {{kib}}, you need an Enterprise license and `server.publicBaseUrl` set to the host that Datadog uses to reach {{kib}}. `xpack.actions.inboundEvents.enabled` defaults to `true`. Set it to `false` to turn receive events off.

{{kib}} starts the workflows that are enabled and subscribed to the matching event. To send events from Datadog, refer to [Start a workflow from Datadog events](#datadog-inbound-howto).

The connector supports one event. A workflow subscribes to it by using `datadog.alert` as the trigger `type`. The webhook JSON is on `event.body`. A body without `monitor_id` or `scopes` does not start a workflow.

| Workflow event | When it runs | Fields |
| --- | --- | --- |
| `datadog.alert` | A monitor webhook includes `monitor_id` and `scopes` | The raw JSON payload on `event.body` |

Use this JSON payload in the Datadog webhook configuration. Do not enable form encoding:

```json
{
  "message": "$EVENT_MSG",
  "last_updated": "$LAST_UPDATED",
  "event_type": "$EVENT_TYPE",
  "title": "$EVENT_TITLE",
  "severity": "$ALERT_PRIORITY",
  "alert_type": "$ALERT_TYPE",
  "alert_query": "$ALERT_QUERY",
  "alert_transition": "$ALERT_TRANSITION",
  "date": "$DATE",
  "scopes": "$ALERT_SCOPE",
  "org": {
    "id": "$ORG_ID",
    "name": "$ORG_NAME"
  },
  "url": "$LINK",
  "tags": "$TAGS",
  "id": "$ID",
  "monitor_id": "$ALERT_ID"
}
```

The managed Datadog alert translation workflow uses `monitor_id` and `scopes` as the alert fingerprint. It sets status to `inactive` when `alert_transition` is `Recovered`, and to `active` for other transitions.

### Webhook URL and authentication [datadog-inbound-url]

Datadog does not send the ingest token unless you add it. Append it to the webhook URL, or send `Authorization: Bearer <ingest-token>`. The **Webhook URL** field does not include the token.

The URL has one of these shapes. The default space has no `/s/<space-id>` prefix.

```text
https://<kibana-host>/api/actions/events/.datadog/<connector-id>?token=<ingest-token>
https://<kibana-host>/s/<space-id>/api/actions/events/.datadog/<connector-id>?token=<ingest-token>
```

The ingest token authenticates the webhook request. The workflow runs with the identity of the last user who saved the connector. The token is separate from the connector's API key and application key.

## Start a workflow from Datadog events [datadog-inbound-howto]

To run a {{kib}} workflow when a Datadog monitor changes state, create a webhook and add it to the monitor notification. {{kib}} does not create the webhook for you.

Before you start, meet the requirements in [Receive Datadog webhook events](#datadog-inbound-events) and turn on **Receive events** on the connector. Create the webhook after the connector is saved. An alert that fired before the webhook existed is not delivered.

### Create the Datadog webhook [datadog-inbound-webhook]

In Datadog, open **Integrations → Webhooks → New**.

- **Name**: a short name, such as `elastic_workflows`. The monitor notifies `@webhook-elastic_workflows`.
- **URL**: the webhook URL including `?token=`.
- **Payload**: the JSON in [Receive Datadog webhook events](#datadog-inbound-events). Leave form encoding off. `monitor_id` and `scopes` are required. A body without them does not start a workflow.

Save the webhook. On the monitor, add `@webhook-elastic_workflows` to **Notify your team**.

### Confirm that Datadog calls {{kib}} [datadog-inbound-confirm]

Trigger the monitor, or send a test from the webhook integration. Then open the workflow execution.

- **A connection error.** The URL is not reachable from Datadog. Use a public host, and set `server.publicBaseUrl` to that host.
- **HTTP 404.** The ingest token does not match the connector, or **Receive events** was not saved before the token was rotated.
- **HTTP 202 and no workflow run.** The body has no `monitor_id` or `scopes`, or the workflow is not enabled and subscribed to `datadog.alert`.
- **HTTP 202 and a workflow run.** {{kib}} accepted the alert.

### Subscribe a workflow to an event [datadog-inbound-subscribe]

This workflow runs for `datadog.alert`. Replace `<connector-id>` with the connector instance id. `"*"` subscribes to every connector of this type.

```yaml
version: "1"
name: Datadog monitor alert
enabled: true
triggers:
  - type: datadog.alert
    connector-id: "<connector-id>"
steps:
  - name: log_alert
    type: console
    with:
      message: "Monitor {{ event.body.monitor_id }} {{ event.body.alert_transition }}: {{ event.body.title }}"
```

### Test with a sample event [datadog-inbound-example]

POST this body to the ingest URL. It starts `datadog.alert` with `monitor_id` `123` and `scopes` `host:web-1`.

```bash
curl -X POST \
  'https://<kibana-host>/api/actions/events/.datadog/<connector-id>?token=<ingest-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "CPU load is high",
    "alert_transition": "Triggered",
    "scopes": "host:web-1",
    "monitor_id": "123"
  }'
```

When you test the trigger in the workflow editor, use the emitted fields as the sample event:

```json
{
  "body": {
    "title": "CPU load is high",
    "alert_transition": "Triggered",
    "scopes": "host:web-1",
    "monitor_id": "123"
  }
}
```

## Available actions [datadog-available-actions]

| Action | Description |
|--------|-------------|
| `listMonitors` | List monitors and their alert states. Parameters: `tags`, `monitorTags`, `name`, `groupStates`, `withDowntimes`, `page`, `pageSize`. |
| `getMonitor` | Get a single monitor's full definition and state. Parameters: `monitorId` (required), `groupStates`. |
| `getAlertEvents` | Search alert-type events over a time range. Parameters: `query` (required), `from` (required), `to` (required), `limit`. |
| `muteMonitor` | Mute a monitor (optionally for a scope or until a timestamp). Parameters: `monitorId` (required), `scope`, `end`. |
| `unmuteMonitor` | Unmute a monitor. Parameters: `monitorId` (required), `scope`, `allScopes`. |
| `scheduleDowntime` | Schedule a downtime for a scope and time window. Parameters: `scope` (required), `start` (required), `end` (required), `message`, `monitorTags`, `monitorId`. |
| `cancelDowntime` | Cancel a downtime by ID. Parameters: `downtimeId` (required). |
| `createIncident` | Create an incident. Parameters: `title` (required), `customerImpacted`, `severity`, `detectionMethod`, `initialCell`. |
| `updateIncident` | Update an incident (at least one of title/customerImpacted/severity/state). Parameters: `incidentId` (required), `title`, `customerImpacted`, `severity`, `state`. |
| `postEvent` | Post an event to the Events Explorer. Parameters: `title` (required), `text` (required), `tags`, `alertType`, `aggregationKey`, `dateHappened`. |
| `queryTimeseries` | Query timeseries metrics. Parameters: `query` (required), `from` (required), `to` (required). |
| `searchLogs` | Search logs over a time range. Parameters: `query` (required), `from` (required), `to` (required), `indexes`, `limit`, `sort`, `storageTier`. |

## Connector networking configuration [datadog-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [datadog-api-credentials]

1. Log in to your [Datadog](https://app.datadoghq.com/) account (use the URL for your site).
2. Go to **Organization Settings > API Keys**, create an API key, and copy it.
3. Go to **Organization Settings > Application Keys**, create an application key, and copy it.
4. Confirm your Datadog site from your browser URL (for example `datadoghq.com`, `datadoghq.eu`, or `us3.datadoghq.com`).
5. When configuring the connector, enter the API Key and Application Key, and select the matching Datadog site. Both keys are required for monitor, downtime, incident, event, metric, and log actions.
