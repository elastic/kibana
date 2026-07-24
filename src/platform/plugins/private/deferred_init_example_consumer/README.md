# Deferred Init Example Consumer

A **disposable demo plugin**, companion to `deferred_init_example`, that exercises the third
deferred-init trigger path: another plugin consuming a lazy plugin's `start()` contract
in-process, with no HTTP request ever hitting the lazy plugin's own routes. It exercises that
trigger path from two different call sites: a route handler, and its own `start()`.

See also `deferred_init_example_dependency`, a companion in the other direction:
`deferred_init_example` calls `loadPluginContract` on *that* plugin from inside its own
`lazyInitialize`, rather than from a route handler.

## What it demonstrates

`requiredPlugins: ["deferredInitExample"]` in `kibana.jsonc` declares the dependency, but this
plugin never uses the synchronous `plugins` argument passed to `setup()`/`start()`. Instead, its
one route handler calls:

```ts
const deferredInitExample =
  await core.plugins.loadPluginContract<DeferredInitExampleStartContract>('deferredInitExample');
const doc = await deferredInitExample.getDoc();
```

`core.plugins.loadPluginContract` waits until `deferredInitExample` has started **and** its
deferred initialization has completed — kicking that initialization off if nobody has hit it yet
— before returning the real, unwrapped contract. If the deferred initialization ultimately fails,
the call rejects with a `DeferredInitializationError`, which (left uncaught here) propagates out of
the route handler to core's central HTTP error handler and becomes a `503` + `Retry-After`.

### Calling `loadPluginContract` from `start()` itself

This plugin's own `start()` also calls `loadPluginContract('deferredInitExample')` directly —
the same pattern Fleet's real dependents (`osquery`, `security_solution`, `cloud_defend`,
`cloud_security_posture`) use to resolve `fleetSetupCompleted()`. If that call rejects with a
*retriable* `DeferredInitializationError`, core retries this plugin's whole `start()` call with
backoff (`PluginsSystem.startPluginWithRetry`), so `start()` has to tolerate being re-invoked from
scratch. This plugin guards the fetch with `if (!this.deferredInitExample)` so a retry that gets
this far again doesn't repeat the fetch (or its log line) — see `server/plugin.ts` and
`server/plugin.test.ts`.

Calling `loadPluginContract` from `start()` used to deadlock unconditionally (core only resolved
those requests once every plugin in the whole system had started, which can't happen until this
very `start()` call returns) — fixed by resolving each request as soon as its specific
dependencies are available, not at the end of the whole boot sequence.

## Endpoint

| Endpoint | Purpose |
| --- | --- |
| `GET /api/deferred_init_example_consumer/doc` | Loads `deferredInitExample`'s contract (waiting for its deferred init) and returns the doc it wrote. |

## Runbook

1. Start a fresh dev server. Confirm `deferredInitExample`'s state is `idle`:
   ```
   curl -s '<base>/internal/core/deferred_init/deferredInitExample'
   # {"pluginId":"deferredInitExample","status":"idle"}
   ```
2. Hit **this** plugin's route (not `deferredInitExample`'s own route):
   ```
   curl -i '<base>/api/deferred_init_example_consumer/doc'
   ```
   This blocks for the full duration of `deferredInitExample`'s deferred init (~3s migrations
   delay + `initDelayMs`, default 5s), then returns `200` with the written doc. Watch the
   `deferredInitExample` logs — its `lazyInitialize` step runs even though nobody ever called
   `GET /api/deferred_init_example/doc`.
3. Set `deferred_init_example.forceFailure: true` and restart. Hitting this plugin's route now
   returns `503` with `retry-after: 1` and body `{"pluginId":"deferredInitExample","status":"initializing"}`
   once the deferred init fails — the central HTTP handler's `DeferredInitializationError` branch,
   not `deferredInitExample`'s own guarded router.

## Why a separate plugin

Calling `core.plugins.loadPluginContract` requires the target to be declared as a dependency in
`kibana.jsonc` (`requiredPlugins`/`optionalPlugins`/`runtimePluginDependencies`) — a plugin cannot
declare itself, so demonstrating the cross-plugin trigger path needs a second plugin.
