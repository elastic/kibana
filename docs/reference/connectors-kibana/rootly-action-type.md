---
navigation_title: "Rootly"
type: reference
description: "Use the Rootly connector to declare, read, and drive incidents through their lifecycle, and triage, acknowledge, and resolve alerts using the Rootly API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Rootly connector [rootly-action-type]

The Rootly connector connects directly to the Rootly API. It lets a workflow or agent declare an incident, read and query incidents and alerts, drive an incident through its lifecycle (triage, mitigate, resolve, cancel), track follow-up work, and acknowledge or resolve alerts.

## Overview

This is a **custom connector** that uses Rootly's JSON:API-based REST API with Bearer token authentication.

## Create connectors in {{kib}} [define-rootly-ui]

You can create a Rootly connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [rootly-connector-configuration]

Authentication
:   Bearer token. Use a Rootly API key (**Organization Settings** > **API Keys**).

## Available actions [rootly-available-actions]

| Action | Description |
|--------|-------------|
| `createIncident` | Declare a new incident. Parameters: `title` (required), `summary`, `severityId`, `serviceIds`, `groupIds`, `status`, `private`, `labels`. |
| `getIncident` | Get a single incident by ID. Parameters: `incidentId` (required). |
| `listIncidents` | List incidents with filters. Parameters: `status`, `severityId`, `serviceIds`, `teamIds`, `search`, `createdAtGte`, `createdAtLte`, `pageSize`, `pageNumber`. |
| `updateIncident` | Patch an incident's title, summary, severity, services, teams, or labels. Parameters: `incidentId` (required), `title`, `summary`, `severityId`, `serviceIds`, `groupIds`, `labels`. |
| `triageIncident` | Move an incident into triage. Parameters: `incidentId` (required). |
| `mitigateIncident` | Move an incident to mitigated. Parameters: `incidentId` (required), `message`. |
| `resolveIncident` | Move an incident to resolved. Parameters: `incidentId` (required), `message`. |
| `cancelIncident` | Cancel an incident as a false positive. Parameters: `incidentId` (required), `message`. |
| `assignIncidentUser` | Assign a responder to an incident role. Parameters: `incidentId`, `userId`, `incidentRoleId` (all required). |
| `addIncidentSubscribers` | Subscribe stakeholders to incident updates. Parameters: `incidentId` (required), `userIds` (required). |
| `createActionItem` | File a follow-up task on an incident. Parameters: `incidentId`, `summary` (required), `description`, `kind`, `priority`, `status`, `assignedToUserId`, `dueDate`. |
| `listActionItems` | List action items, scoped to an incident or org-wide. Parameters: `incidentId`, `status`, `priority`. |
| `createTimelineEvent` | Post a note/milestone to an incident's timeline. Parameters: `incidentId`, `event` (required), `visibility`. |
| `listSeverities` | List severity definitions and their resource IDs. |
| `listServices` | List the service catalog. Parameters: `name`. |
| `listTeams` | List teams. Parameters: `name`. |
| `listAlerts` | List alerts with filters. Parameters: `status`, `source`, `pageSize`, `pageNumber`. |
| `getAlert` | Get a single alert by ID. Parameters: `alertId` (required). |
| `acknowledgeAlert` | Acknowledge a triggered alert. Parameters: `alertId` (required). |
| `resolveAlert` | Resolve an alert, optionally cascading to linked incidents. Parameters: `alertId` (required), `resolutionMessage`, `resolveRelatedIncidents`. |

## Connector networking configuration [rootly-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [rootly-api-credentials]

1. Log in to your [Rootly](https://rootly.com/) account.
2. Go to **Organization Settings** > **API Keys**.
3. Create a new API key (a Global API Key is recommended for org-wide access).
4. Copy the key and store it securely.
5. When configuring the connector, enter the key as the Bearer token.
