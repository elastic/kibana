# Plan: Port `/api/status` to a Go sidecar

## Goal

Run `GET /api/status` through a Go process that owns Kibana's public port,
with Node.js on a unix domain socket (UDS) behind it. This is the first route ported
as a proof of concept for the strangler-fig architecture.

## Why `/api/status` first

- It's a public, high-frequency endpoint (k8s readiness probes hit it constantly).
- Auth is optional (`authc: 'optional'`), and authz is disabled.
- It has no saved-object dependencies.
- The response is small and well-defined.
- It exercises all the foundational plumbing (Go front door, IPC, route table)
  without touching domain logic.

## Current behavior

### Route: `GET /api/status`

**Source:** `src/core/packages/status/server-internal/src/routes/status.ts`

**Query params:**
- `v8format?: boolean` — current response shape (default true)
- `v7format` exists but is legacy and will not be supported in the Go handler.
  Requests with `v7format=true` fall back to Node via the proxy.

**Auth:** `authc: 'optional'`, `authz: disabled`. Unauthenticated callers get
a redacted response. Authenticated callers without the `monitor` cluster
privilege also get a redacted response.

**Response decision tree:**

```
Is auth required (status.allowAnonymous === false)?
  No  → full response
  Yes → Is request authenticated?
    No  → redacted response (overall level only)
    Yes → Does config bypass monitor privilege?
      Yes → full response
      No  → Does user have cluster:monitor privilege?
        Yes → full response
        No / error checking → redacted response
```

**Redacted response** (200 or 503):
```json
{
  "status": {
    "overall": {
      "level": "available"
    }
  }
}
```

**Full response** (200 or 503):
```json
{
  "name": "<serverName>",
  "uuid": "<uuid>",
  "version": {
    "number": "9.1.0",
    "build_hash": "...",
    "build_number": 12345,
    "build_snapshot": false,
    "build_flavor": "traditional",
    "build_date": "2026-01-01T00:00:00.000Z"
  },
  "status": {
    "overall": { "level": "available", "summary": "..." },
    "core": {
      "elasticsearch": { "level": "available", "summary": "..." },
      "savedObjects": { "level": "available", "summary": "..." }
    },
    "plugins": { "<name>": { "level": "available", "summary": "..." }, ... }
  },
  "metrics": {
    "last_updated": "...",
    "collection_interval_in_millis": 5000,
    "os": { ... },
    "process": { ... },
    "processes": [ ... ],
    "response_times": { ... },
    "concurrent_connections": 42,
    "requests": { ... },
    "elasticsearch_client": { ... }
  }
}
```

**Status code:** 503 if `coreOverall.level >= unavailable`, else 200.

### Preboot phase

During preboot, a separate handler returns a hardcoded 503 redacted response.

## Architecture

```
                          ┌─────────────────────────────┐
                          │  Go sidecar (:5601, TLS)    │
                          │                             │
  Browser / k8s ─────────▶│  Route table:               │
                          │    /api/status → Go handler │
                          │    *            → proxy     │── unix socket ──▶ Node (hapi)
                          │                             │
                          │  Go handler:                │
                          │    1. IPC: get status blob   │── unix socket ──▶ Node /internal/sidecar/status
                          │    2. IPC: authenticate      │── unix socket ──▶ Node /internal/sidecar/authenticate
                          │    3. Decide redacted/full   │
                          │    4. Respond                │
                          └─────────────────────────────┘
```

## IPC endpoints (Node side)

### `GET /internal/sidecar/status`

Returns the current status blob. No auth required (sidecar secret only).

**Response:**
```json
{
  "config": {
    "allowAnonymous": false,
    "statusPageBypassMonitorPrivilege": false,
    "serverName": "...",
    "uuid": "...",
    "packageInfo": { "version": "...", "buildSha": "...", ... }
  },
  "coreOverall": { "level": "available", "summary": "..." },
  "overall": { "level": "available", "summary": "..." },
  "core": {
    "elasticsearch": { ... },
    "savedObjects": { ... }
  },
  "plugins": { ... },
  "metrics": { ... }
}
```

