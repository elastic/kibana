---
navigation_title: "Slack (Elastic app)"
type: reference
description: "Use the Slack (Elastic app) connector to post messages to Slack channels connected to your deployment, without managing a Slack token or webhook."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Slack (Elastic app) connector [elastic-apps-slack-action-type]

The Slack (Elastic app) connector posts messages to Slack channels through the Elastic Slack app that your deployment has installed. Unlike the [Slack](/reference/connectors-kibana/slack-action-type.md) connector, it holds no Slack credentials of its own: the Slack token is held by Elastic's Relay service, which only lets a deployment post to the channels that deployment has connected.

## Overview

This connector is created for you. Once you install the Elastic Slack app and connect at least one channel, a single connector instance named **Slack (Elastic app)** becomes available to rules and workflows. There is no connector creation form, no token to rotate, and no webhook URL to store.

The connector can only reach **connected channels** — channels that a user has invited `@Elastic` to and connected from the Slack app settings. A message to any other channel is rejected, even if the workspace's Slack app can technically see that channel.

::::{note}
The connector exists only while the Elastic Slack app is connected. Disconnecting the app removes it, and any rule or workflow referencing it stops sending until the app is reconnected.
::::

## Connect the Elastic Slack app [elastic-apps-slack-connect-app]

1. In {{kib}}, go to **Streams > Significant events > Settings**, and connect the Slack app. This starts a Slack OAuth flow and installs the Elastic app into your workspace.
2. In Slack, invite `@Elastic` to each channel you want to post to.
3. Back in the settings, connect those channels.

Each connected channel becomes selectable in the rule form and in the workflow YAML editor.

## Available actions [elastic-apps-slack-available-actions]

| Action | Description |
|--------|-------------|
| `sendMessage` | Post a message to a connected channel. Parameters: `channel` (required), `text` (required), `threadTs`. |
| `listChannels` | List the channels connected to this deployment, as `{ id, name }` pairs. No parameters. |

`channel` must be a channel **ID** (for example `C0123456789`), not a channel name — the Relay resolves your deployment's channel binding by ID. Both the rule form channel picker and the YAML editor's channel suggestions write the ID for you.

`sendMessage` returns a `ref` for the posted message; pass it back as `threadTs` to reply in the same thread.

## Use in workflows [elastic-apps-slack-workflows]

```yaml
- name: notify_slack
  type: elastic_apps_slack.sendMessage
  connector-id: elastic-apps-slack
  with:
    channel: "C0123456789"
    text: "Alert fired: {{ event.alerts[0].kibana.alert.reason }}"
```

## Connector networking configuration [elastic-apps-slack-connector-networking-configuration]

Calls go to the Relay service configured by `xpack.actions.relay`, not directly to Slack. The Relay host must be reachable from {{kib}} and permitted by [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings).
