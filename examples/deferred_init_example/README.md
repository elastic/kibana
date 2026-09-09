# Deferred Init Example

A **disposable demo plugin** that exercises core's deferred (lazy) Elasticsearch initialization
end-to-end. It is not meant to ship — it exists to show the developer experience (how a plugin
opts in) and the user experience (what someone sees when they hit a not-yet-initialized resource).

## What it demonstrates

- **Boot pays nothing.** The plugin's Elasticsearch work does **not** run at startup. It runs lazily,
  the first time one of the plugin's routes is hit.
- **Automatic, plugin-wide gating.** While init is pending, every one of the plugin's HTTP routes
  returns `503 { pluginId, status }` + `Retry-After`. The plugin author writes no per-route
  gating code.
- **Observable state.** An always-available core endpoint and the plugin's `/status` entry reflect
  `idle → initializing → available | failed`.
- **Per-instance, in-memory init.** Core tracks the state in memory per Kibana instance (like any
  plugin's `/status` entry) — no distributed lock, no shared saved object. Each instance behind a
  load balancer runs `lazyInitialize` once, on its own first trigger.
- **Instance-local state is a first-class use case.** Because every instance runs the work,
  `lazyInitialize` can warm in-process state and the rest of the plugin can just read it: this
  plugin assigns `this.instanceState` at the end of its run and serves it synchronously from
  `getInstanceState()` on its start contract and from
  `GET /api/deferred_init_example/instance_state`, with no readiness check at either call site.
- **Idempotency instead of exclusivity.** The flip side of running everywhere: the cluster-side work
  tolerates peers doing it concurrently — the index create swallows
  `resource_already_exists_exception`, and the document write uses a fixed id so the loser of a
  race overwrites rather than fails.
- **Clean UX, zero plugin code.** Core automatically wraps this app's `mount()` behind
  `<AppInitializingGate>`: a full-page "Initializing…" interface that resolves to the real content
  (or an error + reload on failure). `public/app.tsx` contains no polling, triggering, or gating
  code at all — see `core.deferredInit` (`@kbn/core-deferred-init-browser`) if you need to build
  custom UI against the same status observable instead of relying on the automatic gate.

## The opt-in (developer experience)

The entire opt-in is **one flag + one method**: `enableLazyInitialize: true` in the plugin's
`kibana.jsonc` manifest, and a `lazyInitialize` method on the server plugin class
(`server/plugin.ts`):

```ts
public async lazyInitialize(ctx: LazyInitContext): Promise<void> {
  // real, deferred ES work: ctx.elasticsearch.client, ctx.savedObjects, ctx.logger
}
```

Routes are registered normally (`core.http.createRouter()`); core wraps them automatically. The
browser app is registered normally too (`core.application.register()`); core wraps its `mount()`
automatically as well, driven by the same manifest flag.

> The deferred work here is a **stand-in** for "migrations + ES init", run in five phases: (1) a
> fake ~3s "saved object migrations" delay, (2) a configurable "default state" delay
> (`initDelayMs`), (3) loading `deferredInitExampleDependency`'s start contract (see below), (4) a
> small, real, direct ES write (create index + mapping tolerating a concurrent peer, write one doc
> at a fixed id, including the greeting from step 3), (5) publishing the instance-local state read
> by `getInstanceState()`. It does **not** touch core saved-object migrations. The app lists these
> phases once init completes.

## Per-instance initialization: the guarantee and the requirement

Deferred init used to be serialized across the deployment: a `@kbn/lock-manager` distributed lock
around the run, plus a saved object recording the outcome so instances that booted later adopted
`available` and skipped `lazyInitialize` entirely. Both are gone. Deferred-init state is now per
instance and in memory only, exactly like every plugin's `/status` entry.

**What that guarantees**, and what this plugin leans on:

- `lazyInitialize` runs exactly once on the instance serving you. Everything downstream of it
  *on that instance* — the plugin's gated routes, a `loadPluginContract` consumer running there —
  is downstream of that instance's own successful run.
- So instance-local preconditions become expressible: downloading a binary, warming an in-process
  cache, populating module-scoped state. None of those are satisfied by a run that happened on some
  other instance, which is precisely what the old shared-state fast path used to skip.
- A plain instance field is therefore a legitimate place to put deferred-init output.
  `getInstanceState()` asserts rather than reporting readiness (it throws if the field is unset),
  because no legitimate caller can observe it unset.

**What it demands** in exchange:

- Idempotent cluster-side work, not exclusive work: several instances may run the same
  `lazyInitialize` concurrently against one cluster. Create-if-missing, fixed document ids,
  overwrite-safe writes.
- Publish in-memory state in a single assignment at the end of the run. A failed attempt is re-run
  from the top on the same instance, not resumed, so partially-warmed state would be a hazard —
  see phase 5 in `server/plugin.ts`.
- Nothing is persisted, so a restart puts the instance back at `idle` and the work runs again.

## Calling another plugin's start contract from inside `lazyInitialize`

`LazyInitContext` (the `ctx` passed to `lazyInitialize`) only carries
`{ elasticsearch, savedObjects, logger }` — no `core`/`plugins` field, by design (core stays
generic; it doesn't hand a lazy plugin's deferred work arbitrary access to every other plugin).
When `lazyInitialize` genuinely needs another plugin's start contract — here, a normal (non-lazy)
required dependency, `deferredInitExampleDependency` — the pattern is:

1. Capture `core: CoreStart` on `this` during `start()`, since that's the only lifecycle method
   that receives it.
2. Declare the target as a dependency in `kibana.jsonc`, same requirement as any other
   `loadPluginContract` call. An ordinary plugin goes in `requiredPlugins`/`optionalPlugins` as
   usual; a target that is *itself* deferred-init must go in `runtimePluginDependencies`, since
   core rejects lazy plugins in the first two lists (see `deferred_init_example_consumer`).
3. Call `this.core.plugins.loadPluginContract<T>('pluginId')` from inside `lazyInitialize` itself.

```ts
private core?: CoreStart;

public start(core: CoreStart): DeferredInitExampleStartContract {
  this.core = core;
  // ...
}

public async lazyInitialize(ctx: LazyInitContext): Promise<void> {
  // ...
  const dependency = await this.core!.plugins.loadPluginContract<DeferredInitExampleDependencyStartContract>(
    'deferredInitExampleDependency'
  );
  const greeting = dependency.getGreeting();
  // ...
}
```

`lazyInitialize` is a safe place for this because it always runs strictly after boot, so it is
outside core's start-cycle guard: awaiting a *lazy* dependency's contract from inside `setup()` or
`start()` is rejected outright (it would block boot on the very work being deferred), while
`lazyInitialize` — like a route handler or a task runner — is free to wait. See
`deferred_init_example_dependency`'s README for the companion side of this demo. The real-world
case this generalizes is Fleet, which will need `licensing`'s start contract inside its own future
`lazyInitialize`.

## Prerequisites

- A Kibana dev server connected to Elasticsearch. This is a private platform plugin, so it
  auto-loads in dev (no `--run-examples` needed).
- If you just added this plugin to a tree that was already bootstrapped, run `yarn kbn bootstrap`
  once so the new package is registered, then start the dev server.

## Configuration

Config namespace is `deferred_init_example` (set in `kibana.yml` / `kibana.dev.yml`):

| Key | Default | Meaning |
| --- | --- | --- |
| `deferred_init_example.initDelayMs` | `5000` | "Default state" phase delay (ms). Total init is this plus a fixed ~3s migrations phase, so `initializing` is comfortably observable. |
| `deferred_init_example.forceFailure` | `false` | When `true`, `lazyInitialize` throws after the migrations phase (exercises the failure/retry path). |

## Endpoints

| Endpoint | Gated? | Purpose |
| --- | --- | --- |
| `GET /api/deferred_init_example/doc` | Yes (by core) | Returns the cluster-side doc written by `lazyInitialize`. First hit returns `503` and **triggers** the deferred init. |
| `GET /api/deferred_init_example/instance_state` | Yes (by core) | Returns the in-memory state this instance's own `lazyInitialize` warmed (`instanceUuid`, `initializedAt`, `completedPhases`). |
| `GET /internal/core/deferred_init/deferredInitExample` | No (core route) | Returns `{ pluginId, status }`, plus `error` and `attempts` while `failed`. Core's `deferredInit` browser service polls this on the app's behalf. Reading it also acts as a nudge: it kicks an `idle` plugin, and a `failed` one once background retries are exhausted (see below). |
| `GET /api/status` | No | Overall status; the `plugin:deferredInitExample` entry reflects the deferred-init state. |

(Add the base path if your dev server uses one, e.g. `…/ora/api/status`.)

## Failure, retries, and recovery

A run that throws flips the plugin to `failed` and leaves its routes returning `503`. Recovery is
automatic and needs no restart:

- **Background retries.** Core schedules a jittered exponential cooldown before the plugin becomes
  retriable again: full jitter, a ~1s upper bound for the first retry, doubling per attempt, capped
  at 5 minutes. The numbers are Fleet's battle-tested Serverless profile (`retrySetupOnBoot`,
  kibana#167246), which was tuned for clusters that can take five minutes to come up cold. Full
  jitter also keeps a fleet of instances failing against the same unhealthy cluster from retrying
  in lockstep.
- **On-demand recovery.** After 25 consecutive failures core stops scheduling unsolicited retries.
  From then on any incoming gated request — or a status poll, or a consumer's
  `loadPluginContract` — kicks a fresh attempt instead, so a plugin whose cluster finally came back
  recovers on the next hit rather than on a Kibana restart.
- **Scope.** The failure is local to one instance and to one plugin: `/status` reports `degraded`
  (not `unavailable`) for `plugin:deferredInitExample`, other plugins stay `available`, and peer
  instances are unaffected.

## Runbook: reproduce the full flow

1. **Boot pays nothing.** Start the dev server. In the logs, confirm the readiness line
   `http server running` appears **without** the line
   `[deferredInitExample] lazyInitialize: running deferred Elasticsearch initialization`.
   Confirm the state endpoint reports `idle` before any request:
   ```
   curl -s '<base>/internal/core/deferred_init/deferredInitExample'
   # {"pluginId":"deferredInitExample","status":"idle"}
   ```
   (That read is itself a trigger — it kicks the work like a gated request would, so run it once
   and expect the next poll to report `initializing`.)

2. **Lazy on first request.** Hit the data route — the first call returns `503` and triggers init:
   ```
   curl -i '<base>/api/deferred_init_example/doc'
   # HTTP/1.1 503 ... retry-after: 1   body: {"pluginId":"deferredInitExample","status":"initializing"}
   ```
   The `lazyInitialize` log line now appears. The state endpoint transitions
   `idle → initializing → available` over ~3s (migrations) + `initDelayMs` (default state). After it
   is `available`, the same route returns `200` with the written doc:
   ```
   curl -s '<base>/api/deferred_init_example/doc'
   # {"message":"Initialized by deferred lazyInitialize","greeting":"...","initializedAt":"...","initializedBy":"<instance uuid>"}
   ```

3. **See the instance-local half.** Hit the instance-state route:
   ```
   curl -s '<base>/api/deferred_init_example/instance_state'
   # {"instanceUuid":"<instance uuid>","initializedAt":"...","completedPhases":["savedObjectMigrations","defaultState","loadedDependencyContract","wroteDefaultDocument"]}
   ```
   Nothing cluster-side backs this: it is the plugin object's own memory on the instance that
   served the request. `initializedBy` in step 2 is the same value, which is how you can tell which
   instance last ran the shared write when several are behind a load balancer.

4. **In the browser (UX).** Open **Deferred Init Example** (app id `deferredInitExample`, at
   `<base>/app/deferredInitExample`). On a fresh server you see the full-page "Initializing…"
   interface — rendered by core, before the plugin's own `mount()` ever runs — that resolves to
   the written document plus the in-memory state once init completes. The app's static bundle loads
   while gated because it is served by core, not by the plugin's API routes.

5. **Watch `/status`.** While initializing, `GET /api/status` shows `plugin:deferredInitExample` as
   `available`, with the lifecycle state in the summary ("deferredInitExample is initializing
   (deferred initialization in progress)"). Deferring work is a healthy state, so it must not drag
   the reported `overall` status down; once done, the summary changes but the level does not.

6. **Failure path.** Set `deferred_init_example.forceFailure: true`, restart the dev server, open the
   app (or hit either route). After the migrations delay the gate shows its error panel with the
   `lazyInitialize` error message, a count of automatic retries, and a **Reload page** button; the
   state endpoint reports `failed` (with `error` and `attempts`), and `/status` shows `degraded`
   ("deferred initialization failed") — scoped to this plugin on this instance, so other plugins
   stay `available`. Core keeps retrying in the background on the cooldown curve above, and the
   attempt counter in the error panel climbs as it does. (**Reload page** re-attaches the gate to
   that state; while background retries are still scheduled it does not force an extra attempt of
   its own — only once the 25 are spent does a poll or request become the trigger.) The run keeps
   failing here only because `forceFailure` makes it deterministic; for a real plugin, whose
   failure usually means the cluster isn't ready yet, that curve is what recovers it once the
   cluster is — no restart, no operator action. Clearing this demo's `forceFailure` does mean
   restarting the dev server, since the plugin reads that config once at construction.

## Triggering paths

- **Request-triggered (headline path):** any hit to a gated route triggers the deferred work via
  core's `ensureInitialized`. This is what the UI relies on.
- **In-process, cross-plugin:** `start()` returns a real contract, `{ getDoc, getInstanceState }`
  (see `DeferredInitExampleStartContract` in `server/plugin.ts`). Core never injects that contract
  into a dependent's `setup()`/`start()` arguments — a deferred-init plugin may not be declared
  under `requiredPlugins`/`optionalPlugins` at all — so dependents declare it under
  `runtimePluginDependencies` and read it with
  `core.plugins.loadPluginContract<DeferredInitExampleStartContract>('deferredInitExample')` (or
  `context.loadPluginContract` inside a route handler), which waits for this plugin's deferred init
  (kicking it off if nobody has yet) before handing back the contract, and throws
  `DeferredInitializationError` if the deferred init ultimately fails. See the companion
  `deferred_init_example_consumer` plugin for a full runbook of this path — it calls `getDoc()`
  and `getInstanceState()` without ever touching this plugin's own routes.
- **Programmatic:** core's deferred-init engine also exposes `trigger(pluginId)` internally; a
  production control plane would call it. There's no separate public programmatic trigger for
  that — `loadPluginContract` (above) is the supported way for another plugin to drive/await it.
  A lazy plugin can also gate its own background work on its own init with
  `core.plugins.lazyInit.waitForInit()` from a task runner.

## Resetting

Each dev-server restart resets the in-process deferred-init state back to `idle`, so you can re-run
the flow from the top after every restart.
