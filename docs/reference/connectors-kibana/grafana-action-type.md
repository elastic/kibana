---
navigation_title: "Grafana"
type: reference
description: "Use the Grafana connector to read alerts and rules, manage silences, post dashboard annotations, and search dashboards using the Grafana HTTP API."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Grafana connector [grafana-action-type]

The Grafana connector connects directly to the Grafana HTTP API. It lets a workflow or agent read Grafana-managed alerts and rules, manage silences, post dashboard annotations, and search dashboards and notification configuration, for both self-hosted Grafana and Grafana Cloud.

## Overview

This is a **custom connector** that uses Grafana's REST API with Bearer token (service account) authentication. You configure your Grafana instance URL, an optional organization ID (for multi-org instances), and a service account token when creating the connector.

## Create connectors in {{kib}} [define-grafana-ui]

You can create a Grafana connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [grafana-connector-configuration]

Grafana instance URL
:   The base URL of your Grafana instance, for example `https://your-stack.grafana.net` (Grafana Cloud) or `https://grafana.example.com` (self-hosted).

Organization ID
:   Optional. Sent as the `X-Grafana-Org-Id` header on every request. Leave empty to use the token's default organization.

Authentication
:   Bearer token. Use a Grafana service account token (**Administration** > **Users and access** > **Service accounts**). Grafana Cloud tokens are typically prefixed `glsa_`.

## Available actions [grafana-available-actions]

| Action | Description |
|--------|-------------|
| `getAlerts` | Fetch firing, pending, silenced, and inhibited alerts from Grafana-managed Alertmanager. Parameters: `active`, `silenced`, `inhibited`. |
| `listRules` | List all configured alert rules. |
| `getAlertRule` | Get a single alert rule by UID. Parameters: `uid` (required). |
| `listSilences` | List active and pending silences. |
| `getSilence` | Get a single silence by ID. Parameters: `silenceId` (required). |
| `createSilence` | Mute alerts matching label matchers for a time window. Parameters: `matchers`, `startsAt`, `endsAt`, `comment`, `createdBy` (all required). |
| `deleteSilence` | Expire a silence so matching alerts can fire again. Parameters: `silenceId` (required). |
| `listAnnotations` | List annotations, filterable by dashboard, tags, and time range. Parameters: `dashboardUID`, `tags`, `from`, `to`, `limit`. |
| `createAnnotation` | Post a dashboard annotation. Parameters: `text` (required), `dashboardUID`, `panelId`, `time`, `timeEnd`, `tags`. |
| `updateAnnotation` | Update an existing annotation's text, tags, or time range. Parameters: `annotationId` (required), `text`, `tags`, `time`, `timeEnd`. |
| `deleteAnnotation` | Delete an annotation. Parameters: `annotationId` (required). |
| `searchDashboards` | Search dashboards and folders by query or tag. Parameters: `query`, `tag`, `type`, `starred`, `limit`, `page`. |
| `getDashboard` | Get a dashboard by UID. Parameters: `uid` (required). |
| `listContactPoints` | List configured contact points (notification targets). Parameters: `name`. |
| `listMuteTimings` | List recurring silence schedules. |
| `getNotificationPolicyTree` | Read the notification policy routing tree. |

## Connector networking configuration [grafana-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations. For a self-hosted Grafana instance, this instance must be network-reachable from Kibana.

## Get API credentials [grafana-api-credentials]

1. Log in to your Grafana instance.
2. Go to **Administration** > **Users and access** > **Service accounts**.
3. Create a service account and assign it the RBAC roles/permissions it needs, for example `alert.instances:read`, `alert.instances:create` (silences), `alert.rules:read` (rules), `annotations:read`, `annotations:write`, `annotations:delete`, and `dashboards:read`.
4. Add a service account token and copy it.
5. When configuring the connector, enter the token as the Bearer token, and your Grafana instance URL (and organization ID, if applicable) in the connector configuration fields.
