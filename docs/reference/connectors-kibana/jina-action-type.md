---
navigation_title: "Jina Reader"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/jina-action-type.html
applies_to:
  stack: preview
  serverless: preview
---

# Jina Reader connector [jina-action-type]

The Jina Reader connector communicates with the Jina API to turn any URL to markdown, and provide web search for better LLM grounding.

## Create connectors in {{kib}} [define-jina-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [jina-connector-configuration]

Jina Reader connectors have the following configuration properties:

API Key
:   The Jina API key for authentication. 

Browse URL
:   The base URL for Jina Reader Browse feature. Default is `https://r.jina.ai`.

Search URL
:   The base URL for Jina Reader Search feature. Default is `https://s.jina.ai`.

## Test connectors [jina-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The Jina Reader connector has the following action:

Browse URL
:   Turn any URL to markdown using Jina Reader Browse API.
    - **URL** (required): The URL to browse and convert to markdown.
    - **Return Format** (optional): The format of the returned content.
    - **Additional Options** (optional): Additional advanced options. See [Reference](https://r.jina.ai/docs#tag/crawl/paths/~1%7Burl%7D/post) for details.

Web Search
:   Search the web using Jina Reader Search API.
    - **Query** (required): The search query string.
    - **Return Format** (optional): The format of the returned content.
    - **Additional Options** (optional): Additional advanced options. See [Reference](https://s.jina.ai/docs#tag/search/paths/~1%7Bq%7D/post) for details.
  
File to Markdown
:   Convert a base64-encoded file string to markdown using Jina Reader Browse API.
    - **File Content (Base64)** (required): The base64-encoded file content to convert to markdown.
    - **File Name** (optional): The name of the file including extension.
    - **Additional Options** (optional): Additional advanced options. See [Reference](https://r.jina.ai/docs#tag/crawl/paths/~1%7Burl%7D/post) for details.

File to Rendered Image
:   Convert a base64-encoded file string to image using Jina Reader Browse API.
    - **File Content (Base64)** (required): The base64-encoded file content to convert to image.
    - **File Name** (optional): The name of the file including extension.
    - **Page Number** (optional): The page number to render as an image.
    - **Additional Options** (optional): Additional advanced options. See [Reference](https://r.jina.ai/docs#tag/crawl/paths/~1%7Burl%7D/post) for details.

## Connector networking configuration [jina-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings.
You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [jina-api-credentials]

To use the Jina Reader connector, you need an API key:

1. Go to [Jina AI Website](https://jina.ai/reader).
2. Scroll to API section, and go to API Key & Billing tab. 
3. A free key may be generated for you upon visiting the page.
4. Optionally Sign up for an account or log in.
5. Navigate to [Key Manager Page](https://jina.ai/api-dashboard/key-manager).
6. Generate or copy your API key.
7. Use the API key to configure the connector in {{kib}}.
