---
navigation_title: "{{bedrock}}"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/bedrock-action-type.html
applies_to:
  stack: all
  serverless: all
---
# {{bedrock}} connector and action [bedrock-action-type]

The {{bedrock}} connector uses [axios](https://github.com/axios/axios) to send a POST request to {{bedrock}}.

## Create connectors in {{kib}} [define-bedrock-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.  For example:

:::{image} ../images/bedrock-connector.png
:alt: {{bedrock}} connector
:screenshot:
:::

### Connector configuration [bedrock-connector-configuration]

{{bedrock}} connectors have the following configuration properties:

Name
:   The name of the connector.

API URL
:   The {{bedrock}} request URL.

Region
:   (Optional) The AWS region used for request signing. Required when using a custom endpoint URL that does not include the region in the hostname (for example, `us-east-1`).

Default model
:   The GAI model for {{bedrock}} to use. Current support is for the Anthropic Claude models, defaulting to Claude 2. The model can be set on a per request basis by including a "model" parameter alongside the request body.

Access Key
:   The AWS access key for authentication.

Secret
:   The secret for authentication.

## Test connectors [bedrock-action-configuration]

You can test connectors as you’re creating or editing the connector in {{kib}}. For example:

:::{image} ../images/bedrock-params.png
:alt: {{bedrock}} params test
:screenshot:
:::

The {{bedrock}} actions have the following configuration properties.

Body
:   A stringified JSON payload sent to the {{bedrock}} Invoke Model API URL. For example:

    ```text
    {
      body: JSON.stringify({
            prompt: `${combinedMessages} \n\nAssistant:`,
            max_tokens_to_sample: 300,
            stop_sequences: ['\n\nHuman:']
      })
    }
    ```

Model
:   An optional string that will overwrite the connector’s default model. For

## Connector networking configuration [bedrock-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.
