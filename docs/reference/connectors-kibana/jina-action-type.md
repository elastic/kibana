---
navigation_title: "Jina Reader"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/jina-action-type.html
applies_to:
  stack: preview 9.4+
  serverless: preview
---

# Jina Reader connector [jina-action-type]

The Jina Reader connector communicates with the Jina API to turn web pages into markdown from their URL, and provide web search for better LLM grounding.

## Create connectors in {{kib}} [define-jina-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

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

The Jina Reader connector has the following actions:

Browse URL
:   Turn any URL to markdown using Jina Reader Browse API.
    - **URL** (required): The URL to browse and convert to markdown.
    - **Return Format** (optional): The format of the content to return.
    - **Additional Options** (optional): Additional advanced options. 
    
    Refer to [the API reference](https://r.jina.ai/docs#tag/crawl/paths/~1%7Burl%7D/post) for details on the available parameters and values.

Web Search
:   Search the web using Jina Reader Search API.
    - **Query** (required): The search query string.
    - **Return Format** (optional): The format of the content to return.
    - **Additional Options** (optional): Additional advanced options. 
    
    Refer to [the API reference](https://s.jina.ai/docs#tag/search/paths/~1%7Bq%7D/post) for details on the available parameters and values.
  
File to Markdown
:   Convert a base64-encoded file string to markdown using Jina Reader Browse API.
    - **File Content (Base64)** (required): The base64-encoded file content to convert to markdown.
    - **File Name** (optional): The name of the file including extension.
    - **Additional Options** (optional): Additional advanced options. 
    
    Refer to [the API reference](https://r.jina.ai/docs#tag/crawl/paths/~1%7Burl%7D/post) for details on the available parameters and values.

File to Rendered Image
:   Convert a base64-encoded file string to image using Jina Reader Browse API.
    - **File Content (Base64)** (required): The base64-encoded file content to convert to image.
    - **File Name** (optional): The name of the file including extension.
    - **Page Number** (optional): The page number to render as an image.
    - **Additional Options** (optional): Additional advanced options. 
    
    Refer to [the API reference](https://r.jina.ai/docs#tag/crawl/paths/~1%7Burl%7D/post) for details on the available parameters and values.

## Connector networking configuration [jina-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings.
You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [jina-api-credentials]

To use the Jina Reader connector, you need an API key:

1. Go to [Jina AI's website](https://jina.ai/reader).
2. Scroll to the **API** section, and go to the **API Key & Billing** tab. 
3. A free key may be generated for you upon visiting the page.
4. Optionally, sign up for an account or log in.
5. Navigate to the [Key Manager page](https://jina.ai/api-dashboard/key-manager).
6. Generate or copy your API key.
7. Use the API key to configure the connector in {{kib}}.
