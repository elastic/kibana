---
navigation_title: "{{hive}}"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/thehive-action-type.html
applies_to:
  stack: all
  serverless:
    observability: ga
    security: ga
---

# {{hive}} connector and action [thehive-action-type]

{{hive}} connector uses the [{{hive}} (v1) REST API](https://docs.strangebee.com/thehive/api-docs/) to create cases and alerts. [8.16.0]

::::{note}
If you use this connector with [cases](docs-content://explore-analyze/alerts-cases/cases.md), the status values differ in {{kib}} and {{hive}}. The status values are not synchronized when you update a case.
::::

## Create connectors in {{kib}} [define-thehive-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you're creating a rule. For example:

:::{image} ../images/thehive-connector.png
:alt: {{hive}} connector
:screenshot:
:::

### Connector configuration [thehive-connector-configuration]

{{hive}} connectors have the following configuration properties:

Name
:   The name of the connector.

Organisation
:   The organisation in {{hive}} that will contain the cases or alerts.

URL
:   The instance URL in {{hive}}.

API key
:   The API key for authentication in {{hive}}.

## Test connectors [thehive-action-configuration]

You can test connectors for creating a case or an alert with the [run connector API](https://www.elastic.co/docs/api/doc/kibana/v8/group/endpoint-connectors) or as you're creating or editing the connector in {{kib}}. For example:

:::{image} ../images/thehive-params-case-test.png
:alt: {{hive}} case params test
:screenshot:
:::

:::{image} ../images/thehive-params-alert-test.png
:alt: {{hive}} alert params test
:screenshot:
:::

{{hive}} actions have the following configuration properties.

Event action
:   The action that will be performed in {{hive}}: create a case or an alert.

Title
:   The title of the incident.

Description
:   The details about the incident.

Severity
:   The severity of the incident: `LOW`, `MEDIUM`, `HIGH` or `CRITICAL`.

    ::::{note}
    While creating an alert, use the Keep severity from rule toggle to create an alert with the rule's severity. If the rule does not have a defined severity, the alert will have the default MEDIUM severity.
    ::::

TLP
:   The traffic light protocol designation for the incident: `CLEAR`, `GREEN`, `AMBER`, `AMBER+STRICT` or `RED`.

Tags
:   The keywords or tags for the incident.

Additional comments
:   Additional information about the incident.

Type
:   The type of alert.

Source
:   The source of the alert.

Source reference
:   A source reference for the alert.

Body
:   A Json payload specifying additional parameter, such as observables and procedures. For example:

    ```json
    {
      "observables": [
        {
          "dataType": "url",
          "data": "<EXAMPLE_URL>"
        }
      ],
      "procedures": [
        {
          "patternId": "TA0001",
          "occurDate": 1640000000000,
          "tactic": "tactic-name"
        }
      ]
    }
    ```

## Connector networking configuration [thehive-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Configure {{hive}} [configure-thehive]

To generate an API key in {{hive}}:

1. Log in to your {{hive}} instance.
2. Open profile tab and select the settings.
3. Go to **API Key**.
4. Click **Create** if no API key has been created previously; otherwise, you can view the API key by clicking on **Reveal**.
5. Copy the **API key** value to configure the connector in {{kib}}.
