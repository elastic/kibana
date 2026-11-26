# AGENTS.md

Guidance for agents working on pooled connector client types in this folder.

## Read first

Follow [README.md](./README.md) (client-type authoring and review checklist) before adding or changing a `ClientTypeSpec`.

## Hard rules

1. **Own the client in connector-specs.** Put type + transport under `lib/<client>/`. Actions only supplies lease pool, `networkSettings`, and credentials — not client-named modules.
2. **Self-contained until the second consumer.** Apply policy in `build(ctx)` from `ctx.networkSettings`. Do not invent a shared fetch/network-settings factory for one client; extract only when a second client needs the same transport API.
3. **`networkSettings` is global / shared only.** Do not extend `ConnectorNetworkSettings` with client-specific knobs. Those belong on connector `config` / secrets or closed-over factory `deps`.
4. **Do not touch `create_connector_from_spec.ts` by default.** Register on `clientTypes` in `index.ts`. `generateExecutorFunction` already defaults to that registry. Override `clientTypes` only for Actions-only deps or tests.
5. **Apply allowlist / TLS / proxy / timeout / size at the real egress seam**, including redirects. Reachability ≠ application.
6. **Meter egress** on every production client (request body bytes via `ConnectorUsageCollector` or equivalent). Wire metering in the same PR if `BuildContext` cannot carry it yet.
7. **Match the library’s native API** (fetch/SSE for MCP; not axios-forced; non-HTTP clients need not use fetch).
8. **Auth without headers must still build** — soft-fail `getAuthHeaders` for `none` and similar.
9. **Pool the long-lived client; `terminate` must close what `build` opened** (sessions, sockets, dispatchers).
10. **Implement `isUserError`** for bad auth/config so USER failures are not retried as FRAMEWORK.
11. **Leave legacy helpers alone** and **name folders after ownership** (`mcp/client`, not `configured_fetch`).
12. Keep the registry closed: adding a `ClientRegistry` key production-enables `ctx.getClient` for that type.

## Commands

Run from the Kibana repo root:

```bash
# Package unit tests (client types live here)
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/lib/clients

# Typecheck this package
node scripts/type_check --project src/platform/packages/shared/kbn-connector-specs/tsconfig.json
```
