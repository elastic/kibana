---
navigation_title: "Microsoft Defender for Endpoint"
applies_to:
  stack: ga
  serverless:
    observability: ga
    security: ga
---
# Microsoft Defender for Endpoint connector and action

The Microsoft Defender for Endpoint connector enables you to perform actions on Microsoft Defender-enrolled hosts.

## Create connectors in {{kib}}

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you're creating a rule. For example:

:::{image} ../images/defender-connector.png
:alt: Microsoft Defender for Endpoint connector
:screenshot:
:::

### Connector configuration

Microsoft Defender for Endpoint connectors have the following configuration properties:

API URL
:   The URL of the Microsoft Defender for Endpoint API. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.

Application client ID
:   The application (client) identifier for your app in the Azure portal.

Client secret value
:   The client secret for your app in the Azure portal.

Name
:   The name of the connector.

OAuth Scope
:   The OAuth scopes or permission sets for the Microsoft Defender for Endpoint API.

OAuth Server URL
:   The OAuth server URL where authentication is sent and received for the Microsoft Defender for Endpoint API.

Tenant ID
:   The tenant identifier for your app in the Azure portal.

## Test connectors

You can test connectors as you're creating or editing the connector in {{kib}}.
For example:

:::{image} ../images/defender-connector-test.png
:alt: Microsoft Defender for Endpoint connector test
:screenshot:
:::

## Configure Microsoft Defender for Endpoint

Before you create the connector, you must create a new application on your Azure domain.
The procedure to create an application is found in the [Microsoft Defender documentation](https://learn.microsoft.com/en-us/defender-endpoint/api/exposed-apis-create-app-webapp).

Make note of the client ID, client secret, and tenant ID, since you must provide this information when you create your connector.

<!-- TBD: Are there minimal API permissions required? -->