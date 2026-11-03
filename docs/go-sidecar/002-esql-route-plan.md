# Plan: Port ES|QL search to Go sidecar (direct ES)

## Goal

Handle `POST /internal/search/esql` and `POST /internal/search/esql_async/{id?}`
in the Go sidecar by calling Elasticsearch directly, removing Node.js from the
hot path of ES|QL query execution.

## Why ES|QL

- It's the highest-traffic search route in Kibana.
- The Node layer is thin — it authenticates, maps two field names, calls ES,
  and wraps the response. No domain logic.
- ES|QL queries can return large result sets that serialize through Node's
  event loop. Go eliminates that bottleneck.
- Streaming support is natural in Go (`io.Copy`), whereas Node requires
  careful pipe management.

## Current behavior

### Route

**Path:** `POST /internal/search/{strategy}/{id?}` (versioned, `version: '1'`)
**Source:** `src/platform/plugins/shared/data/server/search/routes/search.ts`

This is a generic dispatcher. When `{strategy}` is `esql` or `esql_async`, it
dispatches to the corresponding strategy. Go will only intercept these two
strategy names.

**Auth:** `authc: 'minimal'`, `authz: disabled`
**Access:** `internal` (requires `kbn-xsrf` header)

### Body schema

The route handler extracts Kibana options, then passes the rest to the strategy:

```
Kibana options (extracted):     Strategy params (pass-through):
─────────────────────────       ────────────────────────────────
sessionId?: string              params.query: string (required)
isStored?: boolean              params.time_zone?: string
isRestore?: boolean             params.filter?: object (ES DSL)
returnIntermediateResults?: bool params.locale?: string
stream?: boolean                params.include_execution_metadata?: bool
requestHash?: string            params.dropNullColumns?: boolean
projectRouting?: string         params.settings?: { column_metadata?: bool }
approximation?: boolean         params.params?: ScalarValue[] | Record[]
legacyHitsTotal?: boolean       params.keep_alive?: string
                                params.wait_for_completion_timeout?: string
```

### Sync strategy (`esql`)

**ES call:** `POST /_query`

Field transformations:
- `params.dropNullColumns` → `drop_null_columns: true` (only when truthy)
- `params.terminateAfter` → discarded (not sent to ES)
- Everything else passed through verbatim

**Response:**
```json
{
  "rawResponse": { /* ES /_query response: columns, values, all_columns */ },
  "isPartial": false,
  "isRunning": false,
  "requestParams": { "method": "POST", "path": "/_query", "querystring": "..." },
  "warning": "..."
}
```

### Async strategy (`esql_async`)

Three operations dispatched by request shape:

| Condition | ES API | Go receives |
|-----------|--------|-------------|
| No `{id}` in URL | `POST /_query/async` | New query submission |
| `{id}` + `returnIntermediateResults` | `POST /_query/async/{id}/_stop` | Stop & get partial |
| `{id}` (default) | `GET /_query/async/{id}` | Poll for results |
| DELETE method + `{id}` | `DELETE /_query/async/{id}` | Cancel query |

**Submit** adds config-derived params:
- `wait_for_completion_timeout` (default from Kibana config)
- `keep_alive` (default from Kibana config)
- `keep_on_completion: true` (when sessions enabled)

**Poll** adds:
- `wait_for_completion_timeout` (poll length, shorter)
- `keep_alive`

**Async response:**
```json
{
  "id": "async-search-id",
  "rawResponse": { /* ES async response */ },
  "isRunning": true,
  "isPartial": true,
  "requestParams": { "method": "POST", "path": "/_query/async" },
  "warning": "..."
}
```

**When streaming** (`stream: true`):
- ES returns raw body as a stream
- `id`, `isRunning`, `isPartial` come from ES response **headers**:
  - `x-elasticsearch-async-id`
  - `x-elasticsearch-async-is-running` (`?1` / `?0`)
  - `x-elasticsearch-async-is-partial` (`?1` / `?0`)
- Node pipes the stream to the browser with Kibana metadata in response headers:
  - `kbn-search-is-restored`
  - `kbn-search-request-params`

### Error handling

ES errors are caught and returned as:
```json
{
  "statusCode": 400,
  "body": {
    "message": "...",
    "attributes": {
      "error": { /* ES error body */ },
      "rawResponse": { /* partial response if available */ },
      "requestParams": { "method": "POST", "path": "/_query/async" }
    }
  }
}
```

The `requestParams` are sanitized (no auth headers, no body).

## Architecture

```
                          ┌─────────────────────────────────────────┐
                          │  Go sidecar (:5601, TLS)                │
                          │                                         │
  Browser ───────────────▶│  Route table:                           │
                          │    POST /internal/search/esql    → Go   │
                          │    POST /internal/search/esql_async → Go│
                          │    GET  /api/status              → Go   │
                          │    *                              → proxy│
                          │                                         │
                          │  ESQL handler:                          │
                          │    1. IPC: authenticate → get ES hdrs   │─── UDS ──▶ Node
                          │    2. Transform request params          │
                          │    3. Call ES directly                   │─── TCP ──▶ ES :9200
                          │    4. Wrap response in Kibana envelope  │
                          │    5. Stream or JSON back to browser    │
                          └─────────────────────────────────────────┘
```

