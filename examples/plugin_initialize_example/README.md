# Plugin `initialize()` example

Two example plugins demonstrate the `initialize()` lifecycle hook end to end. This one,
`pluginInitializeExample`, implements the hook; `../plugin_initialize_example_consumer` depends on
it. Run both with:

```sh
node scripts/kibana --dev --run-examples
```

## What `initialize()` is for

`setup()` registers, `start()` returns the contract, and core runs both for every plugin at boot in
dependency order, so both have to be fast (core warns when `start()` takes more than 1 s).
Expensive Elasticsearch work (creating indices, seeding documents, migrating data) goes in
`initialize()`:

- `kibana.jsonc` sets `"hasInitialization": true`, so core knows before any plugin code runs. Core
  throws at boot when the flag and the method disagree.
- `initialize(core, plugins)` receives exactly what `start()` receives. Core alone decides when it
  runs: today right after the start loop (`plugins.initializeOnBoot: true`, the default), otherwise
  on the first request, app load or call that needs the plugin. The plugin code is identical in
  both cases.
- A thrown error never fails boot. Core retries with a jittered exponential backoff and the plugin
  reports `failed` in the meantime. Success is sticky for the lifetime of the process.
- It runs on every Kibana instance against the same cluster, concurrently and without coordination,
  so the work must be safe to run more than once (see [Concurrency](#concurrency)).

Here `initialize()` waits `initDelayMs`, creates `.kibana_plugin_initialize_example` and writes one
document carrying the instance UUID and the attempt number
(`server/plugin.ts:PluginInitializeExampleServerPlugin.initialize`).

## The status API

`ctx.initialization` on the initializer context is the plugin's own view of its `initialize()`:

| Member | Behaviour |
| --- | --- |
| `initialize()` | Resolves at once when `available`, joins an attempt in flight, otherwise starts one right away (even while a retry is scheduled). Rejects with a `PluginInitializationError` when that attempt fails, and during `setup()`/`start()`, where awaiting it would block boot. |
| `status$` | Replays the current `{ state, attempts, lastError? }` and never triggers anything. |
| `getStatus()` | Synchronous snapshot of the same; never triggers anything. |

`start()` returns its contract synchronously. A contract function that needs initialized state
awaits `initialize()` itself; one that does not never calls it:

```ts
constructor(ctx: PluginInitializerContext) {
  this.initialization = ctx.initialization;
}

start() {
  return {
    search: async () => {
      await this.initialization.initialize();
      // work that needs the indices
    },
    getLabel: () => 'no init needed',
  };
}
```

In this plugin that pair is `getDoc()` and `getInstanceInfo()`
(`server/plugin.ts:PluginInitializeExampleServerPlugin.start`). The constructor also subscribes to
`status$` and logs each transition, and `start()` arms a 60 s heartbeat that reads `getStatus()`
and returns early until `available`: the shape for any callback that runs on its own schedule (a
task runner, a poller) and can neither wait nor trigger.

## What core gates, and what it does not

While `initialize()` has not succeeded on an instance:

- Every route registered through the plugin's router (`core.http.createRouter()`) answers `503`
  with `Retry-After: 1` and the body `{ "pluginId": "pluginInitializeExample", "status": "..." }`.
  The first such request also starts `initialize()` if nothing else has.
- The plugin's browser apps show core's "Initializing Application" screen in place of the app, and
  the real `mount()` runs once the plugin is `available`.
- Routes registered through `core.http.resources` are **not** gated.

```sh
curl -i localhost:5601/plugin_initialize_example/health   # 200 at any time; shows the current status
curl -i localhost:5601/api/plugin_initialize_example/doc  # 503 + Retry-After until available, then the document
```

`/api/plugin_initialize_example/status` sits on the gated router too, so once it answers it can
only say `available`. The health page above and the consumer's status route are the ungated views.

## Failure and recovery

Set `plugin_initialize_example.failAttempts: 2` in `config/kibana.dev.yml` and restart. The first
two attempts throw `Simulated initialize() failure <n> of 2`:

- The logs show `Plugin "pluginInitializeExample" initialize() failed (attempt 1): ... Retrying in
  <n>s.` (jittered, so the first retry may say `0s`), the retry, then `initialized in <n>ms`. This
  plugin's own `status$` lines go `initializing`, `failed (attempts: 1, lastError: ...)`,
  `initializing`, ... `available`.
- `/plugin_initialize_example/health` and `/api/plugin_initialize_example_consumer/status` carry
  `attempts` and `lastError` while `failed`.
- `GET /api/status` lists `pluginInitializeExample` as `degraded` while `failed`, never
  `unavailable`: the failure is local to this instance and this plugin. `idle` and `initializing`
  report `available`, so a plugin that has simply not run `initialize()` yet never drags the overall
  status down.
- Recovery without waiting for the backoff: `curl localhost:5601/api/plugin_initialize_example_consumer/doc`
  calls this plugin's `getDoc()`, whose `initialize()` starts a fresh attempt immediately.
  `curl -X POST localhost:5601/api/plugin_initialize_example_consumer/initialize` goes through
  `core.plugins.initializePlugin()` instead, which waits out the scheduled retry.
- With `failAttempts: 30`, background retries stop after 25 consecutive failures (`No more
  background retries; the next request or initialize() call will try again.`). From then on any
  request to a gated route, the app's status poll, or any `initialize()` call starts the next
  attempt.

## At boot, or on first use

1. Default, `plugins.initializeOnBoot: true`. Boot logs, in order:
   ```
   Plugin "pluginInitializeExample" has an initialize() hook; its routes and apps are served once it has run.
   Running initialize() for 1 plugin(s) now that all plugins have started.
   Plugin "pluginInitializeExample": running initialize().
   Plugin "pluginInitializeExample" initialized in 5003ms; its routes and apps are now served.
   ```
   The health page goes `initializing` then `available`; routes 503 for about `initDelayMs`, then
   serve.
2. Set `plugins.initializeOnBoot: false` in `config/kibana.dev.yml` and restart. Boot stops after
   the first line above; nothing from this plugin runs. The health page says `"state": "idle"`,
   `GET /api/status` says `pluginInitializeExample is idle (initialize() has not run yet)`, and the
   consumer's status route reports `"dependency": { "state": "idle", "attempts": 0 }`.
3. Make the first request: `curl -i localhost:5601/api/plugin_initialize_example/doc` answers
   `503` with `"status": "initializing"`: the gated router kicks `initialize()` and reports the
   state after the kick, and `running initialize().` appears in the logs. Or open
   `localhost:5601/app/pluginInitializeExample` and watch the loading screen do the same. About
   `initDelayMs` later the status is `available`, the route serves and the app mounts.

No plugin code changes between the two modes. On a node without the `ui` role core runs
`initialize()` right after boot regardless of the setting, since no request could ever reach it.

## Slow-work warnings

- `plugin_initialize_example.initDelayMs: 12000`: after 10 s core logs `Plugin
  "pluginInitializeExample" initialize() has been running for 10s and has not finished. Its routes
  and apps stay unavailable until it does.` Attempts are never timed out; the attempt finishes 2 s
  later.
- `plugin_initialize_example.slowStartMs: 1500`: `start()` returns a promise resolved 1.5 s later.
  In dev mode core notes `Plugin pluginInitializeExample is using asynchronous start lifecycle.`
  and then warns `Start lifecycle of "pluginInitializeExample" plugin took 150xms, which exceeds
  1s. Move initialization work (...) into the plugin's initialize() hook so start() returns
  immediately.` Keep it below 10 s: above that, core's hard timeout fails boot.

## Concurrency

Initialization state is per Kibana instance and in memory only, like every plugin's `/status`
entry; nothing is persisted and no cross-instance lock exists. Instances behind a load balancer
each run `initialize()`, concurrently, against one cluster, so make the work idempotent:
create-if-missing (this plugin tolerates `resource_already_exists_exception`), fixed document ids,
overwrite-safe writes. The document's `instanceUuid` says which instance wrote last;
`getInstanceInfo()` says what *this* instance's run produced.

## Configuration (`config/kibana.dev.yml`)

| Key | Default | Effect |
| --- | --- | --- |
| `plugin_initialize_example.initDelayMs` | `5000` | Duration of `initialize()`; above `10000` core's slow-attempt warning appears. |
| `plugin_initialize_example.failAttempts` | `0` | The first N attempts throw `Simulated initialize() failure <n> of <N>`. |
| `plugin_initialize_example.slowStartMs` | `0` | When > 0, `start()` awaits this long before returning; above `1000` core's slow-start warning appears, above `10000` boot fails. |
| `plugins.initializeOnBoot` | `true` | Core setting: run every `initialize()` right after the start loop, or on first use. |

## Scenarios

| # | Scenario | Where |
| --- | --- | --- |
| S1 | Sync start contract with one function that awaits `initialize()` and one that never does | `server/plugin.ts:PluginInitializeExampleServerPlugin.start` (`getDoc`, `getInstanceInfo`) |
| S2 | Router routes answer 503 + `Retry-After`; `httpResources` stays ungated | `server/plugin.ts:PluginInitializeExampleServerPlugin.setup` (`DOC_ROUTE` vs `HEALTH_PATH`) |
| S3 | Loading screen, then the app mounts | `public/plugin.ts:PluginInitializeExamplePlugin.setup` |
| S4 | `status$` transitions logged; `getStatus()` guard in a scheduled callback | `server/plugin.ts:PluginInitializeExampleServerPlugin` (constructor, heartbeat in `start`) |
| S5 | Failure, backoff retries, recovery | `server/config.ts:failAttempts`, `server/plugin.ts:PluginInitializeExampleServerPlugin.initialize` |
| S6 | A dependent receives the contract at boot through `requiredPlugins` | `../plugin_initialize_example_consumer/server/plugin.ts:PluginInitializeExampleConsumerServerPlugin.start` |
| S7 | Cross-plugin API: `initializePlugin`, `pluginInitStatus$`, `getPluginInitStatus` | `../plugin_initialize_example_consumer/server/plugin.ts:PluginInitializeExampleConsumerServerPlugin.setup` |
| S8 | A plugin without `initialize()` reports `available` once started | `../plugin_initialize_example_consumer/server/plugin.ts:PluginInitializeExampleConsumerServerPlugin.setup` (`self` in `STATUS_ROUTE`) |
| S9 | Same code at boot and on first use | [At boot, or on first use](#at-boot-or-on-first-use); `server/plugin.ts:PluginInitializeExampleServerPlugin.initialize` |
| S10 | Slow `initialize()` and slow `start()` warnings | `server/config.ts:initDelayMs`, `server/config.ts:slowStartMs` |
