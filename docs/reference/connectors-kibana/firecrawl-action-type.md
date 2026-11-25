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

You can use this connector in **Agent Builder** and **Workflows**.

## Create connectors in {{kib}} [define-firecrawl-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [firecrawl-connector-configuration]

Firecrawl connectors have the following configuration properties:

API Key (Bearer token)
:   Your Firecrawl API key for authentication. The connector sends it in the `Authorization: Bearer <key>` header to `https://api.firecrawl.dev`.

## Test connectors [firecrawl-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

The Firecrawl connector has the following actions:

`scrape`
:   Scrape a single URL and extract content (for example, Markdown or HTML).
    - `url` (required): The URL to scrape.
    - `onlyMainContent` (optional): Return only main content, excluding navigation and footer elements. Defaults to true.
    - `waitFor` (optional): Delay in milliseconds before fetching, from 0 to 60000 (useful for JavaScript-rendered pages). Defaults to 0.
    - `maxMarkdownLength` (optional): Maximum characters of Markdown to return, from 1000 to 500000. Defaults to 100000.

`search`
:   Search the web and optionally get full content from results.
    - `query` (required): Search query string.
    - `limit` (optional): Maximum number of results (1 to 100). Defaults to 5.

`map`
:   Map a website to discover indexed URLs.
    - `url` (required): Base URL to map.
    - `search` (optional): Search term to filter or order URLs by relevance.
    - `limit` (optional): Maximum URLs to return, from 1 to 100000. Defaults to 5000.
    - `includeSubdomains` (optional): Include subdomains. Defaults to true.

`crawl`
:   Start an asynchronous crawl of a website. Returns a job ID. Use `getCrawlStatus` to poll for results, or use `crawlAndWait` to wait for the results in one action.
    - `url` (required): Base URL to start crawling from.
    - `limit` (optional): Maximum pages to crawl, from 1 to 100. Defaults to 20.
    - `maxDiscoveryDepth` (optional): Maximum discovery depth.
    - `allowExternalLinks` (optional): Follow external links. Defaults to false.

`crawlAndWait`
:   Crawl a website and wait for the crawl to finish. Prefer it for small or well-known sites; use `crawl` and `getCrawlStatus` for large sites or when the duration is unpredictable. The action fails if the crawl is still running after `maxWaitMs`.
    - `url` (required): Base URL to start crawling from.
    - `limit` (optional): Maximum pages to crawl, from 1 to 100. Defaults to 20.
    - `maxDiscoveryDepth` (optional): Maximum discovery depth.
    - `allowExternalLinks` (optional): Follow external links. Defaults to false.
    - `pollIntervalMs` (optional): How often to poll the crawl job, in milliseconds, from 1000 to 60000. Defaults to 3000.
    - `maxWaitMs` (optional): Maximum time to wait for the crawl, in milliseconds, from 5000 to 3600000. Defaults to 1800000 (30 minutes).

`getCrawlStatus`
:   Get the status and results of a crawl job.
    - `id` (required): The crawl job ID (UUID) returned from the `crawl` action.

## Connector networking configuration [firecrawl-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [firecrawl-api-credentials]

To use the Firecrawl connector:

1. Sign up at [Firecrawl](https://www.firecrawl.dev) or log in to your account.
2. Go to [API keys](https://www.firecrawl.dev/app/api-keys) in the Firecrawl dashboard.
3. Create an API key or copy an existing one (for example, `fc-...`).
4. Enter the API key in the **API Key** field when configuring the Firecrawl connector in {{kib}}.

Rate limits and billing depend on your Firecrawl plan. Refer to [Firecrawl billing](https://docs.firecrawl.dev/billing) for details.
