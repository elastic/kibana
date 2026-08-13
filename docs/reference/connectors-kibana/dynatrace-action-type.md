---
navigation_title: "Dynatrace"
type: reference
description: "Use the Dynatrace connector to triage Davis problems, ingest events, query metrics and entities, and manage maintenance windows."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Dynatrace connector [dynatrace-action-type]

The Dynatrace connector connects directly to the Dynatrace Environment API v2. It lets a workflow or agent triage Davis problems — list, read, comment, and close — plus ingest events, query metrics and entities, and manage maintenance windows, without opening the Dynatrace console.

## Overview

This is a **custom connector** that uses Dynatrace's REST API with `Authorization: Api-Token` authentication. You configure your environment URL and an API access token when creating the connector.

## Create connectors in {{kib}} [define-dynatrace-ui]

You can create a Dynatrace connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [dynatrace-connector-configuration]

Environment URL
:   Environment API base URL, without a trailing `/api/v2`. SaaS must use `https://your-environment-id.live.dynatrace.com` (not the `*.apps.dynatrace.com` UI host — including trial/sandbox). Managed example: `https://your-domain/e/your-environment-id`. Environment ActiveGate example: `https://your-activegate-domain:9999/e/your-environment-id`.

Authentication
:   API token. Paste the raw Dynatrace API token value only (for example `dt0c01....`) — do not include a prefix. The connector sends `Authorization: Api-Token <token>` automatically. Required scopes: `problems.read`, `problems.write`, `events.read`, `events.ingest`, `metrics.read`, `entities.read`, `settings.read`, `settings.write`.

## Available actions [dynatrace-available-actions]

| Action | Description |
|--------|-------------|
| `listProblems` | List Davis problems. Parameters: `problemSelector`, `entitySelector`, `from`, `to`, `fields`, `sort`, `pageSize`, `nextPageKey`. |
| `getProblem` | Get one problem by ID. Parameters: `problemId` (required), `fields`. |
| `closeProblem` | Close a problem with a comment. Parameters: `problemId` (required), `message` (required). |
| `addProblemComment` | Post a comment on a problem. Parameters: `problemId` (required), `message` (required), `context`. |
| `listProblemComments` | List comments on a problem. Parameters: `problemId` (required), `pageSize`, `nextPageKey`. |
| `ingestEvent` | Ingest a custom event. Parameters: `eventType` (required), `title` (required), `entitySelector`, `properties`, `startTime`, `endTime`, `timeout`. |
| `listEvents` | List events. Parameters: `eventSelector`, `entitySelector`, `from`, `to`, `pageSize`, `nextPageKey`. |
| `getEvent` | Get one event by ID. Parameters: `eventId` (required). |
| `queryMetrics` | Query metric data points. Parameters: `metricSelector` (required), `from`, `to`, `resolution`, `entitySelector`. |
| `listMetrics` | Discover metric keys/descriptors. Parameters: `metricSelector`, `text`, `fields`, `pageSize`, `nextPageKey`. |
| `getMetricDescriptor` | Get one metric descriptor. Parameters: `metricId` (required), `fields`. |
| `listEntities` | List monitored entities. Parameters: `entitySelector` (required), `from`, `to`, `fields`, `pageSize`, `nextPageKey`. |
| `getEntity` | Get one entity by ID. Parameters: `entityId` (required), `fields`, `from`, `to`. |
| `createMaintenanceWindow` | Create a once-off maintenance window (Settings API). Parameters: `name` (required), `filter` (required DQL), `startDateTime` (required), `durationMinutes` (required), `description`, `enabled`, `autoDelete`, `timezone`. |
| `listMaintenanceWindows` | List maintenance windows. Parameters: `pageSize`, `nextPageKey`, `fields`. |
| `deleteMaintenanceWindow` | Delete a maintenance window by Settings object ID. Parameters: `objectId` (required). |

## Test connectors [dynatrace-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The connectivity test lists a single problem (`pageSize=1`) against your environment.

## Get API credentials [dynatrace-api-credentials]

To use the Dynatrace connector, you need to:

1. Open your Dynatrace environment. For SaaS (including trial/sandbox), use the Environment API host `https://{environment-id}.live.dynatrace.com` — not the `*.apps.dynatrace.com` UI URL from the browser address bar.
2. Go to **Access tokens** and create an API token with these scopes: `problems.read`, `problems.write`, `events.read`, `events.ingest`, `metrics.read`, `entities.read`, `settings.read`, `settings.write`.
3. When creating the connector in {{kib}}, paste the raw token value (without an `Api-Token` prefix) and set the Environment URL to the base URL from step 1.
