---
navigation_title: "Swimlane"
type: reference
description: "Use the Swimlane connector to create Swimlane records from rule actions and cases."
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/swimlane-action-type.html
applies_to:
  stack: all
  serverless:
    observability: ga
    security: ga
---

# Swimlane connector [swimlane-action-type]

The Swimlane connector uses the [Swimlane REST API](https://swimlane.com/knowledge-center/docs/developer-guide/rest-api/) to create Swimlane records.

## Create connectors in {{kib}} [define-swimlane-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you're creating a rule. For example:

:::{image} ../images/swimlane-connector.png
:alt: Swimlane connector
:screenshot:
:::

### Connector configuration [swimlane-connector-configuration]

Swimlane connectors have the following configuration properties:

Name
:   The name of the connector.

URL
:   Swimlane instance URL.

Application ID
:   Swimlane application ID.

API token
:   Swimlane API authentication token for HTTP basic authentication.

## Test connectors [swimlane-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. For example:

:::{image} ../images/swimlane-params-test.png
:alt: Swimlane params test
:screenshot:
:::

Swimlane actions have the following configuration properties.

Comments
:   Additional information for the client, such as how to troubleshoot the issue.

Severity
:   The severity of the incident.

::::{note}
Alert ID and Rule Name are filled automatically. Specifically, Alert ID is set to `{{alert.id}}` and Rule Name to `{{rule.name}}`.
::::

## Connector networking configuration [swimlane-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.
