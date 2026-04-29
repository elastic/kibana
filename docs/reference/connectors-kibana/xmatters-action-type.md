---
navigation_title: "xMatters"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/xmatters-action-type.html
applies_to:
  stack: all
  serverless:
    observability: ga
    security: ga
---

# xMatters connector and action [xmatters-action-type]

The xMatters connector uses the [xMatters Workflow for Elastic](https://help.xmatters.com/integrations/#cshid=Elastic) to send actionable alerts to on-call xMatters resources.

## Create connectors in {{kib}} [define-xmatters-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you're creating a rule. You must choose between basic and URL authentication for the requests.

:::{image} ../images/xmatters-connector-basic.png
:alt: xMatters connector with basic authentication
:screenshot:
:::

:::{image} ../images/xmatters-connector-url.png
:alt: xMatters connector with url authentication
:screenshot:
:::

### Connector configuration [xmatters-connector-configuration]

xMatters connectors have the following configuration properties:

Name
:   The name of the connector.

Authentication Type
:   The type of authentication used in the request made to xMatters.

URL
:   The request URL for the Elastic Alerts trigger in xMatters. If you are using URL authentication, include the API key in the URL. For example, `https://example.com?apiKey=1234-abcd`. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.

Username
:   Username for HTTP basic authentication.

Password
:   Password for HTTP basic authentication.

## Test connectors [xmatters-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. For example:

:::{image} ../images/xmatters-params-test.png
:alt: xMatters params test
:screenshot:
:::

xMatters rules have the following properties:

Severity
:   Severity of the rule.

Tags
:   Comma-separated list of tags for the rule as provided by the user in Elastic.

## Connector networking configuration [xmatters-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Configure xMatters [xmatters-benefits]

By integrating with xMatters, you can:

1. Leverage schedules, rotations, escalations, and device preferences to quickly engage the right resources.
2. Allow resolvers to take immediate action with customizable notification responses, including incident creation.
3. Reduce manual tasks so teams can streamline their resources and focus.

### Prerequisites [xmatters-connector-prerequisites]

To use the Elastic xMatters connector either install the Elastic workflow template, or add the Elastic Alerts trigger to one of your existing xMatters flows. Once the workflow or trigger is in your xMatters instance, configure Elastic to send alerts to xMatters.

1. In xMatters, double-click the Elastic trigger to open the settings menu.
2. Choose the authentication method and set your authenticating user.
3. Copy the initiation URL.
4. In Elastic, open the xMatters connector.
5. Set the authentication method, then paste the initiation URL.

Note: If you use basic authentication, specify the Web / App Login ID in the user credentials for the connector. This value can be found in the Edit Profile modal in xMatters for each user. For detailed configuration instructions, see [xMatters online help](https://help.xmatters.com/ondemand/#cshid=ElasticTrigger)
