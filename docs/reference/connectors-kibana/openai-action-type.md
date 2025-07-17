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

| Field            | Required for         | Description                                                                                 |
|------------------|---------------------|---------------------------------------------------------------------------------------------|
| Name             | All                 | The name of the connector.                                                                  |
| OpenAI provider  | All                 | The API provider: `OpenAI`, `Azure OpenAI`, or `Other` (OpenAI-compatible service).         |
| URL              | All                 | The API endpoint URL for the selected provider.                                             |
| Default model    | OpenAI/Other        | The default model for requests. **Required** for `Other`, optional for `OpenAI`.            |
| Headers          | Optional            | Custom HTTP headers to include in requests.                                                 |
| Verification mode| Other (PKI only)    | SSL verification mode for PKI authentication. Default: `full`.                              |
| API key          | OpenAI/Azure/Other  | The API key for authentication. **Required** for `OpenAI` and `Azure OpenAI`. For `Other`, required unless PKI authentication is used. |
| PKI fields       | Other (PKI only)    | See below. Only available for `Other` provider.                                             |

#### PKI Authentication (Other provider only)

When using the `Other` provider, you can use PKI (certificate-based) authentication. With PKI, you can also optionally include an API key if your OpenAI-compatible service supports or requires one. The following fields are supported for PKI:

- **Certificate data** (`certificateData`): PEM-encoded certificate content, base64-encoded. (**Required for PKI**)
- **Private key data** (`privateKeyData`): PEM-encoded private key content, base64-encoded. (**Required for PKI**)
- **CA data** (`caData`, optional): PEM-encoded CA certificate content, base64-encoded.
- **API key** (`apiKey`, optional): The API key for authentication, if required by your service.
- **Verification mode** (`verificationMode`): SSL verification mode for PKI authentication. Options:
  - `full` (default): Verify server's certificate and hostname
  - `certificate`: Verify only the server's certificate
  - `none`: Skip verification (not recommended for production)

**Note:**
- All PKI fields must be PEM-encoded and base64-encoded when sent via API.
- If any PKI field is provided, both `certificateData` and `privateKeyData` are required and must be valid PEM.
- With PKI, you may also include an API key if your provider supports or requires it.
- If PKI is not used, `apiKey` is required for the `Other` provider.
- For `OpenAI` and `Azure OpenAI`, only `apiKey` is supported for authentication.

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
