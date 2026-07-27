---
navigation_title: "Sublime Security"
type: reference
description: "Use the Sublime Security connector to search flagged email, get verdicts, and quarantine, trash, or restore message groups."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Sublime Security connector [sublime-security-action-type]

The Sublime Security connector enables searching flagged and user-reported email, retrieving message details and machine-learning verdicts, and remediating email threats by quarantining, trashing, or restoring message groups in Sublime Security.

## Create connectors in {{kib}} [define-sublime-security-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [sublime-security-connector-configuration]

Sublime Security connectors authenticate with an **API key**, sent as a bearer token. In {{kib}}, you provide:

API base URL
:   Your Sublime Platform API base URL. This is region-specific for Sublime Cloud (for example, `https://platform.sublime.security` for NA-East or `https://eu.platform.sublime.security` for EU) or the address of your self-hosted instance. Find it in the Sublime dashboard under **Automate → API**.

API key
:   A Sublime API key, created in the Sublime dashboard under **Automate → API**.

## Test connectors [sublime-security-action-configuration]

The Sublime Security connector has the following actions:

Search message groups
:   Search message groups (campaign-like clusters of deduplicated email) with filters.
    - `flagged` (optional): Only return groups with at least one message flagged by a detection rule. Defaults to `true` unless `userReported` is set. The Sublime API requires `flagged` or `userReported` to be `true`, so `flagged: false` is only valid together with `userReported: true`.
    - `userReported` (optional): Only return groups with at least one user-reported message.
    - `reviewed` (optional): Filter by review state.
    - `senderEmail`, `senderDomain`, `recipientEmail`, `mailboxEmail` (optional): Exact-match filters.
    - `attachmentSha256` (optional): SHA-256 hash of an attachment.
    - `attackScoreVerdict` (optional): One of `unknown`, `likely_benign`, `suspicious`, `malicious`, `graymail`, `spam`.
    - `flaggedRuleSeverity` (optional): One of `informational`, `low`, `medium`, `high`, `critical`.
    - `createdAtGte`, `createdAtLt` (optional): UTC ISO 8601 time window bounds.
    - `limit` (optional): Maximum groups to return (1-500, default 20). `offset` (optional): Zero-based pagination offset.

    The response includes `total` (the number of matching groups) and `stats_limit_exceeded`. When `stats_limit_exceeded` is `true`, `total` is only a lower bound: continue paging until a page returns fewer than `limit` groups rather than stopping at `offset >= total`.

Get message group
:   Retrieve one message group by its canonical ID, including flagged rules, review state, user report and link click counts, and up to 50 member messages.
    - `messageGroupId` (required): Canonical ID of the message group.

Get message
:   Retrieve metadata for a single message: subject, sender, recipients, mailbox, and timestamps. Does not return the message body.
    - `messageId` (required): ID of the message.

Get attack score
:   Retrieve the Attack Score for a message: a 0-100 score, a verdict, a graymail score, and the top signals explaining the verdict.
    - `messageId` (required): ID of the message.

Get ASA verdict
:   Retrieve the verdict from Sublime's Autonomous Security Analyst for a message.
    - `messageId` (required): ID of the message.

List mailboxes
:   List the mailboxes protected by Sublime Security, with active state and subscription health.
    - `active` (optional): Only return actively protected mailboxes.
    - `search` (optional): Search across mailbox names and email addresses.
    - `limit` (optional): Maximum mailboxes to return (1-500, default 20). `offset` (optional): Zero-based pagination offset.

Quarantine message groups
:   Quarantine one or more message groups, removing the messages from user mailboxes and catching late-arriving copies. Requires a Sublime Enterprise plan. Returns a `task_id`.
    - `messageGroupIds` (required): Canonical IDs of the groups to quarantine (1-500).
    - `classification` (optional): For example, `malicious`. `reportLabel` (optional): For example, `phishing`.
    - `reviewComment` (optional): Comment recorded in the Sublime audit trail.

Trash message groups
:   Move all messages in one or more message groups to trash. Same parameters as quarantine. Returns a `task_id`.

Restore message groups
:   Restore previously quarantined or trashed message groups back to user mailboxes. Same parameters as quarantine. Returns a `task_id`.

Get task
:   Retrieve the status of an asynchronous task (`pending`, `started`, `succeeded`, `failed`, or `retrying`). Quarantine, trash, and restore run asynchronously. Poll this action with the returned `task_id` to confirm the outcome.
    - `taskId` (required): The task ID.

## Connector networking configuration [sublime-security-connector-networking-configuration]

Use the [action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.
