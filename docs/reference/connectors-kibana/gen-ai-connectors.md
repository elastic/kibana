---
navigation_title: GenAI
---
# Generative AI connectors

Use these connectors to connect to third-party large language model (LLM) services and Elastic's own LLM offerings.

## Available connectors

:::{include} _snippets/gen-ai-connectors-list.md
:::

::::{important}
Connecting to LLM providers through a proxy is in technical preview. If you use a proxy, it should support streaming and be SSE-compatible. Elastic only parses streamed responses.

To check if problems are caused by using a proxy, you can test your LLM service without using a proxy.
::::