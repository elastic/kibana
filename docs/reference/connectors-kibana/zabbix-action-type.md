---
navigation_title: "Zabbix"
type: reference
description: "Use the Zabbix connector to read and triage Zabbix problems and events, manage maintenance windows, and enable or disable hosts and triggers, using the Zabbix JSON-RPC API."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Zabbix connector [zabbix-action-type]

The Zabbix connector connects directly to a self-hosted Zabbix server's JSON-RPC API. It lets a workflow or agent read current problems and full event history, acknowledge and annotate problems, close and re-rank them, suppress noise, open and manage maintenance windows, and enable or disable hosts and triggers — without an operator opening the Zabbix frontend.

## Overview

This is a **custom connector** that uses the single Zabbix JSON-RPC endpoint (`api_jsonrpc.php`) with Bearer token authentication. You configure your Zabbix frontend base URL and an API token when creating the connector; every action then runs under that token's account and permissions.

Zabbix must be network-reachable from Kibana, and the connector requires Zabbix 6.4 or later (Bearer-header authentication for the API was added in that release).

## Create connectors in {{kib}} [define-zabbix-ui]

You can create a Zabbix connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [zabbix-connector-configuration]

Zabbix URL
:   The base URL of your self-hosted Zabbix frontend, for example `https://zabbix.example.com`. Do not include `/api_jsonrpc.php` — the connector appends it automatically.

Authentication
:   Bearer token. Use a Zabbix API token (**Users** > **API tokens** in the Zabbix frontend) or a session token obtained via the `user.login` method. Use an **Admin** or **Super admin** account if this connector will manage maintenance windows or enable/disable hosts and triggers — see [Required permissions](#zabbix-required-permissions).

## Available actions [zabbix-available-actions]

| Action | Description |
|--------|-------------|
| `getProblems` | List current (unresolved, or recently resolved with `recent: true`) problems. Parameters: `eventIds`, `hostIds`, `groupIds`, `severities`, `tags`, `acknowledged`, `suppressed`, `recent`, `limit`. |
| `getEvent` | Fetch full details for one or more events by ID, including already-resolved ones. Parameters: `eventIds` (required). |
| `acknowledgeProblem` | Acknowledge one or more problems. Parameters: `eventIds` (required). |
| `unacknowledgeProblem` | Remove the acknowledgement from one or more problems. Parameters: `eventIds` (required). |
| `addProblemMessage` | Attach a note to one or more problems' update trail. Parameters: `eventIds`, `message` (both required). |
| `closeProblem` | Manually close one or more problems. The underlying trigger must have manual close enabled. Parameters: `eventIds` (required). |
| `changeProblemSeverity` | Re-rank one or more problems' severity. Parameters: `eventIds`, `severity` (both required). |
| `suppressProblem` | Suppress (mute) one or more problems for a time window. Parameters: `eventIds` (required), `suppressUntil`. |
| `unsuppressProblem` | Resume alerting on previously-suppressed problems. Parameters: `eventIds` (required). |
| `createMaintenance` | Open a one-time maintenance window over hosts or host groups. Parameters: `name`, `activeSince`, `activeTill` (required), `hostIds` or `groupIds` (at least one required), `description`, `withDataCollection`, `tags`. |
| `updateMaintenance` | Adjust an existing maintenance window's name, targets, or time range. Parameters: `maintenanceId` (required), `name`, `description`, `hostIds`, `groupIds`, `activeSince`/`activeTill` (provide together). |
| `deleteMaintenance` | Delete one or more maintenance windows, ending them immediately. Parameters: `maintenanceIds` (required). |
| `getMaintenances` | List maintenance windows. Parameters: `maintenanceIds`, `hostIds`, `groupIds`. |
| `getHosts` | Resolve hosts by ID, group, name, or status. Parameters: `hostIds`, `groupIds`, `name`, `status`, `limit`. |
| `disableHost` | Stop monitoring one or more hosts. Parameters: `hostIds` (required). |
| `enableHost` | Resume monitoring on one or more hosts. Parameters: `hostIds` (required). |
| `disableTrigger` | Disable one or more triggers without affecting the rest of the host. Parameters: `triggerIds` (required). |
| `enableTrigger` | Re-enable one or more triggers. Parameters: `triggerIds` (required). |
| `getItemHistory` | Fetch recent metric values recorded for an item. Parameters: `itemId` (required), `timeFrom`, `timeTill`, `limit`. |

## Required permissions [zabbix-required-permissions]

Zabbix permissions are governed by the API token's user account, not by per-action scopes. `getProblems`, `getEvent`, `getHosts`, `getMaintenances`, `getItemHistory`, and the problem-lifecycle actions (`acknowledgeProblem`, `unacknowledgeProblem`, `addProblemMessage`, `closeProblem`, `changeProblemSeverity`, `suppressProblem`, `unsuppressProblem`) are available to any Zabbix user type, subject to the user's role and the read/write permissions granted on the relevant host groups. `createMaintenance`, `updateMaintenance`, `deleteMaintenance`, `disableHost`, `enableHost`, `disableTrigger`, and `enableTrigger` additionally require an **Admin** or **Super admin** Zabbix user type — an account below that type will get a permission error from those actions even with full host-group read/write access.

## Connector networking configuration [zabbix-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations. Because Zabbix is self-hosted, this instance must be network-reachable from Kibana.

## Get API credentials [zabbix-api-credentials]

1. Log in to your Zabbix frontend as a user with sufficient permissions for the actions this connector will perform (see [Required permissions](#zabbix-required-permissions) above — use an **Admin** or **Super admin** account if the connector needs to manage maintenance windows or enable/disable hosts and triggers).
2. Go to **Users** > **API tokens**.
3. Create a token, optionally set an expiry date, and copy the generated token value — Zabbix only shows it once.
4. When configuring the connector, enter the token as the Bearer token, and your Zabbix frontend URL in the connector configuration fields.
