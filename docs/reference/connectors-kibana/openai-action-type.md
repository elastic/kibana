---
navigation_title: "OpenAI"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/openai-action-type.html
applies_to:
  stack: all
  serverless: all
---

# OpenAI connector and action [openai-action-type]

The OpenAI connector uses [axios](https://github.com/axios/axios) to send a POST request to an OpenAI provider, either OpenAI, Azure OpenAI, or Other (OpenAI-compatible service).

## Create connectors in {{kib}} [define-gen-ai-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.  For example:

:::{image} ../images/gen-ai-connector.png
:alt: OpenAI connector
:screenshot:
:::

::::{important}
Elastic provides no official support for connecting to the Azure OpenAI service through a proxy. However if you must use a proxy, ensure that the proxy supports streaming and is SSE-compatible. Elastic will only parse streamed responses.

To validate that your connectivity problems are caused by using a proxy, you can attempt to set up the connector and access the Azure OpenAI service without using a proxy.
::::

### Connector configuration [openai-connector-configuration]

OpenAI connectors have the following configuration properties:

Name
:   The name of the connector.

OpenAI provider
:   The OpenAI API provider, either OpenAI, Azure OpenAI, or Other (OpenAI-compatible service).

URL
:   The OpenAI request URL.

Default model
:   The default model to use for requests. This is required when the provider is `Other` and optional when the provider is `OpenAI`.

API key
:   The OpenAI, Azure OpenAI, or Other provider API key for authentication.

PKI Authentication (Other provider only)
:   When using the Other provider type, you can configure PKI authentication with the following options:

    Certificate file
    :   Path to the PKI certificate file (.pem) or array of paths.

    Certificate data
    :   PEM-encoded certificate content.

    Private key file
    :   Path to the PKI private key file (.pem) or array of paths.

    Private key data
    :   PEM-encoded private key content.

    CA file
    :   Path to the CA certificate file (.pem) or array of paths.

    CA data
    :   PEM-encoded CA certificate content.

    Verification mode
    :   SSL verification mode for PKI authentication. Options are:
        - `full`: Verify the server's certificate and hostname (default)
        - `certificate`: Verify only the server's certificate
        - `none`: Skip verification

## Test connectors [gen-ai-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. For example:

:::{image} ../images/gen-ai-params-test.png
:alt: OpenAI params test
:screenshot:
:::

The OpenAI actions have the following configuration properties.

Body
:   A JSON payload sent to the OpenAI API URL. For example:

    ```text
    {
      "model": "gpt-3.5-turbo",
      "messages": [
        {
          "role": "user",
          "content": "Hello world"
        }
      ]
    }
    ```

## Connector networking configuration [openai-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Token usage dashboard [openai-connector-token-dashboard]

Once you've created a OpenAI connector, you can monitor its token usage using the **OpenAI Token Usage** dashboard. Select the connector in **{{stack-manage-app}}** > **{{connectors-ui}}** to view its details, then click the **View OpenAI Usage Dashboard for "*<Name>*" Connector** link to open the dashboard.

::::{note}
To view the dashboard, you need at least `read` and `view_index_metadata` privileges for the `.kibana-event-log-*` index and the `Read` feature privilege for {{kib}}. You can set up a role with these minimum privileges and assign it to non-admin users who need to view this dashboard.
::::
