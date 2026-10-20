---
navigation_title: GenAI
description: "Documentation for the Generative AI connectors, used to connect Kibana to large language model (LLM) services. The OpenAI, Amazon Bedrock, Google Gemini, and AI Connector types are deprecated."
---
# Generative AI connectors

::::{important}
The OpenAI, {{bedrock}}, {{gemini}}, and AI Connector types are being replaced by {{es}} {{infer}} endpoints. To configure access to an LLM provider, create an {{infer}} endpoint with the `chat_completion` task type. To get started, refer to [Elastic Inference](docs-content://explore-analyze/elastic-inference.md) and [External inference](docs-content://explore-analyze/elastic-inference/external.md).

Availability of these connector types depends on your deployment and version:

- {applies_to}`serverless: deprecated` {applies_to}`stack: deprecated 9.6+` You can no longer create new connectors of these types by selecting **Create connector** in {{kib}}. Existing connectors and their rule actions continue to work.
- {applies_to}`stack: deprecated =9.5` These connector types are still available, but deprecated.
::::

These connectors connect {{kib}} to third-party large language model (LLM) services and to Elastic Managed LLMs.

## Available connectors

:::{include} _snippets/gen-ai-connectors-list.md
:::

::::{important}
Connecting to LLM providers through a proxy is in technical preview. If you use a proxy, it should support streaming and be SSE-compatible. Elastic only parses streamed responses.

To check if problems are caused by using a proxy, you can test your LLM service without using a proxy.
::::