Go talks to ES directly using the user's auth headers (from IPC authenticate).
This removes Node from the data path entirely.

## Bootstrap: ES connection info

The sidecar bootstrap config (passed via stdin) is extended with ES coordinates:

```typescript
interface SidecarBootstrapConfig {
  // existing
  host: string;
  port: number;
  socketPath: string;
  secret: string;
  tls?: { certificate: string; key: string; };

  // new for ES direct access
  elasticsearch: {
    hosts: string[];
    requestHeadersWhitelist: string[];
    customHeaders: Record<string, string>;
    ssl: {
      verificationMode: 'none' | 'certificate' | 'full';
      certificateAuthorities?: string[];  // PEM content
      certificate?: string;               // PEM content
      key?: string;                        // PEM content
    };
  };
}
```

**How to populate at preboot time:**

In `HttpService.preboot()`, before spawning the sidecar:
```typescript
const esConfigRaw = await firstValueFrom(
  configService.atPath<ElasticsearchConfigType>('elasticsearch')
);
const esConfig = new ElasticsearchConfig(esConfigRaw);
// esConfig.ssl.certificate etc. are already PEM content (files read by constructor)
```

`configService.atPath('elasticsearch')` is available at preboot time — it reads
raw config directly, independent of `ElasticsearchService` lifecycle.

**Security:** Don't pass `username`/`password`/`serviceAccountToken`. Those are
for Kibana's internal ES client. Go uses per-request user auth headers from IPC.

## Go implementation

### New files

```
src/platform/sidecar/cmd/kbn-sidecar/
  es_client.go         # ES HTTP client with TLS, round-robin hosts
  esql_handler.go      # sync + async ESQL handlers
```

### `es_client.go` — ES HTTP client

```go
type ESClient struct {
    hosts      []string
    httpClient *http.Client
    hostIdx    uint32  // atomic round-robin
    customHeaders map[string]string
    whitelistHeaders []string
}

func NewESClient(config ESConfig) *ESClient { ... }

// Do sends a request to ES with the given user auth headers.
func (c *ESClient) Do(ctx context.Context, method, path string,
    body io.Reader, userHeaders map[string]string) (*http.Response, error) {
    host := c.nextHost()
    req, _ := http.NewRequestWithContext(ctx, method, host+path, body)
    for k, v := range c.customHeaders { req.Header.Set(k, v) }
    for _, h := range c.whitelistHeaders {
        if v := userHeaders[h]; v != "" { req.Header.Set(h, v) }
    }
    req.Header.Set("Content-Type", "application/json")
    return c.httpClient.Do(req)
}
```

TLS configured from bootstrap `elasticsearch.ssl.*`. `verificationMode: 'none'`
→ `InsecureSkipVerify: true`. CA certs parsed into `x509.CertPool`.

### `esql_handler.go` — Route handler

**Sync handler** (`POST /internal/search/esql`):

```go
func (h *ESQLHandler) handleSync(w http.ResponseWriter, r *http.Request) {
    // 1. Authenticate
    auth, err := h.node.Authenticate(r.Context(), r)
    if err != nil || !auth.IsAuthenticated {
        writeJSON(w, 401, errorResponse("Unauthorized"))
        return
    }

    // 2. Parse request body
    var body esqlRequestBody
    json.NewDecoder(r.Body).Decode(&body)

    // 3. Build ES request
    esBody := buildESQLQueryBody(body.Params)

    // 4. Call ES
    resp, err := h.es.Do(r.Context(), "POST", "/_query", esBody, auth.ESHeaders)
    if err != nil {
        fallbackToProxy(h.proxy, w, r)
        return
    }
    defer resp.Body.Close()

    // 5. Handle ES error
    if resp.StatusCode >= 400 {
        relayESError(w, resp, "POST", "/_query")
        return
    }

    // 6. Read ES response and wrap
    var esResp json.RawMessage
    json.NewDecoder(resp.Body).Decode(&esResp)

    writeJSON(w, 200, kibanaSearchResponse{
        RawResponse:   esResp,
        IsPartial:     false,
        IsRunning:     false,
        Warning:       resp.Header.Get("Warning"),
        RequestParams: &requestParams{Method: "POST", Path: "/_query"},
    })
}
```

**Async handler** (`POST /internal/search/esql_async/{id?}`):

```go
func (h *ESQLHandler) handleAsync(w http.ResponseWriter, r *http.Request, id string) {
    auth := ... // same authenticate flow

    body := ... // parse request

    switch {
    case id == "":
        // Submit: POST /_query/async
        h.submitAsync(w, r, body, auth)
    case body.ReturnIntermediateResults:
        // Stop: POST /_query/async/{id}/_stop
        h.stopAsync(w, r, id, auth)
    default:
        // Get/poll: GET /_query/async/{id}
        h.getAsync(w, r, id, body, auth)
    }
}
```

