---
navigation_title: "Rootly Alerts"
type: reference
description: "Use the Rootly Alerts connector to trigger and resolve Rootly alerts from rules."
applies_to:
  stack: preview
  serverless: preview
---

# Rootly Alerts connector and action [rootly-alerts-action-type]

The Rootly Alerts connector enables you to trigger and resolve Rootly alerts from rules. It sends events to a Rootly alert source, and Rootly alert routes decide who is paged.

To create this connector, you must have the webhook URL and the secret of a Rootly alert source. For configuration tips, refer to [Configure Rootly](#configuring-rootly-alerts).

To use Rootly in **Agent Builder** and **Workflows**, refer to the [Rootly connector](/reference/connectors-kibana/rootly-action-type.md).

## Create connectors in {{kib}} [define-rootly-alerts-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you're creating a rule. For example:

:::{image} ../images/rootly-alerts-connector.png
:alt: Rootly Alerts connector
:screenshot:
:::

### Connector configuration [rootly-alerts-connector-configuration]

Rootly Alerts connectors have the following configuration properties:

Name
:   The name of the connector. The name is used to identify a connector in the management UI connector listing, or in the connector list when configuring an action.

Webhook URL
:   The webhook URL of the Rootly alert source, without the secret. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.

Secret
:   The secret of the Rootly alert source. The connector sends it as a bearer token.

## Test connectors [rootly-alerts-action-configuration]

After you create a connector, use the **Test** tab to test its actions:

* [Resolve](#rootly-alerts-action-resolve)
* [Trigger](#rootly-alerts-action-trigger)

When you create a rule that uses a Rootly Alerts connector, you can use any of these types of actions. Rule recovery actions use the resolve action by default.

### Resolve action [rootly-alerts-action-resolve]

When you test the resolve action, you must provide the deduplication key of a Rootly alert.

### Trigger action [rootly-alerts-action-trigger]

When you test the trigger action, you must provide a title for the Rootly alert:

:::{image} ../images/rootly-alerts-trigger-test.png
:alt: Rootly Alerts params test
:screenshot:
:::

This action has the following properties:

Custom details
:   Optional additional alert data as a JSON object.

Deduplication key
:   All actions sharing this key are associated with the same Rootly alert. Use the same key to trigger and resolve an alert. In rules, it defaults to `<rule ID>:<alert ID>`. Refer to [Deduplication and recovery](#rootly-alerts-deduplication).

Description
:   An optional description of the alert. In rules, it defaults to the reason the rule gives for the alert.

Event
:   `Trigger` (default) or `Resolve`.

Labels
:   An optional list of names and values to add to the event, for example `environment` and `production`. Labels are not applied when using a generic webhook alert source.

Link
:   An optional URL to open from the alert in Rootly. In rules, it defaults to the URL of the rule.

Paging
:   How Rootly decides who is paged. With **Use alert routes** (default), Rootly uses the routes of the alert source. With **Page a specific target**, Rootly pages the target you enter directly, bypassing the alert routes.

Routing field and Routing value
:   Used with **Use alert routes**. An optional value for the routes of the alert source to match. Enter the value your Rootly alert route is configured to match. Sending a value alone does not select a paging target. The routing field is what the value names: a service, a team, a functionality, an entry in a custom catalog, or a custom value. For a custom catalog, you must also provide the slug of the catalog. In rules, the value defaults to `{{context.serviceName}}`, which is available in APM rules.

Target type and Rootly ID
:   Used with **Page a specific target**. The type of the target, which is a service, a team, an escalation policy, a user, or a functionality, and its ID in Rootly. If Rootly cannot find the target, the action fails and nobody is paged.

Title
:   The title of the alert. In rules, it defaults to the name of the rule.

Urgency
:   An optional name of a Rootly alert urgency. If it is empty, Rootly uses the default urgency of the alert source.

The connector sends a JSON body such as the following. Properties with empty values are omitted:

```json
{
  "event": "trigger",
  "dedup_key": "a611d678:checkout-api",
  "title": "Error count threshold",
  "description": "Error count is 42 in the last 5 mins for checkout-api. Alert when > 25.",
  "url": "https://kibana.example.com/app/observability/alerts/rules/a611d678",
  "urgency": "High",
  "service": "checkout-api",
  "labels": { "environment": "production" },
  "custom": { "runbook": "https://example.com/runbook" },
  "kibana": {
    "rule_id": "a611d678",
    "rule_name": "Error count threshold",
    "alert_id": "checkout-api",
    "space": "default",
    "url": "https://kibana.example.com/app/observability/alerts/rules/a611d678",
    "evaluation_time": "2026-11-17T14:02:11Z"
  }
}
```

The routing value is sent as one of `service`, `team`, `functionality`, `catalogs.<catalog slug>`, or `routing_key`. A specific target is sent in its place:

```json
{
  "rootly": {
    "notification_target": { "type": "EscalationPolicy", "id": "5d7f6c0e-3a41-4c8b-9f0e-2b1a7c9d4e11" }
  }
}
```

The target type is one of `Service`, `Group`, `EscalationPolicy`, `User`, or `Functionality`. Resolve events contain only `event` and `dedup_key`.

To check the body for an action, expand **Payload preview** in the action form.

## Deduplication and recovery [rootly-alerts-deduplication]

Rootly matches a resolve event to an alert by its deduplication key. A recovery action resolves a Rootly alert only when it sends the key that the trigger used.

The connector chooses the key of a trigger in this order:

1. The deduplication key of the action. In the rule form, it defaults to `{{rule.id}}:{{alert.id}}` for the trigger action and for the recovery action.
2. `<rule ID>:<alert ID>`, when the action has both IDs. Actions added in the rule form have them. Actions created through the API have them only if you set `ruleId` and `alertId`.
3. A new key for each execution. Automatic recovery requires a stable key shared by the trigger and recovery actions.

When you create rule actions through the API, set `dedupKey` to the same value in the trigger action and in the recovery action.

To create separate alerts from multiple actions using the same Rootly alert source, give each action a distinct deduplication key. Use the same key in its recovery action.

A summary action reports all alerts of a rule in one notification. In a summary action the alert ID is the rule ID, so all summaries of a rule are added to one Rootly alert. A summary action does not send a resolve event.

Rules that have no recovery action, such as security detection rules, do not resolve the Rootly alert. Resolve it in Rootly.

## Connector networking configuration [rootly-alerts-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Configure Rootly [configuring-rootly-alerts]

To set up Rootly:

1. In Rootly, create an alert source that accepts a generic webhook.
2. Set up the alert source to read the event:

    * Map the alert title to `$.title`, the description to `$.description`, and the link to `$.url`.
    * Turn on deduplication with `$.dedup_key` as the key.
    * Resolve the alert when `$.event` is `resolve`, matched on `$.dedup_key`.
    * Optionally, add urgency rules that match `$.urgency`.

3. Add an alert route for the alert source. Actions that page a specific target do not use it. To page the service, team, functionality, or catalog entry that {{kib}} sends, use a rule that matches `$.service`, `$.team`, `$.functionality`, or `$.catalogs.<catalog slug>` to the catalog. Add a fallback rule for alerts that match nothing.
4. Copy the webhook URL and the secret of the alert source for use when you configure the connector in {{kib}}.
