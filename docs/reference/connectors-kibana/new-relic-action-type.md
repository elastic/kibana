---
navigation_title: "New Relic"
type: reference
description: "Use the New Relic connector to acknowledge and resolve AI issues, read issues and incidents, manage muting rules, and run NRQL queries over NerdGraph."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# New Relic connector [new-relic-action-type]

The New Relic connector connects directly to New Relic's NerdGraph (GraphQL) API. It lets a workflow or agent claim and close New Relic AI issues, read issues and their underlying incidents, suppress notifications during a deploy or maintenance window with muting rules, record deployment markers, and run arbitrary NRQL queries for enrichment.

## Overview

This is a **custom connector** that uses New Relic's NerdGraph GraphQL API with API-key authentication.

## Create connectors in {{kib}} [define-new-relic-ui]

You can create a New Relic connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [new-relic-connector-configuration]

User API Key
:   A New Relic User API key (prefixed `NRAK-`). Create one under your user profile > API keys.

Account ID
:   The numeric New Relic account ID this connector operates against. Found in the New Relic UI under your account name, or in account-scoped URLs as `one.newrelic.com/accounts/<accountId>`. To manage another account, create a separate connector instance.

Region
:   The data center hosting your New Relic account: `us` (default), `eu`, or `jp`. Determines which NerdGraph endpoint is used.

## Available actions [new-relic-available-actions]

All actions below operate on the account ID configured on the connector.

| Action | Description |
|--------|-------------|
| `acknowledgeIssue` | Acknowledge an AI issue via `aiIssuesAckIssue`. Parameters: `issueId` (required). |
| `unacknowledgeIssue` | Reverse an acknowledgement via `aiIssuesUnackIssue`. Parameters: `issueId` (required). |
| `resolveIssue` | Resolve/close an AI issue via `aiIssuesResolveIssue`. Parameters: `issueId` (required). |
| `listIssues` | List AI issues with optional `states`, `priority`, `entityGuids`, `since`/`until`, and `cursor` filters. |
| `listIncidents` | List the individual incidents grouped under issues, with the same filter shape as `listIssues`. |
| `createMutingRule` | Create a muting rule via `alertsMutingRuleCreate`. Parameters: `name`, `condition` (both required), `description`, `enabled`. |
| `updateMutingRule` | Update an existing muting rule via `alertsMutingRuleUpdate`. Parameters: `mutingRuleId` (required), `name`, `description`, `enabled`, `condition`. |
| `deleteMutingRule` | Delete a muting rule via `alertsMutingRuleDelete`. Parameters: `mutingRuleId` (required). |
| `listMutingRules` | List existing muting rules for the account. |
| `runNrqlQuery` | Run an NRQL query and return the results. Parameters: `nrql` (required), `timeoutSeconds`. |
| `createDeploymentMarker` | Record a change event via `changeTrackingCreateEvent`. Parameters: `entityGuid` (required), `version`, `description`, `user`, `deploymentType`, `groupId`, `timestamp`. |
| `listAlertPolicies` | List alert policies, optionally filtered by name. Parameters: `nameFilter`, `cursor`. |
| `listNrqlConditions` | List the NRQL conditions under a policy. Parameters: `policyId` (required). |
| `createAlertPolicy` | Provision a new alert policy via `alertsPolicyCreate`. Parameters: `name` (required), `incidentPreference`. |
| `createNrqlCondition` | Create a static NRQL alert condition via `alertsNrqlConditionStaticCreate`. Parameters: `policyId`, `name`, `nrql`, `thresholdOperator`, `thresholdValue`, `thresholdDurationSeconds` (all required), `enabled`. |

## Connector networking configuration [new-relic-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [new-relic-api-credentials]

1. Log in to your [New Relic](https://one.newrelic.com/) account.
2. Go to your user profile menu > **API keys**.
3. Create a new **User** key.
4. Copy the key and store it securely.
5. Note your account ID (visible in the New Relic UI under your account name, or in account-scoped URLs) and which region your account is hosted in (US, EU, or JP) — you'll need both when configuring the connector.
6. When configuring the connector, enter the key as the User API Key, and set the Account ID and Region fields.
