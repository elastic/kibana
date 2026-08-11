# AGENTS.md

Guidance for agents working on pooled connector client types in this folder.

## Read first

Follow [README.md](./README.md) (client-type authoring and review checklist) before adding or changing a `ClientTypeSpec`.

## Hard rules

1. The framework only **exposes** `BuildContext.networkSettings`. Your client type must **apply** allowlist, proxy, TLS/custom host settings, timeouts, and max content length through the native transport — including redirect targets.
2. Every production client type must **meter egress** (request body bytes via `ConnectorUsageCollector` or an equivalent Actions wiring). `BuildContext` does not expose the collector yet; thread metering through transport deps or extend the context in the same PR.
3. Implement `terminate` for pool eviction; use `isUserError` only for permanent user/config/auth failures.
4. Keep the registry closed: adding a key to `ClientRegistry` / `clientTypes` production-enables `ctx.getClient` for that type and needs explicit review.
5. Prefer library-native redirect and header behavior over reimplementing fetch in the framework.
6. Do not put Actions-plugin-only concerns into generic `BuildContext` unless every client type needs them; close over them in a factory instead.

## Commands

Run from the Kibana repo root:

```bash
# Package unit tests (client types live here)
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/lib/clients

# Typecheck this package
node scripts/type_check --project src/platform/packages/shared/kbn-connector-specs/tsconfig.json
```
