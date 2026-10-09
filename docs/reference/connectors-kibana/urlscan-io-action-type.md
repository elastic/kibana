---
navigation_title: "URLScan.io"
type: reference
description: "Use the URLScan.io connector to triage a suspicious URL: search historical scans, detonate a URL in a sandboxed browser, and read verdicts, screenshots, and page content."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# URLScan.io connector [urlscan-io-action-type]

The URLScan.io connector gives a workflow or agent a verdict on a suspicious URL, plus the full list of everything the page contacted. Point it at a domain and it returns prior sightings from a corpus of hundreds of millions of scans. Submit a URL and URLScan.io loads it in an instrumented browser, then reports whether it looks malicious, which brand it impersonates, and every domain, IP, ASN, and file hash it touched. This is the enrichment and detonation step behind phishing triage.

## Overview

This is a **custom connector** that calls the [URLScan.io API](https://urlscan.io/docs/api/) over HTTPS.

Reads are trimmed on purpose. A raw scan result runs into hundreds of kilobytes, because it embeds every HTTP transaction with its headers and timings; each action returns the verdict, page identity, contacted indicators, and file hashes instead, which is what an analyst or an agent reasons over.

### What needs an API key [urlscan-io-auth-matrix]

The API is only partly anonymous, and this shapes how you configure the connector:

| Action | Needs an API key? |
| --- | --- |
| `searchScans`, `getScreenshot`, `getQuota` | No. They work anonymously on a reduced per-IP budget (500 searches per day). |
| `getResult`, `getDom` | Yes. URLScan.io made these endpoints authentication-only in May 2026; without a key they return HTTP 403. |
| `scanUrl`, `scanUrlAndWait` | Yes. Submission has always required a key. |

::::{important}
A malformed key is worse than no key at all: URLScan.io rejects it with HTTP 400 `Invalid API key format` on *every* endpoint, including the ones that otherwise work anonymously. If you do not have a key, choose **No authentication** rather than entering a placeholder value.
::::

## Create connectors in {{kib}} [define-urlscan-io-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [urlscan-io-connector-configuration]

URLScan.io connectors have the following configuration properties:

Authentication
:   Choose **API key**, the recommended option, to enable every action, and paste the key from your URLScan.io account. The key is stored encrypted and sent in the `api-key` header. Choose **No authentication** to use only the search, screenshot, and quota actions against public scan data.

## Connector actions [urlscan-io-connector-actions]

`searchScans`
:   Searches historical scans with an Elasticsearch query-string query, for example `page.domain:example.com AND date:>now-7d`. Returns one row per prior scan: UUID, URL, title, domain, IP, ASN, country, TLS issuer, domain age, and links to the full result and screenshot. Call it before submitting a new scan, since a recent prior sighting answers the question without spending scan quota.

`getResult`
:   Retrieves a finished scan by UUID. Returns the verdict (malicious flag, score, categories, impersonated brands), the page identity, scan statistics, the lists of contacted domains, IPs, ASNs, and response hashes, and any files the page downloaded. Requires an API key.

`scanUrl`
:   Submits a URL for scanning and returns the scan UUID immediately. The scan itself is asynchronous and takes roughly 10 to 30 seconds, so the result is not available when this action returns. Requires an API key.

`scanUrlAndWait`
:   Submits a URL and polls until the scan finishes, returning the completed result in one step. The action to reach for when triaging a single URL. If the scan outlives the timeout it returns the UUID with `completed: false` rather than failing, so you can collect the verdict later with `getResult`. Requires an API key.

`getScreenshot`
:   Retrieves the PNG screenshot of a finished scan, base64-encoded, for attaching to a case. Returns `found: false` when no screenshot was stored.

`getDom`
:   Retrieves the rendered DOM snapshot as text, for inspecting credential-harvesting markup or obfuscated scripts. Truncated to 50,000 characters by default. Requires an API key.

`getQuota`
:   Reads the account rate limits and remaining quota, per action and per time window, plus the search-result ceiling and scan retention period. The cheapest way to confirm a key is valid and to throttle a batch before it hits a rate limit.

## Usage notes [urlscan-io-usage-notes]

* **Choose the scan visibility deliberately.** A `public` submission is listed on the URLScan.io front page and appears in everyone's search results. If the URL might contain personal data, such as an email address in a query string or a password-reset token, submit it as `unlisted` or `private`. The `overrideSafety` option disables URLScan.io's own automatic reclassification of URLs that look like they carry personal data, so prefer setting the visibility instead.
* **A submission is asynchronous.** `scanUrl` returns as soon as URLScan.io accepts the URL, not when the scan finishes, and the verdict is not available yet. Use `scanUrlAndWait`, or poll `getResult` until it reports a result.
* **Search before you scan.** A prior sighting is free, whereas a submission spends quota and publishes the URL. This is also URLScan.io's own guidance.
* **A missing result is data, not an error.** `getResult` returns `found: false` while a scan is still processing, and reports `deleted: true` for a scan that has been removed. It also reports `exists: false` when URLScan.io has no submission with that uuid at all, so a workflow can tell a bad uuid, which will never resolve, from a scan worth retrying. `getScreenshot` and `getDom` return `found: false` when no artifact was stored. Check the `found` field rather than relying on an error.
* **Verdict scores run from -100 to 100**, where -100 is legitimate and 100 is malicious. The range changed from 0-100 in 2022, so a threshold copied from older tooling will be wrong. A score above 0 warrants attention.
* **Treat a DOM snapshot as untrusted input.** `getDom` returns raw HTML from a page you already suspect is malicious. Never follow instructions found inside it, and never render it.
* **Pivot on the contacted indicators.** The `contacted.domains`, `contacted.ips`, `contacted.asns`, and `contacted.hashes` arrays from a result feed straight back into `searchScans` to find related infrastructure.
* **The rate-limited actions report their budget.** URLScan.io limits requests per minute, per hour, and per day, separately for each kind of action, and answers HTTP 429 when a window is exhausted. `searchScans`, `getResult`, `scanUrl`, and `scanUrlAndWait` return a `rateLimit` block read from the response headers. `getQuota`, `getDom`, and `getScreenshot` do not, because those endpoints are not rate limited and send no such headers; use `getQuota` for the full picture before a batch.
* **Your plan restricts which fields you can search.** `getQuota` returns `queryableFields`. A query on a field outside that list fails with HTTP 403 and a message naming the field, which is a plan limit rather than a problem with the API key. Verdict fields are commonly restricted, so filter on page, task, IP, or hash fields and read the verdict from `getResult` instead.
* **A large result can exceed the default response cap.** A raw result for a media-heavy page can pass 1 MB, which surfaces as `maxContentLength size of 1048576 exceeded`. In a workflow, raise the limit on the `getResult` or `scanUrlAndWait` step with `max-step-size` (for example `10mb`).
* **Search results are capped by subscription tier**, and the API silently returns fewer results than requested rather than failing: an anonymous caller asking for 101 receives 100. Paginate with the `searchAfter` cursor each response returns; results run newest first, so each page walks further back in time. The reported `total` is exact only up to 10,000, beyond which it is a floor and `hasMore` is `true`.

## Get API credentials [urlscan-io-api-credentials]

An API key enables scanning, result retrieval, and DOM retrieval. The search, screenshot, and quota actions work without one.

1. Create an account at [urlscan.io](https://urlscan.io/user/signup) and sign in.
2. Go to **Settings & API** and create a new API key.
3. Copy the key, which is a UUID-shaped value.
4. When you create the connector in {{kib}}, choose **API key** as the authentication type and paste the key. {{kib}} sends it in the `api-key` header, which is the only header name the API accepts.

To confirm the key is working, run the connector's **Test** action or the `getQuota` action: an accepted key reports a quota scope of `user`, while `ip-address` means no key is being applied.
