---
navigation_title: "{{ibm-r}}"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/resilient-action-type.html
applies_to:
  stack: all
  serverless:
    observability: ga
    security: ga
---

# {{ibm-r}} connector and action [resilient-action-type]

The {{ibm-r}} connector uses the [RESILIENT REST v2](https://developer.ibm.com/security/resilient/rest/) to create {{ibm-r}} incidents.

## Create connectors in {{kib}} [define-resilient-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you're creating a rule. For example:

:::{image} ../images/resilient-connector.png
:alt: {{ibm-r}} connector
:screenshot:
:::

### Connector configuration [resilient-connector-configuration]

{{ibm-r}} connectors have the following configuration properties:

API key ID
:   The authentication key ID for HTTP Basic authentication.

API key secret
:   The authentication key secret for HTTP Basic authentication.

Organization ID
:   The {{ibm-r}} organization ID.

URL
:   The {{ibm-r}} instance URL.

## Test connectors [resilient-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. For example:

:::{image} ../images/resilient-params-test.png
:alt: IBM Resilient connector test options
:screenshot:
:::

{{ibm-r}} actions have the following configuration properties.

Incident type
:   The type of the incident.

Severity
:   The severity of the incident.

Name
:   A name for the issue, used for searching the contents of the knowledge base.

Description
:   The details about the incident.

Additional comments
:   Extra information for the client, such as how to troubleshoot the issue.

Additional fields
:   Allows you to specify custom fields and their values. These fields must already exist in your {{ibm-r}} instance. 

- {applies_to}`stack: ga 9.2`: Use the JSON editor to define an object that contains custom field identifiers and their values. 
- {applies_to}`serverless: ga` {applies_to}`stack: ga 9.3`: Use the drop-down to add or remove custom fields. Define the custom fields as needed.

   ::::{note}
   Custom fields that are set when an incident is created or changed (for example, an incident is closed) won't display as an option when selecting additional fields. 
   ::::

## Connector networking configuration [resilient-connector-networking-configuration]

Use the [action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.
