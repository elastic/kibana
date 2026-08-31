---
navigation_title: "Datadog"
type: reference
description: "Use the Datadog connector to list and mute monitors, manage downtimes and incidents, post events, and query metrics and logs."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Datadog connector [datadog-action-type]

The Datadog connector connects directly to the Datadog REST API. It lets a workflow or agent triage firing monitors — list monitors, fetch alert events, confirm with metric or log queries — then mute monitors, schedule downtimes, open or update incidents, and post events, without opening the Datadog console.

## Overview

This is a **custom connector** that uses Datadog's regional API hosts with API key and Application key authentication. You configure the Datadog site (region) and both keys when creating the connector.

## Create connectors in {{kib}} [define-datadog-ui]

You can create a Datadog connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [datadog-connector-configuration]

Datadog site
:   The Datadog site where the account lives (for example `datadoghq.com` for US1, `datadoghq.eu` for EU1, `us3.datadoghq.com` for US3). Requests go to the matching `api.*` host.

Authentication
:   API Key and Application Key. Both are required for monitor, downtime, incident, event, metric, and log actions. Create them under **Organization Settings > API Keys** and **Organization Settings > Application Keys** in Datadog.

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
