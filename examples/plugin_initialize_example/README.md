# Plugin `initialize()` example

`pluginInitializeExample` implements the `initialize()` lifecycle hook and shows how its routes and
start contract wait for it. Run it with:

```sh
node scripts/kibana --dev --run-examples
```

## What `initialize()` is for

`setup()` registers and `start()` returns the contract. Core runs both for every plugin at boot, so
both have to be fast. Expensive Elasticsearch work, such as creating indices or seeding documents,
goes in `initialize()`:

- `initialize(core, plugins)` receives exactly what `start()` receives.
- Core calls it once, after every plugin's `start()` has returned, and does not wait for it. Kibana
  serves HTTP while it runs.
- Core logs a thrown error and leaves it unhandled, like a promise started in `start()` without
  being awaited: production Kibana logs a warning and keeps running, dev Kibana exits. Catch the
  errors the plugin can recover from.
- It runs on every Kibana instance against the same cluster, concurrently and without coordination,
  so the work must be safe to run more than once.

Here `initialize()` waits `initDelayMs`, creates `.kibana_plugin_initialize_example` and writes one
document carrying the instance UUID (`server/plugin.ts:PluginInitializeExampleServerPlugin.initialize`).

## Waiting for it

Core does not hold routes or contract calls until `initialize()` has run. Each route handler and
contract function that needs the initialized state awaits `ctx.initialization.initialize()` itself.
It resolves once the plugin's `initialize()` has finished and rejects with its error when it fails.
Calls made before `initialize()` runs, including during `start()`, wait for it.

`GET /internal/plugin_initialize_example/doc` and the contract's `getDoc()` need the document, so
they await it first:

```sh
# waits for initialize() after boot, then answers with the document
curl -u elastic:changeme -H 'x-elastic-internal-origin: kibana' localhost:5601/internal/plugin_initialize_example/doc
```

## Failure

Set `plugin_initialize_example.failInitialize: true` in `config/kibana.dev.yml` and restart. About
`initDelayMs` after boot, `initialize()` throws `Simulated initialize() failure`. Core logs
`Plugin "pluginInitializeExample" initialize() failed after <n>ms:` followed by the error's stack.
Nothing awaits the failed initialization at that point, so it is an unhandled rejection and dev
Kibana exits. Production Kibana logs a warning and keeps running, and the doc route answers `500`
until a restart.

## Slow `initialize()`

Set `plugin_initialize_example.initDelayMs: 12000`. After 10 s core logs `Plugin
"pluginInitializeExample" initialize() has been running for 10s and has not finished.`. Core never
times `initialize()` out.

## Configuration (`config/kibana.dev.yml`)

| Key | Default | Effect |
| --- | --- | --- |
| `plugin_initialize_example.initDelayMs` | `5000` | How long `initialize()` takes. Above `10000` core's slow `initialize()` warning appears. |
| `plugin_initialize_example.failInitialize` | `false` | `initialize()` throws, and dev Kibana exits on the unhandled rejection. |
