# Client types

Guide for adding a pooled client type behind `ctx.getClient(...)`.

The multi-client framework ([#280445](https://github.com/elastic/kibana/pull/280445)) exposes Actions outbound policy through `BuildContext.networkSettings` and leases clients from a process-wide pool. It does **not** apply that policy for you. Each client type must wire policy through its own library’s native transport. The type system cannot catch a missed allowlist or proxy hook — registration is a deliberate, reviewed addition.

This is the review guide referenced during framework review ([discussion](https://github.com/elastic/kibana/pull/280445#discussion_r3735685032)).

## Ownership

- **Own the client in `@kbn/connector-specs`.** Client type + transport live under something like `lib/<client>/` (or `lib/<client>/client/`). Actions supplies framework glue only: lease pool, `networkSettings`, credentials.
- **Do not put client-named modules in Actions** unless they are truly Actions-core (auth, pooling, config utilities shared by every connector path).
- **Name folders after ownership, not aspiration.** Prefer `mcp` / `mcp/client` over `configured_fetch` or an “HTTP clients platform.”
- **Leave legacy helpers alone.** If `lib/mcp` already has axios helpers, put the new pooled path beside them — do not rename or move the old surface for neatness.

## What a client type is

A `ClientTypeSpec<TClient>` in `client_type_spec.ts`:

| Member | Role |
| --- | --- |
| `id` | Stable registry key (`ClientRegistry` / `ctx.getClient('…')`) |
| `build(ctx)` | Create and connect a client from `BuildContext` |
| `terminate(client)` | Tear down on pool eviction (connector edit/delete, TTL, shutdown) |
| `isUserError?(err)` | Optional: promote connect failures to non-retryable USER errors |

`BuildContext` currently provides `logger`, connector `config`, `networkSettings`, and `credential.getAuthHeaders()`.

### `networkSettings` is global / shared only

`ConnectorNetworkSettings` mirrors cluster-wide Actions outbound policy (`xpack.actions.*`): allowlist, proxy, TLS / custom hosts, response timeout and max content length. It is the same bag the axios path uses.

- **Do** read and apply those shared settings in `build(ctx)`.
- **Do not** add client-specific settings to `ConnectorNetworkSettings` / `BuildContext.networkSettings`. Protocol options, product defaults, MCP session knobs, SQL pool sizes, etc. belong on connector `config` / secrets, or closed over in the client type (factory `deps`).

Growing `networkSettings` for one client forces every other client to inherit an unrelated API.

## How to add one

Default path — self-contained client, no Actions override:

1. Implement `ClientTypeSpec<YourClient>` next to the client (`lib/<client>/…`).
2. In `build(ctx)`, apply policy from `ctx.networkSettings` (allowlist, TLS, proxy, timeout, size) and auth via `ctx.credential`. Match the library’s native API (MCP → `fetch` + streams; a future MySQL client would not use `fetch` at all).
3. Register the type on `ClientRegistry` and `clientTypes` in [`index.ts`](./index.ts).
4. **Leave `create_connector_from_spec.ts` alone.** `generateExecutorFunction` defaults `clientTypes` to this registry, so omitting the argument is correct:

   ```ts
   generateExecutorFunction({
     actions: executableActions,
     getAxiosInstanceWithAuth: actions.getAxiosInstanceWithAuth,
     getCredential: actions.getCredential,
     getClientLeasePool: actions.getClientLeasePool,
     networkSettings,
     // clientTypes omitted → uses @kbn/connector-specs clientTypes
   });
   ```

5. Cover build, terminate, policy, metering, and error classification with unit tests.
6. Use the checklist below in PR review.

### When to override `clientTypes` from Actions

Override (pass a custom map into `generateExecutorFunction`) **only** when:

- the client needs Actions-only deps that cannot be expressed through `BuildContext`, or
- tests need a fake registry.

Prefer making the client self-contained so that override stays rare. Factory `deps` are for closed-over defaults (for example optional User-Agent), not for smuggling Actions config that already belongs on `networkSettings`.

### Keep the client self-contained until the second consumer

Do **not** invent a shared HTTP / network-settings abstraction for one consumer:

- Axios already covers REST connectors.
- Keep fetch / SSE / protocol-specific transport inside that client’s folder for the first implementation.
- Extract a shared helper or Actions factory (`getXFetchFactory`) only when a **second** client needs the same transport API and the same network-settings wrapper.
- Prefer the library’s native redirect / header-stripping behavior over a framework-owned second fetch stack.

## Review checklist

### Outbound network policy

The framework guarantees **reachability** of `xpack.actions.*` settings, not **application**. Apply what your transport supports in `build(ctx)` (or a helper next to the client):

- [ ] Call `networkSettings.ensureUriAllowed` / `ensureHostnameAllowed` at the **real egress seam**, including redirect targets (not only the initial URL).
- [ ] Apply proxy settings from `getProxySettings()`.
- [ ] Apply TLS / custom CA / verification / client-cert behavior from `getSslSettings()` and `getCustomHostSettings(url)`.
- [ ] Honor `getResponseSettings()` (`timeout`, `maxContentLength`) or an explicit, reviewed equivalent in the native client.
- [ ] Set a User-Agent consistent with Actions (`buildUserAgent` in `get_axios_instance.ts`) when the transport is HTTP(S).
- [ ] No parallel Actions `getXFetchFactory` unless multiple clients share that exact transport API.
- [ ] No client-specific fields on `ConnectorNetworkSettings` — only global / shared Actions policy.

Failing to apply the allowlist at the egress seam yields an unprotected connection.

### Egress metering

Axios connectors record outbound request body bytes through `ConnectorUsageCollector.addRequestBodyBytes` (`axios_utils.request`). Spec executors report that total from the action executor.

- [ ] Meter egress traffic for the new client type (at minimum request body bytes, matching the axios collector semantics).
- [ ] Do **not** ship a production client type that bypasses metering.

`BuildContext` does not yet expose `ConnectorUsageCollector`. Until it (or an equivalent seam) exists, either thread metering into the client type’s transport in the same PR, or extend `BuildContext` / the executor when registering the client type.

### Credentials and auth

- [ ] Prefer `ctx.credential.getAuthHeaders()` for header-based shared auth (Bearer, Basic, API-key header).
- [ ] Auth types without headers (`none`, and similar) must still build: soft-fail / empty headers, do not fail the whole client.
- [ ] Do not freeze short-lived tokens into a long-lived client unless refresh/eviction is defined.
- [ ] Per-user OAuth producers are a separate track; do not assume `getAuthHeaders()` works for every auth type.

### Lifecycle and pooling

- [ ] Lease the long-lived client instance via the pool — do not cache clients outside it.
- [ ] `terminate` must disconnect and release sockets / dispatchers / resources tied to what `build` opened.
- [ ] Treat pool eviction as common (connector update/delete, OAuth token lifecycle, idle TTL, process stop).
- [ ] Implement `isUserError` for bad auth/config so the executor does not retry USER errors as FRAMEWORK.
- [ ] Remember lease identity is connector + client type + auth identity + connector saved-object revision.

Known pool limit: there is no borrow/refcount, so capacity or idle eviction can terminate a client still in use. Acceptable while key cardinality is low; revisit before high-cardinality per-user leasing ([#281471](https://github.com/elastic/kibana/issues/281471)).

### Registry and wiring

- [ ] Keep the registry closed: every new `ClientRegistry` key is intentional.
- [ ] Default wiring: register in `clientTypes` here; **do not** edit `create_connector_from_spec.ts`.
- [ ] Override `clientTypes` only for Actions-only deps or tests.
- [ ] Adding a client type production-enables `ctx.getClient` for that id — call that out in the PR.

### Tests

- [ ] Build success path and required-config validation.
- [ ] Allowlist denial (`AllowlistDeniedError` / equivalent) before network I/O when possible.
- [ ] Soft-fail when `getAuthHeaders` is unsupported (`none`).
- [ ] Terminate releases resources (including after failed connect if you registered cleanup).
- [ ] `isUserError` true/false cases.
- [ ] Egress metering increments for representative requests.
- [ ] Isolation expectations if the type introduces extra pool-key dimensions.

## Related

- Types: [`client_type_spec.ts`](./client_type_spec.ts), [`index.ts`](./index.ts)
- Axios (non-pooled) reference in Actions: `get_axios_instance.ts`, `axios_utils.ts`, `before_redirect.ts`
- Framework PR: [#280445](https://github.com/elastic/kibana/pull/280445)
- Parent issue: [#275613](https://github.com/elastic/kibana/issues/275613)
- Per-user auth follow-up: [#281471](https://github.com/elastic/kibana/issues/281471)