**Stream path:**

When `stream: true` and the ES response is a stream:

```go
// Read async metadata from ES response headers
asyncID := resp.Header.Get("X-Elasticsearch-Async-Id")
isRunning := resp.Header.Get("X-Elasticsearch-Async-Is-Running") == "?1"

// Set Kibana metadata headers
w.Header().Set("kbn-search-is-restored", "?0")
w.Header().Set("kbn-search-request-params", `{"method":"POST","path":"/_query/async"}`)

// Stream ES response body directly to browser
w.WriteHeader(resp.StatusCode)
io.Copy(w, resp.Body)
```

### Field mapping

Only two transformations:
1. `params.dropNullColumns` → `drop_null_columns` in ES request body
2. `params.terminateAfter` → dropped (not sent to ES)

Everything else passes through to ES verbatim.

### Route table update in `main.go`

```go
// in newProxyHandler:
esClient := NewESClient(config.Elasticsearch)
esqlHandler := NewESQLHandler(nodeClient, esClient, proxy)

return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    stripSidecarHeaders(r)

    switch {
    case r.Method == http.MethodGet && r.URL.Path == "/api/status":
        statusHandler.ServeHTTP(w, r)
    case r.URL.Path == "/internal/search/esql":
        esqlHandler.HandleSync(w, r)
    case strings.HasPrefix(r.URL.Path, "/internal/search/esql_async"):
        id := strings.TrimPrefix(r.URL.Path, "/internal/search/esql_async/")
        esqlHandler.HandleAsync(w, r, id)
    default:
        proxy.ServeHTTP(w, r)
    }
})
```

## Work breakdown

### P0: ES client in Go + bootstrap config

1. Extend `SidecarBootstrapConfig` with `elasticsearch` block
2. In `HttpService.preboot()`, read ES config and populate bootstrap
3. Update `SidecarProcess` to pass the new config fields
4. Go: `es_client.go` with TLS support, round-robin host selection, header whitelisting
5. Go: update `BootstrapConfig` struct to parse `elasticsearch` from stdin JSON

### P1: Sync ESQL (`POST /internal/search/esql`)

1. Go: `esql_handler.go` with sync handler
2. Authenticate via IPC, get ES auth headers
3. Parse body, extract `dropNullColumns`, build ES request
4. Call `POST /_query` on ES directly
5. Wrap response in Kibana envelope
6. Error handling: relay ES errors in Kibana format
7. Fallback to Node proxy on any internal error

### P2: Async ESQL (`POST /internal/search/esql_async/{id?}`)

1. Submit handler: `POST /_query/async` with config-derived defaults
2. Get/poll handler: `GET /_query/async/{id}`
3. Stop handler: `POST /_query/async/{id}/_stop`
4. Delete handler (separate route): `DELETE /_query/async/{id}`
5. Wire `returnIntermediateResults` dispatch logic

### P3: Streaming

1. Detect `stream: true` in request body
2. Pass through to ES without buffering the response
3. Read async metadata from ES response headers
4. Set Kibana metadata in response headers
5. `io.Copy` response body to browser

### P4: Parity (later)

- Search sessions (IPC to Node for saved object tracking)
- Usage telemetry (fire-and-forget IPC counter increments)
- License check for `approximation` (IPC or cache license state)
- APM tracing (`x-kbn-context` header propagation)
- Config-derived async defaults (`waitForCompletion`, `keepAlive`, `pollLength`)

## What we lose (initially)

| Feature | Impact | Mitigation |
|---------|--------|------------|
| Search sessions | Can't restore/extend searches | Add IPC hooks in P4 |
| Usage telemetry | No search strategy counters | Fire-and-forget IPC |
| APM tracing | No `x-kbn-context` spans | Propagate header to ES |
| License gating | `approximation` always denied | Cache license via IPC |
| Abort on disconnect | Client disconnect doesn't abort ES | Wire `r.Context().Done()` to ES request cancel |

## Abort handling

Go's `http.Request.Context()` is cancelled when the client disconnects.
Pass this context to `ESClient.Do()` → the ES HTTP request is cancelled
automatically. This gives us client-disconnect abort for free, matching
Node's `request.events.aborted$` behavior.

## Testing strategy

1. **Unit test** the field mapping (`dropNullColumns` → `drop_null_columns`)
2. **Mock ES backend** test (like the status handler test): Python HTTP server
   simulating `/_query` and `/_query/async` responses
3. **Integration test**: run the existing Jest integration tests and Scout tests
   for ESQL with `server.sidecar.enabled=true`
4. **Shadow mode** (future): serve from both Go and Node, diff responses

## Success criteria

- `POST /internal/search/esql` returns identical JSON responses through Go
- `POST /internal/search/esql_async` submit/poll/stop/cancel all work
- Streaming responses pipe correctly to the browser
- ES errors relay with correct status codes and Kibana error format
- Client disconnect cancels the in-flight ES request
- Event-loop utilization on Node drops under ESQL query load
