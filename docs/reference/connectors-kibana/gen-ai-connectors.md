---
navigation_title: GenAI
applies_to:
  stack: deprecated 9.5
  serverless: deprecated
---
# Generative AI connectors

Use these connectors to connect to third-party large language model (LLM) services and Elastic's own LLM offerings.

## Available connectors

::::{important}
:applies_to: {"stack": "deprecated 9.5", "serverless": "deprecated"}
The OpenAI, {{bedrock}}, {{gemini}}, and AI Connector connectors are deprecated. Existing connectors and their rule actions continue to work.

In {{serverless-full}} and in {{stack}} 9.6 and later, {{kib}} no longer lists these connector types when you select **Create connector**. You can still create connectors of these types through the API.

For new AI integrations, create an {{es}} {{infer}} endpoint instead. To learn more, refer to [Elastic Inference](docs-content://explore-analyze/elastic-inference.md). Migrate existing LLM connectors and related rule actions before the future removal.
::::

:::{include} _snippets/gen-ai-connectors-list.md
:::

::::{important}
Connecting to LLM providers through a proxy is in technical preview. If you use a proxy, it should support streaming and be SSE-compatible. Elastic only parses streamed responses.

To check if problems are caused by using a proxy, you can test your LLM service without using a proxy.
::::