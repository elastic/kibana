# ES Proxy

Generic Elasticsearch proxy exposed as the internal Kibana API `/internal/es_proxy/{path*}`.

A request to `/internal/es_proxy/<es path>?<query>` is sent to `/<es path>?<query>` on Elasticsearch as the current user. The response status, body, `content-type`, `content-encoding`, `content-length`, `warning`, `retry-after`, `x-elasticsearch-async-id` and `x-elasticsearch-async-is-running` headers come back unchanged. The async headers carry the query id for async searches whose results are not JSON (for example `_query/async?format=csv`). A `location` header is rewritten to point back through the proxy.

```
GET kbn:/internal/es_proxy

PUT kbn:/internal/es_proxy/my-index-000001/_create/1
{ "@timestamp": "2099-11-15T13:12:00", "message": "GET /search HTTP/1.1 200 1070000" }

POST kbn:/internal/es_proxy/my-index-000001/_search
{ "query": { "match_all": {} } }
```

Requests use API version `1` (`elastic-api-version` header). Internal APIs carry no stability guarantee and are intended for Kibana plugins and UI.

## Behavior

- **Bodies.** Request bodies are read into memory (up to Kibana's `server.maxPayload`) and forwarded unparsed. Response bodies are streamed back without being parsed or buffered.
- **Cancellation.** If the client disconnects, the Elasticsearch request is aborted.
- **Retries for reads only.** GET and HEAD requests use the Elasticsearch client's retry settings, so a connection failure or a 502/503/504 is retried on another node. POST, PUT and DELETE requests are never replayed, so writes are not duplicated. Timeouts are not retried.
- **Timeouts.** Elasticsearch requests time out after 120 seconds and return `504`. A connection failure returns `502`.
- **Path encoding.** The Elasticsearch path is taken from the raw URL, so percent-encoded characters (for example `%2F` in a document id) are preserved.
- **GET and HEAD have no body.** Kibana does not accept request bodies on GET or HEAD. Use POST for search-style APIs (`_search`, `_count`, `_msearch`, ...), which Elasticsearch accepts.
- **Compressed bodies.** Request bodies are forwarded still compressed together with their `content-encoding`, so gzip-compressed requests (for example from Elasticsearch clients with compression enabled) work.
- **Headers.** Only `content-type`, `content-encoding` (for requests with a body), `accept` and `x-forwarded-*` headers are sent to Elasticsearch. Cookies and other client headers are not forwarded; credentials come from the scoped Elasticsearch client. Elasticsearch receives Kibana's request id as `x-opaque-id`; Kibana adopts a client's `x-opaque-id` as that id only when `server.requestId.allowFromAnyIp` or `server.requestId.ipAllowlist` permits it.

## Authorization

Kibana authorization is disabled on this route. Requests run as the current user through the scoped Elasticsearch client, so Elasticsearch enforces index and cluster privileges.

This means **any authenticated Kibana user can call any Elasticsearch API their Elasticsearch role allows**, without needing a Kibana feature privilege such as Console's. Grant Elasticsearch roles with that in mind.

## Browser usage

```ts
const { request } = plugins.esProxy;
const result = await request<SearchResponse>({
  method: 'POST',
  path: 'my-index/_search',
  body: { query: { match_all: {} } },
});

// ndjson bodies need an explicit content type
await request({
  method: 'POST',
  path: 'my-index/_bulk',
  body: '{"index":{}}\n{"message":"hello"}\n',
  headers: { 'Content-Type': 'application/x-ndjson' },
});

// stream() resolves with the unread Response, for server-sent events or binary formats
const response = await plugins.esProxy.stream({
  method: 'POST',
  path: '_query',
  query: { format: 'arrow' },
  body: { query: 'FROM my-index | LIMIT 10' },
});
const reader = response.body?.getReader();
```

When Elasticsearch answers `401`, for example because the user's access token expired, Kibana refreshes the credentials and retries the request once, for every method. If the retry still fails, the `401` is returned; in the browser, Kibana's session handling treats it as an expired session and logs the user out.
