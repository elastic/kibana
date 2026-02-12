---
navigation_title: "Tavily"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/tavily-action-type.html
applies_to:
  stack: preview
  serverless: preview
---

# Tavily connector [tavily-action-type]

The Tavily connector uses the [Tavily API](https://docs.tavily.com) to search the web for current information and extract content from web pages. It connects via Tavily's hosted MCP server.

## Create connectors in {{kib}} [define-tavily-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [tavily-connector-configuration]

Tavily connectors have the following configuration properties:

API Key
:   The Tavily API key for authentication. This is a bearer token that starts with `tvly-`.


## Test connectors [tavily-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The Tavily connector has the following actions:

Search
:   Search the web for current information on any topic.
    - **query** (required): The search query to execute.
    - **max_results** (optional): Maximum number of results to return. Defaults to 10.
    - **search_depth** (optional): `basic`, `advanced`, `fast`, or `ultra-fast`. Advanced returns more thorough results; fast and ultra-fast optimize for lower latency.
    - **topic** (optional): Search category — `general`.
    - **include_images** (optional): Whether to include images in the response. Defaults to false.

Extract
:   Extract and retrieve content from one or more web page URLs.
    - **urls** (required): List of URLs to extract content from.
    - **extract_depth** (optional): Depth of extraction — `basic` or `advanced`. Use advanced for LinkedIn, protected sites, or tables.
    - **include_images** (optional): Whether to include images extracted from the pages. Defaults to false.

Crawl
:   Crawl a website starting from a URL, extracting content from pages with configurable depth and breadth.
    - **url** (required): The root URL to begin the crawl.
    - **max_depth** (optional): Max depth of the crawl. Defaults to 1.
    - **max_breadth** (optional): Max number of links to follow per page. Defaults to 20.
    - **limit** (optional): Total number of links to process before stopping. Defaults to 50.
    - **instructions** (optional): Natural language instructions specifying which types of pages to return.
    - **extract_depth** (optional): `basic` or `advanced`. Defaults to basic.

Map
:   Map a website's structure by returning a list of URLs found starting from a base URL.
    - **url** (required): The root URL to begin the mapping.
    - **max_depth** (optional): Max depth of the mapping. Defaults to 1.
    - **max_breadth** (optional): Max number of links to follow per page. Defaults to 20.
    - **limit** (optional): Total number of links to process before stopping. Defaults to 50.
    - **instructions** (optional): Natural language instructions for the crawler.


## Get API credentials [tavily-api-credentials]

To use the Tavily connector, you need to:

1. Create a free account at [tavily.com](https://tavily.com).
2. Navigate to the [API Keys](https://app.tavily.com/home) page in the Tavily dashboard.
3. Copy your API key (starts with `tvly-`).
4. When configuring the connector in {{kib}}, paste the API key as the bearer token.
