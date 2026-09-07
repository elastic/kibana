---
navigation_title: "Exa"
type: reference
description: "Use the Exa connector to search the web and fetch full page content using the Exa AI search API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Exa connector [exa-action-type]

The Exa connector uses the [Exa API](https://exa.ai) to search the web for current information and read the full text of web pages. It connects using Exa's hosted MCP server.

## Create connectors in {{kib}} [define-exa-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [exa-connector-configuration]

Exa connectors have the following configuration properties:

API Key
:   The Exa API key for authentication. Obtain one from the [Exa dashboard](https://dashboard.exa.ai). The key is sent as the `x-api-key` header on every request.

## Test connectors [exa-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

The Exa connector has the following actions:

Search
:   Search the web using natural-language semantic matching.
    - `query` (required): Natural-language description of the page you want. Describe the content, not keywords — for example, "engineering blog post about distributed tracing with OpenTelemetry" finds better results than "distributed tracing opentelemetry".
    - `numResults` (optional): Number of results to return, 1-100. Defaults to 10.

Fetch
:   Read the full text content of one or more web pages by URL.
    - `urls` (required): List of one or more page URLs, up to 25 per call.
    - `maxCharacters` (optional): Maximum characters of text to return per page. Defaults to 3000.

Search (advanced)
:   Search the web with precise control over filters, content extraction, and result freshness.
    - `query` (required): Search query.
    - `numResults` (optional): Number of results, 1-100. Defaults to 10.
    - `type` (optional): Search mode — `auto` (default, recommended), `fast`, or `instant`.
    - `category` (optional): Narrow results to a page category — `company`, `publication`, `news`, `pdf`, `github`, `personal site`, `people`, or `financial report`.
    - `includeDomains` (optional): Only return results from these domains, e.g. `["arxiv.org", "github.com"]`.
    - `excludeDomains` (optional): Drop results from these domains.
    - `startPublishedDate` / `endPublishedDate` (optional): Restrict results by publication date (ISO 8601, e.g. `2026-01-01`).
    - `startCrawlDate` / `endCrawlDate` (optional): Restrict results by the date Exa crawled the page.
    - `includeText` (optional): Keep only results containing all of these strings.
    - `excludeText` (optional): Drop results containing any of these strings.
    - `userLocation` (optional): Two-letter ISO country code for geo-targeted results.
    - `moderation` (optional): When true, filters unsafe content.
    - `textMaxCharacters` (optional): Maximum characters of text to extract per result.
    - `enableSummary` (optional): When true, generates a short summary per result.
    - `enableHighlights` (optional): When true, returns the most relevant passages per result.
    - `maxAgeHours` (optional): Maximum age of cached content in hours (0 = always fetch live). Omit for fast cached-with-fallback behaviour.
    - `subpages` (optional): Number of sub-pages to crawl per result, 1-10.

Agent run
:   Run an Exa autonomous research agent for complex, multi-step research questions.
    - `query` (required if not using `runId`): Natural-language research objective.
    - `runId` (required if not using `query`): An `agent_run_...` ID from an earlier call — poll this ID to resume a run that has not yet completed.
    - `previousRunId` (optional): Feed a completed prior run as context for a new run.
    - `effort` (optional): `minimal`, `low` (default), `medium`, `high`, `xhigh`, or `auto`. Higher effort produces more thorough results but takes significantly longer.
    - `systemPrompt` (optional): System-level instructions for the agent.

## Connector networking configuration [exa-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [exa-api-credentials]

To use the Exa connector:

1. Create an account at [exa.ai](https://exa.ai).
2. Go to the [API Keys](https://dashboard.exa.ai) page in the Exa dashboard.
3. Copy your API key.
4. Enter the API key in the **Exa API key** field when configuring the connector in {{kib}}.
