---
navigation_title: "D3 Security"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/d3security-action-type.html
applies_to:
  stack: all
  serverless:
    observability: ga
    security: ga
---

# D3 Security connector and action [d3security-action-type]

The D3 Security connector uses [axios](https://github.com/axios/axios) to send a POST request to a D3 Security endpoint. You can use the connector for rule actions.

To create this connector, you must first configure a webhook key in your D3 SOAR environment. For configuration tips, refer to [Configure D3 Security](#configure-d3security).

## Create connectors in {{kib}} [define-d3security-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.  For example:

:::{image} ../images/d3security-connector.png
:alt: D3 Security connector
:screenshot:
:::

### Connector configuration [d3security-connector-configuration]

D3 Security connectors have the following configuration properties:

Name
:   The name of the connector.

URL
:   The D3 Security API request URL.

Token
:   The D3 Security token.

## Test connectors [d3security-action-configuration]

You can test connectors as you’re creating or editing the connector in {{kib}}. For example:

:::{image} ../images/d3security-params-test.png
:alt: D3 Security params test
:screenshot:
:::

The D3 Security actions have the following configuration properties.

Body
:   A typeless payload sent to the D3 Security API URL. For example:

    ```text
    this can be any type, it is not validated
    ```

## Connector networking configuration [d3security-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Configure D3 Security [configure-d3security]

To generate an API URL and a token in D3 Security:

1. Log in to your D3 SOAR environment.
2. Navigate to **Configuration**.
3. Navigate to **Integration**. Search for {{kib}}. Click **Fetch Event**.
4. Select the **Enable Webhook** checkbox.
5. Click **Set up Webhook Keys**.
6. Under **Event Ingestion**, click the plus sign(+). Select the site for the webhook integration, then click **Generate**.
7. Copy the request URL and request header value to configure the connector.
