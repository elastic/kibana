---
navigation_title: GenAI
---
# Generative AI connectors

Use these connectors to connect to third-party large language model (LLM) services and Elastic's own LLM offerings.

## Available connectors

::::{important}
:applies_to: {"stack": "deprecated 9.5, removed 9.6", "serverless": "removed"}
The Azure OpenAI, {{bedrock}}, and {{gemini}} connectors are deprecated. Existing connectors and rule actions that use them continue to work but display deprecation indicators. Follow the guidance that matches your version and deployment type:

- {applies_to}`serverless: removed` {applies_to}`stack: removed 9.6` You cannot create new LLM connectors through the standard connector UI.
- {applies_to}`stack: deprecated 9.5` For new AI integrations, use {{es}} {{infer}} endpoints instead of LLM connectors. Plan migration of existing LLM connectors and any rule actions that reference them before future removal.
::::

:::{include} _snippets/gen-ai-connectors-list.md
:::

::::{important}
Connecting to LLM providers through a proxy is in technical preview. If you use a proxy, it should support streaming and be SSE-compatible. Elastic only parses streamed responses.

To check if problems are caused by using a proxy, you can test your LLM service without using a proxy.
::::