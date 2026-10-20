---
navigation_title: GenAI
description: "Documentation for the Generative AI connectors, used to connect Kibana to large language model (LLM) services. The OpenAI, Amazon Bedrock, Google Gemini, and AI Connector types are deprecated."
applies_to:
  stack: deprecated 9.5
  serverless: deprecated
---
# Generative AI connectors

::::{important}
:applies_to: {"serverless": "deprecated", "stack": "deprecated 9.6+"}
The OpenAI, {{bedrock}}, {{gemini}}, and AI Connector types are deprecated. Existing connectors and their rule actions continue to work, but you can no longer create new ones by selecting **Create connector** in {{kib}}.

For new AI integrations, create an {{es}} {{infer}} endpoint with the `chat_completion` task type instead. To get started, refer to [Elastic Inference](docs-content://explore-analyze/elastic-inference.md) and [External inference](docs-content://explore-analyze/elastic-inference/external.md).
::::

These connectors connect {{kib}} to third-party large language model (LLM) services and to Elastic Managed LLMs.

## Available connectors

:::{include} _snippets/gen-ai-connectors-list.md
:::

::::{important}
Connecting to LLM providers through a proxy is in technical preview. If you use a proxy, it should support streaming and be SSE-compatible. Elastic only parses streamed responses.

To check if problems are caused by using a proxy, you can test your LLM service without using a proxy.
::::