Go caches this for a short TTL (~1–2 s) to avoid hitting Node on every
probe. The metrics and status observables in Node already batch on a
collection interval (default 5 s), so a 1–2 s cache loses nothing.

### `POST /internal/sidecar/authenticate`

Forward the browser's original headers. Node runs its auth lifecycle
and returns:

```json
{
  "isAuthenticated": true,
  "esHeaders": { "authorization": "..." }
}
```

Or a 401/403 response that Go relays to the browser.

### `POST /internal/sidecar/check_privileges`

Forward the ES auth headers. Node calls `security.hasPrivileges`:

```json
{
  "esHeaders": { "authorization": "..." },
  "privileges": { "cluster": ["monitor"] }
}
```

Response: `{ "has_all_requested": true }`.

**Alternative:** Go could call ES directly for `_security/has_privileges`
using the auth headers from the authenticate response. This avoids an extra
IPC round trip but means Go needs an ES client. For the spike, use the IPC
call. Optimize later.

## Go handler pseudocode

```go
func (h *StatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // 1. Legacy v7format requests fall back to Node
    if r.URL.Query().Get("v7format") == "true" {
        h.fallbackToNode(w, r)
        return
    }

    // 2. Get cached status blob from Node
    status, err := h.node.GetStatus(r.Context())
    if err != nil {
        h.fallbackToNode(w, r)
        return
    }

    // 3. Decide response level
    decision := h.resolveDecision(r, status.Config)

    // 4. Build response
    statusCode := 200
    if status.CoreOverall.Level == "unavailable" || status.CoreOverall.Level == "critical" {
        statusCode = 503
    }

    switch decision {
    case "unauthenticated", "no-monitor":
        writeJSON(w, statusCode, RedactedResponse{
            Status: RedactedStatus{
                Overall: RedactedOverall{Level: status.CoreOverall.Level},
            },
        })
    case "full":
        body := buildFullResponse(status)
        writeJSON(w, statusCode, body)
    }
}

func (h *StatusHandler) resolveDecision(r *http.Request, config StatusConfig) string {
    if config.AllowAnonymous {
        return "full"
    }

    auth, denied, err := h.node.Authenticate(r.Context(), r)
    if err != nil || denied != nil {
        return "unauthenticated"
    }

    if config.BypassMonitorPrivilege {
        return "full"
    }

    privs, err := h.node.CheckPrivileges(r.Context(), auth.ESHeaders, []string{"monitor"})
    if err != nil || !privs.HasAllRequested {
        return "no-monitor"
    }

    return "full"
}
```

## Work breakdown

### P0: Go front door (transparent proxy)

**Owner:** Core team (changes `@kbn/core-http-server-internal`)

1. **Go binary scaffold** under `src/platform/sidecar/cmd/kbn-sidecar/`.
   - `main.go`: read bootstrap config from stdin, bind public port with TLS,
     reverse-proxy all traffic to Node over the unix socket.
   - Health: return 503 until Node's unix socket is connectable.
   - Graceful shutdown: drain connections on SIGTERM.

2. **Node spawns Go** in `HttpService.setup()`:
   - Create a 0700 temp directory with a unix socket path.
   - Write bootstrap config (TLS certs, unix socket path, secret) to Go's stdin.
   - Wait for ready signal on fd 3.
   - If Go exits, restart with backoff. If it can't stay up, Node exits.

3. **Node listens on a unix socket** instead of the public port:
   - Modify `getServerOptions()` in `@kbn/server-http-tools` to accept a
     socket path.
   - Disable TLS on the internal listener (Go terminates it).
   - Set `X-Forwarded-*` trust.

4. **Feature flag:** `server.sidecar.enabled: false` (default off).

5. **Validation:** all existing API tests pass through the Go proxy.

### P1: IPC endpoints

**Owner:** Core team

