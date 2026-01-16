---
navigation_title: "Brave Search"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/brave-search-action-type.html
applies_to:
  stack: preview 9.3
  serverless: preview
---

# Brave Search connector [brave-search-action-type]

The Brave Search connector communicates with the Brave Search API to search the web for privacy-focused results.

## Create connectors in {{kib}} [define-brave-search-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [brave-search-connector-configuration]

Brave Search connectors have the following configuration properties:

API Key
:   The Brave Search API key for authentication. This key should be provided in the `X-Subscription-Token` header.

## Test connectors [brave-search-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The Brave Search connector has the following action:

Web Search
:   Search the web using Brave Search API.
    - **Query** (required): The search query string.
    - **Count** (optional): Number of results to return (1-20, default: 10).
    - **Offset** (optional): Result offset for pagination (default: 0).

## Connector networking configuration [brave-search-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings.
You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [brave-search-api-credentials]

To use the Brave Search connector, you need an API key:

1. Go to [Brave Search API](https://brave.com/search/api/).
2. Sign up for an account or log in.
3. Navigate to your API dashboard.
4. Generate or copy your API key.
5. Use the API key to configure the connector in {{kib}}.
