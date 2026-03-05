---
navigation_title: "Firecrawl"
type: reference
description: "Use the Firecrawl connector to scrape web pages, search the web, map site URLs, and crawl websites using the Firecrawl REST API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Firecrawl connector [firecrawl-action-type]

The Firecrawl connector uses the [Firecrawl REST API v2](https://docs.firecrawl.dev/api-reference/v2-introduction) to scrape web pages, search the web, map site URLs, and crawl websites. It supports Bearer token (API key) authentication.

## Create connectors in {{kib}} [define-firecrawl-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [firecrawl-connector-configuration]

Firecrawl connectors have the following configuration properties:

API Key (Bearer token)
:   Your Firecrawl API key for authentication. Provide it as the Bearer token when creating or editing the connector. The connector sends it in the `Authorization: Bearer <key>` header to `https://api.firecrawl.dev`.


## Test connectors [firecrawl-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The Firecrawl connector has the following actions:

scrape
:   Scrape a single URL and extract content (for example, markdown or HTML).
    - **url** (required): The URL to scrape.
    - **formats** (optional): Output formats: `markdown`, `html`, `links`, `screenshot`, `extract`. Defaults to markdown.
    - **onlyMainContent** (optional): Return only main content, excluding nav/footer. Defaults to true.
    - **waitFor** (optional): Delay in milliseconds before fetching (useful for JS-rendered pages).

search
:   Search the web and optionally get full content from results.
    - **query** (required): Search query string.
    - **limit** (optional): Maximum number of results (1–100). Defaults to 5.

map
:   Map a website to discover indexed URLs.
    - **url** (required): Base URL to map.
    - **search** (optional): Search term to filter/order URLs by relevance.
    - **limit** (optional): Maximum URLs to return. Defaults to 5000.
    - **includeSubdomains** (optional): Include subdomains. Defaults to true.
    - **ignoreQueryParameters** (optional): Dedupe by path only. Defaults to true.

crawl
:   Start an asynchronous crawl of a website. Returns a job ID; use **getCrawlStatus** to poll for results.
    - **url** (required): Base URL to start crawling from.
    - **limit** (optional): Maximum pages to crawl. Defaults to 100.
    - **maxDiscoveryDepth** (optional): Maximum discovery depth.
    - **allowExternalLinks** (optional): Follow external links. Defaults to false.

getCrawlStatus
:   Get the status and results of a crawl job.
    - **id** (required): The crawl job ID (UUID) returned from the **crawl** action.


## Get API credentials [firecrawl-api-credentials]

To use the Firecrawl connector, you need to:

1. Sign up at [Firecrawl](https://www.firecrawl.dev) or log in to your account.
2. Open [API keys](https://www.firecrawl.dev/app/api-keys) in the Firecrawl dashboard.
3. Create an API key or copy an existing one (for example, `fc-...`).
4. In Kibana, when creating or editing the Firecrawl connector, provide this key as the Bearer token (API key / secret).

Rate limits and billing depend on your Firecrawl plan. Check [Firecrawl billing](https://docs.firecrawl.dev/billing) for details.
