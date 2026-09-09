# Deferred Init Example Consumer

A **disposable demo plugin**, companion to `deferred_init_example`, that exercises the third
deferred-init trigger path: another plugin consuming a lazy plugin's `start()` contract
in-process, with no HTTP request ever hitting the lazy plugin's own routes. It exercises that
trigger path from two different call sites: a route handler, and the contract it returns from its
own `start()`.

See also `deferred_init_example_dependency`, a companion in the other direction:
`deferred_init_example` calls `loadPluginContract` on *that* plugin from inside its own
`lazyInitialize`, rather than from a route handler.

## What it demonstrates

### A lazy dependency is never injected

`kibana.jsonc` declares the dependency as `runtimePluginDependencies: ["deferredInitExample"]`, not
`requiredPlugins`. That is not a style choice: core rejects, at boot, any plugin that lists a
deferred-init plugin under `requiredPlugins`/`optionalPlugins`, because those two lists are exactly
what core copies into a dependent's `setup()`/`start()` `plugins` argument — and that injected
start contract would be backed by Elasticsearch state that does not exist yet. `onStart()` is
rejected for the same reason. `runtimePluginDependencies` keeps the lazy plugin out of the
injection *and* out of the topological sort, so it no longer dictates this plugin's boot order,
while still satisfying the rule that `loadPluginContract` only resolves declared dependencies.

That leaves `loadPluginContract` as the single way in, which is the point: it is the only accessor
that waits for the deferred init.

### Pattern 1: `context.loadPluginContract` in a route handler

```ts
const deferredInitExample =
  await context.loadPluginContract<DeferredInitExampleStartContract>('deferredInitExample');
const instanceState = deferredInitExample.getInstanceState();
const doc = await deferredInitExample.getDoc();
```

The request handler context exposes the loader scoped to the plugin that registered the route, so
there is no need to close over `core` just to reach it. The call waits until `deferredInitExample`
has started **and** its deferred initialization has completed — kicking that initialization off if
nobody has hit it yet — before returning the real contract. If the deferred initialization
ultimately fails, the call rejects with a `DeferredInitializationError`, which (left uncaught here)
propagates out of the route handler to core's central HTTP error handler and becomes a `503` +
`Retry-After` with body `{ pluginId, status }`.

The two reads afterwards have deliberately different flavors: `getDoc()` reads cluster-side state
that any instance's run could have written, while `getInstanceState()` reads memory warmed by
*this* instance's own `lazyInitialize`. The second one needs no readiness check precisely because
deferred init is per instance now — `loadPluginContract` resolving here means the work ran here.

### Pattern 2: the function-in-contract pattern in `start()`

```ts
public start(core: CoreStart): DeferredInitExampleConsumerStartContract {
  return {
    getDeferredInitExample: () =>
      core.plugins.loadPluginContract<DeferredInitExampleStartContract>('deferredInitExample'),
  };
}
```

`start()` returns a *function* that loads the lazy dependency; whoever consumes this contract calls
it post-boot. Awaiting `loadPluginContract` for a lazy plugin inside `setup()`/`start()` itself is
rejected by core's start-cycle guard with an explicit error — blocking a lifecycle on the very work
that was deferred would stall boot past its watchdog and defeat lazy initialization. The same guard
covers a lazy plugin's own `core.plugins.lazyInit.waitForInit()`.

This is the shape Fleet's real dependents (`osquery`, `security_solution`, `cloud_defend`,
`cloud_security_posture`) use to resolve `fleetSetupCompleted()`: hand out a deferred accessor, let
the caller await it when it actually needs the data. `server/plugin.test.ts` pins both halves —
that `start()` loads nothing, and that the returned function resolves (or rejects) when invoked.

> Calling `loadPluginContract` from `start()` for an **ordinary, non-lazy** dependency used to
> deadlock unconditionally, because core only resolved those requests once every plugin in the
> whole system had started — which can't happen until this very `start()` call returns. Core now
> resolves each request as soon as its own dependencies have started, so that case works. It is
> only *lazy* dependencies that must be awaited post-boot.

## Endpoint

| Endpoint | Purpose |
| --- | --- |
| `GET /api/deferred_init_example_consumer/doc` | Loads `deferredInitExample`'s contract (waiting for its deferred init) and returns `{ doc, instanceState }` — the cluster-side document it wrote plus the in-memory state it warmed on this instance. |

## Runbook

1. Start a fresh dev server. Confirm `deferredInitExample`'s state is `idle`:
   ```
   curl -s '<base>/internal/core/deferred_init/deferredInitExample'
   # {"pluginId":"deferredInitExample","status":"idle"}
   ```
   (Poll it at most once — that core route doubles as a trigger.)
2. Hit **this** plugin's route (not `deferredInitExample`'s own route):
   ```
   curl -i '<base>/api/deferred_init_example_consumer/doc'
   ```
   This blocks for the full duration of `deferredInitExample`'s deferred init (~3s migrations
   delay + `initDelayMs`, default 5s), then returns `200` with `{ doc, instanceState }`. Watch the
   `deferredInitExample` logs — its `lazyInitialize` step runs even though nobody ever called
   `GET /api/deferred_init_example/doc`. `instanceState.instanceUuid` is this instance's UUID:
   the deferred work ran *here*, on the instance serving this request, not on some peer that
   already did it for the deployment.
3. Set `deferred_init_example.forceFailure: true` and restart. Hitting this plugin's route now
   returns `503` with `retry-after: 1` and body
   `{"pluginId":"deferredInitExample","status":"failed"}` once the deferred init fails — the
   central HTTP handler's `DeferredInitializationError` branch, not `deferredInitExample`'s own
   guarded router. Core keeps retrying the failed init on its backoff curve and, once background
   retries are exhausted, on every subsequent hit to this route — so a failure whose cause clears
   (an unhealthy cluster coming up, rather than this demo's hardcoded `forceFailure`) recovers
   without a Kibana restart.

## Why a separate plugin

Calling `loadPluginContract` requires the target to be declared as a dependency in `kibana.jsonc`
(`requiredPlugins`/`optionalPlugins`/`runtimePluginDependencies`) — a plugin cannot declare itself,
so demonstrating the cross-plugin trigger path needs a second plugin.
