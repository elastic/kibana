# Client types

Guide for adding a pooled client type behind `ctx.getClient(...)`.

The multi-client framework ([#280445](https://github.com/elastic/kibana/pull/280445)) exposes Actions outbound policy through `BuildContext.networkSettings` and leases clients from a process-wide pool. It does **not** apply that policy for you. Each client type must wire policy through its own library’s native transport. The type system cannot catch a missed allowlist or proxy hook — registration is a deliberate, reviewed addition.

This is the review guide referenced during framework review ([discussion](https://github.com/elastic/kibana/pull/280445#discussion_r3735685032)).

## What a client type is

A `ClientTypeSpec<TClient>` in `client_type_spec.ts`:

| Member | Role |
| --- | --- |
| `id` | Stable registry key (`ClientRegistry` / `ctx.getClient('…')`) |
| `build(ctx)` | Create and connect a client from `BuildContext` |
| `terminate(client)` | Tear down on pool eviction (connector edit/delete, TTL, shutdown) |
| `isUserError?(err)` | Optional: promote connect failures to non-retryable USER errors |

`BuildContext` currently provides `logger`, connector `config`, `networkSettings`, and `credential.getAuthHeaders()`.

## How to add one

1. Implement `ClientTypeSpec<YourClient>` (often via a small factory that closes over Actions-only deps).
2. Add the client to `ClientRegistry` and `clientTypes` in `index.ts`.
3. Wire any plugin-owned deps from Actions when the registry is constructed (for example a configured-fetch factory). Do not push Actions plugin types into generic `BuildContext` unless every client type needs them.
4. Cover build, terminate, policy, metering, and error classification with unit tests.
5. Use this checklist in PR review.

Reference for the axios (non-pooled) path: `get_axios_instance.ts`, `axios_utils.ts`, and `before_redirect.ts` under the Actions plugin.

## Review checklist

### Outbound network policy

The framework guarantees **reachability** of `xpack.actions.*` settings, not **application**. Apply what your transport supports:

- [ ] Call `networkSettings.ensureUriAllowed` / `ensureHostnameAllowed` at the **real egress seam**, including redirect targets (not only the initial URL).
- [ ] Apply proxy settings from `getProxySettings()`.
- [ ] Apply TLS / custom CA / verification / client-cert behavior from `getSslSettings()` and `getCustomHostSettings(url)`.
- [ ] Honor `getResponseSettings()` (`timeout`, `maxContentLength`) or an explicit, reviewed equivalent in the native client.
- [ ] Set a User-Agent consistent with Actions (`buildUserAgent` in `get_axios_instance.ts`) when the transport is HTTP(S).
- [ ] Prefer the library’s native redirect / header-stripping behavior; do not reimplement a second fetch stack in the framework unless there is no native hook.

Failing to apply the allowlist at the egress seam yields an unprotected connection.

### Egress metering

Axios connectors record outbound request body bytes through `ConnectorUsageCollector.addRequestBodyBytes` (`axios_utils.request`). Spec executors report that total from the action executor.

- [ ] Meter egress traffic for the new client type (at minimum request body bytes, matching the axios collector semantics).
- [ ] Do **not** ship a production client type that bypasses metering.

`BuildContext` does not yet expose `ConnectorUsageCollector`. Until it (or an equivalent seam) exists, either:

1. Thread metering into the client type’s transport via Actions-owned deps / wrappers, or
2. Extend `BuildContext` / the executor in the same change that registers the client type.

Blind spots here show up as missing connector usage / Cloud metering.

### Credentials and auth

- [ ] Prefer `ctx.credential.getAuthHeaders()` for header-based shared auth (Bearer, Basic, API-key header).
- [ ] Do not freeze short-lived tokens into a long-lived client unless refresh/eviction is defined.
- [ ] Per-user OAuth producers are a separate track; do not assume `getAuthHeaders()` works for every auth type.

### Lifecycle and pooling

- [ ] `terminate` must release remote sessions **and** local resources (dispatchers, sockets, temp files).
- [ ] Treat pool eviction as common (connector update/delete, OAuth token lifecycle, idle TTL, process stop).
- [ ] `isUserError` only for permanent user/config/auth failures; leave transport/5xx as FRAMEWORK so retries still work.
- [ ] Remember lease identity is connector + client type + auth identity + connector saved-object revision — do not cache clients outside the pool.

Known pool limit: there is no borrow/refcount, so capacity or idle eviction can terminate a client still in use. Acceptable while key cardinality is low; revisit before high-cardinality per-user leasing ([#281471](https://github.com/elastic/kibana/issues/281471)).

### Registry and API surface

- [ ] Keep the registry closed: every new `ClientRegistry` key is intentional.
- [ ] Export only what connectors need; keep Actions wiring in the plugin.
- [ ] Adding the first (or next) client type makes `ClientTypeId` / `ctx.getClient` usable — call that out in the PR so reviewers know production enablement starts there.

### Tests

- [ ] Build success path and required-config validation.
- [ ] Allowlist denial (`AllowlistDeniedError` / equivalent) before network I/O when possible.
- [ ] Terminate releases resources (including after failed connect if you registered cleanup).
- [ ] `isUserError` true/false cases.
- [ ] Egress metering increments for representative requests.
- [ ] Isolation expectations if the type introduces extra pool-key dimensions.

## Related

- Types: [`client_type_spec.ts`](./client_type_spec.ts), [`index.ts`](./index.ts)
- Framework PR: [#280445](https://github.com/elastic/kibana/pull/280445)
- Parent issue: [#275613](https://github.com/elastic/kibana/issues/275613)
- Per-user auth follow-up: [#281471](https://github.com/elastic/kibana/issues/281471)
