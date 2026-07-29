---
navigation_title: "Sentry"
type: reference
description: "Use the Sentry connector to triage issues, provision issue alert rules, and correlate incidents to releases using the Sentry API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Sentry connector [sentry-action-type]

The Sentry connector connects directly to the Sentry API. It lets a workflow or agent triage Sentry issues — list, read, resolve, ignore, reopen, and assign — plus bulk-update issues, provision issue alert rules, and audit monitor coverage, without opening the Sentry console.

## Overview

This is a **custom connector** that uses Sentry's REST API with Bearer token authentication. You configure your Sentry organization slug and an auth token when creating the connector.

## Create connectors in {{kib}} [define-sentry-ui]

You can create a Sentry connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [sentry-connector-configuration]

Organization slug
:   The slug of your Sentry organization, found in the URL: `sentry.io/organizations/<slug>/`.

API base URL
:   Optional. Leave empty to use Sentry SaaS (`https://sentry.io/api/0`). If your organization uses a region-specific data storage location, use its regional domain instead, for example `https://us.sentry.io/api/0` or `https://de.sentry.io/api/0`. Set this for a self-hosted Sentry instance, for example `https://sentry.example.com/api/0`.

Authentication
:   Bearer token. Use a Sentry auth token with `org:read`, `project:read`, `event:read`, and `event:write` scopes (add `event:admin` too if you plan to use `deleteIssue`).

## Available actions [sentry-available-actions]

| Action | Description |
|--------|-------------|
| `listIssues` | List issues, optionally scoped to a project, filtered by search query, environment, or time window. Parameters: `project`, `query`, `statsPeriod`, `environment`, `sort`, `cursor`, `limit`. |
| `getIssue` | Get the full record for a single issue. Parameters: `issueId` (required). |
| `resolveIssue` | Resolve an issue. Parameters: `issueId` (required), `inNextRelease`. |
| `ignoreIssue` | Ignore (archive) an issue. Parameters: `issueId` (required), `ignoreDuration`. |
| `unresolveIssue` | Move an issue back to unresolved. Parameters: `issueId` (required). |
| `assignIssue` | Assign an issue to a user or team. Parameters: `issueId` (required), `assignedTo` (required). |
| `listIssueEvents` | List the events recorded under an issue. Parameters: `issueId` (required), `cursor`, `full`. |
| `getEvent` | Get one event's full detail (stack trace, tags, context). Parameters: `project` (required), `eventId` (required). |
| `bulkUpdateIssues` | Update status and/or assignee for multiple issues in one call. Parameters: `project` (required), `issueIds` (required), `status`, `assignedTo` (at least one of `status`/`assignedTo` is required). |
| `deleteIssue` | Permanently delete an issue. Requires the `event:admin` scope. Parameters: `issueId` (required). |
| `listProjects` | List the organization's projects. Parameters: `cursor`. |
| `listIssueAlertRules` | List issue alert rules configured on a project. Parameters: `project` (required), `cursor`. |
| `createIssueAlertRule` | Create a new issue alert rule. Parameters: `project` (required), `name` (required), `conditions` (required), `actions` (required), `actionMatch`, `frequency`. |
| `updateIssueAlertRule` | Update an existing issue alert rule. Parameters: `project` (required), `ruleId` (required), `name`, `actionMatch`, `conditions`, `actions`, `frequency`. |

## Connector networking configuration [sentry-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [sentry-api-credentials]

1. Log in to your [Sentry](https://sentry.io/) account.
2. Go to **Settings** > **Developer Settings** > **New Internal Integration** (or, for a personal auth token, **User Settings** > **User Auth Tokens**).
3. Grant the scopes `org:read`, `project:read`, `event:read`, and `event:write` (add `alerts:write` if you plan to provision issue alert rules, and `event:admin` if you plan to use `deleteIssue`).
4. Save the integration and copy the generated token.
5. When configuring the connector, enter the token as the Bearer token, and enter your organization slug (from your Sentry URL) in the **Organization slug** field.
