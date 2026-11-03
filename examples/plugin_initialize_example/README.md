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
- A thrown error shuts Kibana down, like a thrown `setup()` or `start()`. Catch the errors the
  plugin can recover from.
- It runs on every Kibana instance against the same cluster, concurrently and without coordination,
  so the work must be safe to run more than once.

Here `initialize()` waits `initDelayMs`, creates `.kibana_plugin_initialize_example` and writes one
document carrying the instance UUID (`server/plugin.ts:PluginInitializeExampleServerPlugin.initialize`).

## Waiting for it

Core does not hold routes or contract calls until `initialize()` has run. Each route handler and
contract function decides for itself, through `ctx.initialization`:

| Member | Behaviour |
| --- | --- |
| `initialize()` | Resolves once the plugin is `available`, rejects when its `initialize()` fails, and rejects during `setup()` and `start()`, where waiting would block boot. |
| `status$` | Emits the current status (`idle`, `initializing`, `available` or `failed`), then every change. |
| `getStatus()` | The current status. |

This plugin shows both choices:

- `GET /internal/plugin_initialize_example/doc` and the contract's `getDoc()` need the document, so
  they await `initialize()` first.
- `GET /internal/plugin_initialize_example/status` and the contract's `getStatus()` do not, so they
  answer at once.

```sh
# answers at once with the status
curl -u elastic:changeme -H 'x-elastic-internal-origin: kibana' localhost:5601/internal/plugin_initialize_example/status
# waits for initialize() after boot, then answers with the document
curl -u elastic:changeme -H 'x-elastic-internal-origin: kibana' localhost:5601/internal/plugin_initialize_example/doc
```

A route that should not keep the client waiting can instead answer `503` while `getStatus()` is not
`available`.

The constructor also subscribes to `status$` and logs each transition.

## Failure

Set `plugin_initialize_example.failInitialize: true` in `config/kibana.dev.yml` and restart. About
`initDelayMs` after boot, `initialize()` throws `Simulated initialize() failure` and Kibana shuts
down with `Plugin "pluginInitializeExample" initialize() failed: Simulated initialize() failure`.

## Slow `initialize()`

Set `plugin_initialize_example.initDelayMs: 12000`. After 10 s core logs `Plugin
"pluginInitializeExample" initialize() has been running for 10s and has not finished.`. Core never
times `initialize()` out.

## Configuration (`config/kibana.dev.yml`)

| Key | Default | Effect |
| --- | --- | --- |
| `plugin_initialize_example.initDelayMs` | `5000` | How long `initialize()` takes. Above `10000` core's slow `initialize()` warning appears. |
| `plugin_initialize_example.failInitialize` | `false` | `initialize()` throws, which shuts Kibana down. |