1. Register `/internal/sidecar/status`, `/internal/sidecar/authenticate`,
   `/internal/sidecar/check_privileges` as internal routes.
2. Protect with sidecar secret header (`x-kbn-sidecar-secret`).
3. Strip `x-kbn-sidecar-*` headers from public traffic in Go.

### P2: Go status handler

**Owner:** Core team / whoever picks this up

1. Route table entry: `GET /api/status → go`.
2. Implement the handler per the pseudocode above.
3. Cache the status blob with a 1–2 s TTL.
4. Proxy `v7format=true` requests to Node (legacy, not ported).
5. Emit usage counter increments via the `complete` IPC pattern.
6. Match response headers: `kbn-name`, `kbn-license-sig`, etc.

### P3: Validation

1. **Shadow mode:** serve from both Go and Node, diff responses. Alert on
   divergence.
2. **API tests:** run the existing `/api/status` FTR and Scout tests with
   `server.sidecar.enabled: true`.
3. **Load test:** compare p99, TTFB, and event-loop utilization for the
   status endpoint under probe-like load (many concurrent GETs).
4. **Preboot:** during preboot, Go should return the hardcoded 503 redacted
   response itself, without calling Node.

## Dev mode

Go must work in dev mode. Today, `--dev` starts a `BasePathProxyServer`
(in `@kbn/cli-dev-mode`) that owns the public port and proxies to Kibana
on a `targetPort`. With the sidecar, the chain becomes:

```
BasePathProxyServer (:5601) → Go (:targetPort) → Node (unix socket)
```

`CliDevMode` already passes `--server.port=${basePathProxy.targetPort}` to
the Kibana child process. With the sidecar enabled, that port goes to Go
instead. Go proxies to Node on the unix socket.

**Changes to `@kbn/cli-dev-mode`:**
- `DevServer` spawns Go before starting the Node process, passing Go's
  listen port as Node's `--server.port` value.
- Go's bootstrap config includes the target port from `BasePathProxyServer`.
- On file-change restart, `DevServer` kills and respawns both Go and Node.
  Alternatively, only Node restarts and Go reconnects to the new socket
  (cleaner, since Go doesn't change during development).

**New start command:** not strictly needed. `yarn start` (`node scripts/kibana --dev`)
continues to work. When `server.sidecar.enabled: true` is in the config (or
passed as `--server.sidecar.enabled`), the dev-mode orchestrator spawns Go
as part of the normal startup. No separate `pnpm` command required.

For convenience during sidecar development itself, add:
```
node scripts/kibana --dev --server.sidecar.enabled
```

The Go binary must be pre-built. Add a `node scripts/build_sidecar.js`
script that runs `go build` for the current platform, and have
`kbn bootstrap` call it when `server.sidecar.enabled` is configured.

## Open questions

1. **Hapi socket support:** verify that `@kbn/server-http-tools` /
   `getServerOptions` can accept a unix socket path as `port`.
2. **Preboot handoff:** Node has a preboot server that hands off to the
   main server. Go needs to handle the upstream disappearing briefly during
   that transition (retry / 503).
3. **Response headers:** Kibana sets `kbn-name`, `kbn-license-sig`,
   `kbn-license-status`, and CSP headers on every response. Go needs to
   either add them itself or let the Node IPC response include them.
4. **CORS and `kbn-xsrf`:** the status route is a GET with `access: public`
   and no XSRF requirement, so this shouldn't be an issue for this route,
   but verify for the general proxy path.
5. **Dev-mode file watching:** when Node restarts on file changes, Go
   should detect the unix socket disconnect and retry until Node is back. Go
   itself should not restart on TS file changes.

## Success criteria

- `/api/status` returns identical responses through Go and through Node.
- k8s readiness probes work unchanged.
- The Go process starts, stays up, and restarts on crash.
- The sidecar can be disabled with a config flag, reverting to Node-only.
- Event-loop utilization on Node drops under status-probe load (the probes
  no longer hit Node's event loop when the response is cached in Go).
