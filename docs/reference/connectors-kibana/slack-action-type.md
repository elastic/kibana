---
navigation_title: "Slack"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/slack-action-type.html
applies_to:
  stack: all
  serverless: all
---

# Slack connector and action [slack-action-type]

The Slack connector uses incoming webhooks or an API method to send Slack messages.

## Create connectors in {{kib}} [define-slack-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you're creating a rule. You can choose to use a webhook URL that's specific to a single channel. For example:

:::{image} ../images/slack-webhook-connector.png
:alt: Slack connector
:screenshot:
:::

Alternatively, you can create a connector that supports multiple channels. For example:

:::{image} ../images/slack-api-connector.png
:alt: Slack API connector
:screenshot:
:::

If you use the latter method, you must provide a valid list of Slack channel IDs. When you create a rule, each action can communicate with one of these channels.

For Slack setup details, go to [Configure a Slack account](#configuring-slack).

## Test connectors [slack-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. For the webhook type of connector, its message text cannot contain Markdown, images, or other advanced formatting:

:::{image} ../images/slack-webhook-params.png
:alt: Slack webhook connector test
:screenshot:
:::

For the web API type of connector, you must choose one of the channel IDs. You can then test either plain text or block kit messages:

:::{image} ../images/slack-api-connector-test.png
:alt: Slack web API connector test
:screenshot:
:::

After you add block kit messages you can click a link to preview them in the Slack block kit builder.

## Connector networking configuration [slack-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Configure a Slack account [configuring-slack]

Before you can create a Slack connector, you must configure your account and obtain the necessary URL or token.

### Configure a Slack account for incoming webhooks [configuring-slack-webhook]

1. Log in to [slack.com](http://slack.com) as a team administrator.
2. Create a Slack app, enable incoming webhooks, then create an incoming webhook. Refer to [https://api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks).
3. Copy the generated webhook URL so you can paste it into your Slack connector form.
4. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname from the URL is added to the allowed hosts.

### Configure a Slack account for Web API [configuring-slack-web-api]

1. Create a Slack app. Refer to [https://api.slack.com/authentication/basics#creating](https://api.slack.com/authentication/basics#creating).
2. Add scope: `channels:read`, `groups:read`, `chat:write` and `chat:write.public`. Refer to [https://api.slack.com/authentication/basics#scopes](https://api.slack.com/authentication/basics#scopes).
3. Install the app to a workspace. Refer to [https://api.slack.com/authentication/basics#installing](https://api.slack.com/authentication/basics#installing).
4. Copy the `Bot User OAuth Token` so you can paste it into your Slack connector form.
5. If you need to send messages to a private channel, you need to write `/invite @App_name` in it. Putting "@" triggers Slack to start auto-suggesting, which is why it then becomes easy to find your app name in the list.
6. To find a channel ID (for example, `C123ABC456`), view the channel details.
