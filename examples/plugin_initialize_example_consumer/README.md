# Plugin `initialize()` example: consumer

`pluginInitializeExampleConsumer` depends on `pluginInitializeExample`
(`../plugin_initialize_example`), which implements `initialize()`. This plugin has no
`initialize()` of its own; it shows what a dependent sees and does.

## The dependency arrives at boot

`kibana.jsonc` lists `"requiredPlugins": ["pluginInitializeExample"]` and nothing else. Core runs
`start()` for every plugin at boot, in dependency order, and injects the dependency's contract the
way it always has:

```ts
public start(_core: CoreStart, plugins: PluginInitializeExampleConsumerStartDeps) {
  const { pluginInitializeExample } = plugins;
  this.example = pluginInitializeExample;
  return { getDependencyDoc: () => pluginInitializeExample.getDoc() };
}
```

Receiving the contract waits for nothing. Its functions that need initialized state wait for the
dependency's `initialize()` themselves when called, so this plugin hands them out without checking
anything (`server/plugin.ts:PluginInitializeExampleConsumerServerPlugin.start`).

## Three cross-plugin calls, and when each triggers work

All three live in `setup()` (`server/plugin.ts:PluginInitializeExampleConsumerServerPlugin.setup`)
and require the target to be a declared dependency of the caller. This plugin has no
`initialize()`, so none of its routes are gated.

| Route | Call | Triggers work? |
| --- | --- | --- |
| `GET /api/plugin_initialize_example_consumer/doc` | `getDoc()` on the injected contract | Yes. The dependency awaits its own `initialize()`, which starts an attempt immediately when `idle` or `failed`, even while a background retry is scheduled. If the attempt fails, the `PluginInitializationError` it rejects with escapes the handler and core's router answers `503` + `Retry-After: 1`. |
| `GET /api/plugin_initialize_example_consumer/status` | `core.plugins.getPluginInitStatus('pluginInitializeExample')` and this plugin's own `ctx.initialization.getStatus()` | Never. Returns `{ self, dependency }`, each `{ state, attempts, lastError? }`. |
| `POST /api/plugin_initialize_example_consumer/initialize` | `core.plugins.initializePlugin('pluginInitializeExample')` | Waits. Joins an attempt in flight, waits out a scheduled retry rather than forcing one, and starts an attempt only when the dependency is `idle` or its background retries are exhausted. Rejects (`503`) if the attempt it observes fails; returns the dependency status otherwise. |

`setup()` also subscribes to `core.plugins.pluginInitStatus$('pluginInitializeExample')` and logs
every transition as `pluginInitializeExample initialize() status: <state> (attempts: <n>...)`. The
subscription replays the current value, never triggers anything, and is dropped in `stop()`.

### Immediate retry vs waiting out the backoff

With `plugin_initialize_example.failAttempts: 3` the dependency sits in `failed` between retries,
and the two triggering routes behave differently:

- `curl localhost:5601/api/plugin_initialize_example_consumer/doc` reaches the dependency's own
  `initialize()`, which cancels the pending retry and starts a new attempt right now.
- `curl -X POST localhost:5601/api/plugin_initialize_example_consumer/initialize` waits for the
  scheduled retry to fire and reports the outcome of that attempt.

Either way the response arrives once an attempt has settled, and `/doc` returns the document as
soon as one succeeds.

## A plugin without `initialize()` reports `available`

`self` in the status route is this plugin's own `ctx.initialization.getStatus()`. Core marks a
plugin without `initialize()` as `available` as soon as its `start()` has returned, so the status
API is safe to use from any plugin, and from any dependent, without first checking whether the
target implements the hook.

## Pointers

| What | Where |
| --- | --- |
| Dependency contract received in `start(core, plugins)` | `server/plugin.ts:PluginInitializeExampleConsumerServerPlugin.start` |
| `getDoc()` through the stored contract; `getPluginInitStatus`; `initializePlugin`; `pluginInitStatus$` subscription | `server/plugin.ts:PluginInitializeExampleConsumerServerPlugin.setup` |
| Route paths | `common/constants.ts` |
| Tests for each route and the subscription | `server/plugin.test.ts` |
