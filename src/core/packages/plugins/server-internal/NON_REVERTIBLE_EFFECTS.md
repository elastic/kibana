# Non-Revertible Effects

Cordis's temporal composability dimension promises revertible effects: when a fiber is disposed, every
`ctx.effect(() => () => cleanup())` disposer runs and the effect is undone.  Kibana inherits this
model for the plugin *lifecycle* — `plugin.stop()` is wired into each plugin fiber's disposal chain
as of Stage 3.

**However**, the following registries are permanently append-only.  Disposing a plugin fiber calls
`plugin.stop()`, but it cannot un-register anything below.  Hot-reload (runtime enable/disable) and
HMR are therefore **not** enabled by this migration; they require dedicated unregistration support
that is tracked separately.

## Append-only registries (as of 2026-08-14)

| Capability | File(s) | Why non-revertible |
|---|---|---|
| HTTP routes (hapi) | `src/core/packages/http/server-internal/src/http_server.ts` | hapi has no route-removal API; routes are compile-time |
| Saved object type schemas | `src/core/packages/saved-objects/migration-server-internal/` | Migrations run once; removing a type after migration would orphan data |
| UI settings (defaults) | `src/core/packages/ui-settings/server-internal/src/ui_settings_service.ts` | `register()` throws on duplicate key but has no `unregister()` |
| Capabilities | `src/core/packages/capabilities/server-internal/src/capabilities_service.ts` | `registerProvider()` accumulates providers; no removal path |
| Feature registrations (x-pack) | `x-pack/platform/plugins/private/features/server/feature_registry.ts` | `register()` appends; privileges are baked into Elasticsearch roles at start |
| Analytics event types | `src/core/packages/analytics/server-internal/src/analytics_service.ts` | Event type schemas are registered once; removing a type would break in-flight telemetry |
| Deprecations | `src/core/packages/deprecations/server-internal/src/deprecations_service.ts` | `registerDeprecations()` accumulates; no `unregister()` |
| Route handler contexts | `src/core/packages/http/server-internal/src/context_service.ts` | `registerContext()` writes to a shared Map; never removed |

## What IS revertible

- **Plugin lifecycle** (`plugin.stop()`): wired via `ctx.effect` in the setup adapter; runs
  automatically when the plugin's Cordis fiber is disposed.
- **Preboot teardown**: the preboot `PluginsSystem` has a separate Cordis root context.  Disposing it
  stops all preboot plugins cleanly before standard setup begins.  This is the one place where
  Cordis's temporal dimension provides a genuine benefit today — both production preboot plugins
  (`interactiveSetup`, `prebootExample`) have no append-only registrations.

## Path to full revertibility

Each append-only registry above needs its own unregistration mechanism before the plugin that
registered it can be hot-reloaded.  HTTP route removal is the hardest (requires a dispatch-table
indirection in front of hapi) and is the primary blocker for general-purpose HMR.  Saved object
types are permanently non-revertible after migrations run and must be excluded from any hot-reload
scheme.
