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
This connector is deprecated and is being progressively removed from the create connector UI. Existing connectors and their rule actions continue to work.

For new AI integrations, use {{es}} {{infer}} endpoints. Migrate existing LLM connectors and related rule actions before the future removal.
::::

:::{include} _snippets/gen-ai-connectors-list.md
:::

::::{important}
Connecting to LLM providers through a proxy is in technical preview. If you use a proxy, it should support streaming and be SSE-compatible. Elastic only parses streamed responses.

To check if problems are caused by using a proxy, you can test your LLM service without using a proxy.
::::