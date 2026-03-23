---
navigation_title: "Jira Service Management"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/jsm-action-type.html
applies_to:
  stack: ga 9.2
  serverless:
    observability: ga
    security: ga
---

# Jira Service Management connector and action [jsm-action-type]

An {{jsm}} connector enables you to create and close alerts in {{jsm}}. In particular, it uses the [{{jsm}} Integration Events API](https://developer.atlassian.com/cloud/jira/service-desk-ops/rest/v1/api-group-integration-events/#api-group-integration-events).

To create this connector, you must have a valid {{jsm}} URL and API key. For configuration tips, refer to [Configure a Jira Service Management account](#configuring-jsm).

## Create connectors in {{kib}} [define-jsm-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you're creating a rule. For example:

:::{image} ../images/jsm-connector.png
:alt: Jira Service Management connector
:screenshot:
:::

### Connector configuration [jsm-connector-configuration]

Jira Service Management connectors have the following configuration properties:

Name
:   The name of the connector. The name is used to identify a connector in the management UI connector listing, or in the connector list when configuring an action.

URL
:   The Jira Service Management URL. For example, [https://api.atlassian.com](https://api.atlassian.com).

    ::::{note}
    If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.
    ::::

API Key
:   The Jira Service Management API authentication key for HTTP basic authentication. For more details about generating Jira Service Management API keys, refer to [Jira Service Management documentation](https://support.atlassian.com/jira-service-management-cloud/docs/set-up-an-api-integration/#Set-up-the-integration).

## Test connectors [jsm-action-configuration]

After you create a connector, use the **Test** tab to test its actions:

* [Create alert](#jsm-action-create-alert-configuration)
* [Close alert](#jsm-action-close-alert-configuration)

### Create alert action [jsm-action-create-alert-configuration]

When you create a rule that uses an {{jsm}} connector, its actions (with the exception of recovery actions) create {{jsm}} alerts. You can test this type of action when you create or edit your connector:

:::{image} ../images/jsm-create-alert-test.png
:alt: {{jsm}} create alert action test
:screenshot:
:::

You can configure the create alert action through the form view or using a JSON editor.

#### Form view [jsm-action-create-alert-form-configuration]

The create alert action form has the following configuration properties.

Message
:   The message for the alert (required).

Jira Service Management tags
:   The tags for the alert (optional).

Priority
:   The priority level for the alert (optional).

Description
:   A description that provides detailed information about the alert (optional).

Alias
:   The alert identifier, which is used for alert deduplication in Jira Service Management. For more information, refer to the [Jira Service Management documentation](https://support.atlassian.com/jira-service-management-cloud/docs/what-is-alert-deduplication/) (optional).

Entity
:   The domain of the alert (optional).

Source
:   The source of the alert (optional).

User
:   The display name of the owner (optional).

Note
:   Additional information for the alert (optional).

#### JSON editor [jsm-action-create-alert-json-configuration]

A JSON editor is provided as an alternative to the form view and supports additional fields not shown in the form view. The JSON editor supports all of the forms configuration properties but as lowercase keys as [described in the Jira Service Management API documentation](https://developer.atlassian.com/cloud/jira/service-desk-ops/rest/v1/api-group-integration-events/#api-jsm-ops-integration-v2-alerts-post). The JSON editor supports the following additional properties:

responders
:   The entities to receive notifications about the alert (optional).

visibleTo
:   The teams and users that the alert will be visible to without sending a notification to them (optional).

actions
:   The custom actions available to the alert (optional).

details
:   The custom properties of the alert (optional).

$$$jsm-action-create-alert-json-example-configuration$$$
Example JSON editor contents

```json
{
  "message": "An example alert message",
  "alias": "Life is too short for no alias",
  "description":"Every alert needs a description",
  "responders":[
      {"id":"4513b7ea-3b91-438f-b7e4-e3e54af9147c", "type":"team"},
      {"id":"bb4d9938-c3c2-455d-aaab-727aa701c0d8", "type":"user"},
      {"id":"aee8a0de-c80f-4515-a232-501c0bc9d715", "type":"escalation"},
      {"id":"80564037-1984-4f38-b98e-8a1f662df552", "type":"schedule"}
  ],
  "visibleTo":[
      {"id":"4513b7ea-3b91-438f-b7e4-e3e54af9147c","type":"team"},
      {"id":"bb4d9938-c3c2-455d-aaab-727aa701c0d8","type":"user"}
  ],
  "actions": ["Restart", "AnExampleAction"],
  "tags": ["OverwriteQuietHours","Critical"],
  "details":{"key1":"value1","key2":"value2"},
  "entity":"An example entity",
  "priority":"P1"
}
```

### Close alert action [jsm-action-close-alert-configuration]

When you create a rule that uses an {{jsm}} connector, its recovery actions close {{jsm}} alerts. You can test this type of action when you create or edit your connector:

:::{image} ../images/jsm-close-alert-test.png
:alt: {{jsm}} close alert action test
:screenshot:
:::

The close alert action has the following configuration properties.

Alias
:   The alert identifier, which is used for alert deduplication in Jira Service Management (required). The alias must match the value used when creating the alert. For more information, refer to the [Jira Service Management documentation](https://support.atlassian.com/jira-service-management-cloud/docs/what-is-alert-deduplication/).

Note
:   Additional information for the alert (optional).

Source
:   The display name of the source (optional).

User
:   The display name of the owner (optional).

## Connector networking configuration [jsm-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Configure a Jira Service Management account [configuring-jsm]

After obtaining an Jira Service Management instance, configure the API integration. For details, refer to the [Jira Service Management documentation](https://support.atlassian.com/jira-service-management-cloud/docs/set-up-an-api-integration/#Set-up-the-integration).

1. Go to the **Operations** > **Overview** dashboard, then select the appropriate team.

   :::{image} ../images/jsm-operations-overview.png
   :alt: Jira Service Management Operations overview
   :screenshot:
   :::

2. Select the **Integrations** menu item, then select **Add integration**.

   :::{image} ../images/jsm-integrations.png
   :alt: Jira Service Management integrations
   :screenshot:
   :::

3. Search for `API` and select the **API** integration.

   :::{image} ../images/jsm-add-api-integration.png
   :alt: Jira Service Management API integration
   :screenshot:
   :::

4. Configure the integration. Ensure you record the **API Key**. You will later use this key to populate the **API Key** field when creating the Kibana Jira Service Management connector. 

5. Select **Turn on integration** after you finish configuring the integration.

   :::{image} ../images/jsm-turn-on-integration.png
   :alt: Jira Service Management turn on integration
   :screenshot:
   :::
