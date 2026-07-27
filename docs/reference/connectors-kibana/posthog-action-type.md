---
navigation_title: "PostHog"
type: reference
description: "Use the PostHog connector to triage error-tracking issues, run HogQL queries, toggle feature flags, post annotations, and look up session recordings."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# PostHog connector [posthog-action-type]

The PostHog connector connects directly to the PostHog REST API. It lets a workflow or agent find, own, and act on a product error without leaving Elastic: list and read error-tracking issues, set their status, assign an owner, run a HogQL query for enrichment, toggle a feature flag as a mitigation lever, mark events on charts with annotations, and look up session recordings around an error.

## Overview

This is a **custom connector** that uses PostHog's REST API with personal API key (Bearer token) authentication. Works with PostHog US Cloud, EU Cloud, or a self-managed instance.

## Create connectors in {{kib}} [define-posthog-ui]

You can create a PostHog connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [posthog-connector-configuration]

Instance host
:   Your PostHog instance URL: `https://us.posthog.com` (US Cloud, default), `https://eu.posthog.com` (EU Cloud), or your self-managed instance URL.

Project ID
:   The PostHog project ID that every action runs against. Found in Project Settings, or via a call to `/api/projects/`.

Personal API Key
:   A PostHog personal API key (**Settings** > **Personal API keys**), scoped to `error_tracking`, `query`, `feature_flag`, `annotation`, and `session_recording` read/write.

## Available actions [posthog-available-actions]

| Action | Description |
|--------|-------------|
| `listIssues` | List error-tracking issues. Parameters: `status`, `assignee`, `dateFrom`, `dateTo`, `orderBy`, `limit`, `offset`. |
| `getIssue` | Get a single error-tracking issue by ID. Parameters: `issueId` (required). |
| `updateIssueStatus` | Move an issue to a new status (`active`, `resolved`, `archived`, `suppressed`, `pending_release`). Parameters: `issueId`, `status` (both required). |
| `assignIssue` | Assign or reassign an issue to a user or role. Parameters: `issueId`, `assigneeId` (both required), `assigneeType`. |
| `runQuery` | Run a HogQL query and return the result rows. Parameters: `query` (required), `name`. |
| `updateFeatureFlag` | Toggle a feature flag active/inactive or change its rollout percentage. Parameters: `flagId` (required), `active`, `rolloutPercentage`. |
| `getFeatureFlag` | Get a feature flag's current state and rollout. Parameters: `flagId` (required). |
| `listFeatureFlags` | List feature flags, optionally filtered by name/key. Parameters: `search`, `limit`. |
| `createAnnotation` | Mark a deploy, incident, or config change on PostHog charts. Parameters: `content`, `dateMarker` (both required), `scope`. |
| `listSessionRecordings` | List session recordings within a time window. Parameters: `dateFrom`, `dateTo`, `personId`, `limit`. |
| `createExternalReference` | Link an issue to an external ticket (e.g. Jira or GitHub) via a configured integration. Parameters: `issueId`, `integrationId` (both required), `externalUrl`, `config`. |

## Connector networking configuration [posthog-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [posthog-api-credentials]

1. Log in to your [PostHog](https://posthog.com/) account.
2. Go to **Settings** > **Personal API keys** (under your user profile).
3. Create a new personal API key, scoped to at least `error_tracking`, `query`, `feature_flag`, `annotation`, and `session_recording` read/write.
4. Copy the key and store it securely.
5. Find your project ID in **Project Settings**, and note your instance host (US Cloud, EU Cloud, or self-managed URL).
6. When configuring the connector, enter the instance host, project ID, and the key as the Personal API Key.
