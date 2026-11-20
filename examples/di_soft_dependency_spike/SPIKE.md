# Spike: soft runtime dependencies with Kibana DI

Goal: let plugin B use something from plugin A when A is enabled, and keep working when A is
disabled, with no plugin dependency that the cycle check can see. Embeddable is the model case.
Tracking: [#303798](https://github.com/elastic/kibana/issues/303798),
[#280088](https://github.com/elastic/kibana/issues/280088),
[kibana-team#3800](https://github.com/elastic/kibana-team/issues/3800).

Everything in this folder is throwaway. No real plugin and no core file changed.

## 1. How it works today

### DI terms, in plain language

- **Container**: a lookup table from a key to "how to build the value". You ask it `get(key)`.
- **Token** (inversify calls it a service identifier): the key. Kibana's `createToken<T>(id)` is
  `Symbol.for(id)` with the type `T` attached, so the same string gives the same token in any file.
- **Binding**: one entry in the table. `bind(Token).toConstantValue(x)`, `.to(Class)`,
  `.toResolvedValue(fn, [deps])`.
- **Module**: a function that adds bindings. A DI plugin exports one as `module`.
- **Scope**: how long a built value lives. `Singleton` builds once and caches forever (Kibana's
  default), `Request` builds once per resolution, `Transient` builds every time.
- **Optional injection**: `get(Token, { optional: true })` or `@optional()` returns `undefined`
  instead of throwing when nothing is bound.
- **Multi-injection**: `getAll(Token)` returns every binding for the token, for registries.
- **Activation hook**: code that runs when a value is built (`onActivation`). Kibana's `Setup` and
  `Start` contracts use it to fire `OnSetup` and `OnStart` callbacks.

### Classic plugins vs DI plugins

A classic plugin exports `plugin()` and gets its dependencies' contracts as arguments:

```ts
setup(core, { embeddable }) { embeddable.registerEmbeddablePublicDefinition(...) }
```

A DI plugin exports `module`. Core gives each plugin its own child container of one root container
(`src/core/packages/di/common-internal/src/modules/plugin.ts:161-187`) and loads the module into it
(`src/core/packages/plugins/server-internal/src/plugin.ts:145-149`):

```ts
if (this.definition.module) {
  this.container = (setupContext as CoreSetup).injection.getContainer();
  this.container.load(this.definition.module);
  this.container.load(createSetupModule(this.initializerContext, setupContext, plugins));
}
```

`createSetupModule` binds each declared dependency's contract under `PluginSetup('<id>')`
(`src/core/packages/di/common-internal/src/modules/lifecycle.ts:58-72`). `plugins` only holds
`requiredPlugins` and `optionalPlugins`, so `PluginSetup('x')` still follows the manifest graph.

The second cross-plugin channel is the `Global` token. A plugin binds `bind(Global).toConstantValue(Token)`.
When that plugin's `Setup` contract activates, core copies `Token` into the root container with a
resolver that builds it inside the publishing plugin's container
(`src/core/packages/di/common-internal/src/modules/plugin.ts:108-142`, `registerGlobals` at `:190-200`). Every plugin container is a child of the root,
so every plugin can then `get(Token)`. No manifest entry is involved. Today `Global` is exported only
from the private `@kbn/core-di-internal`. alerting_v2 imports it from there, for request-scoped values.

### How plugin order and cycles work

`getTopologicallySortedPluginNames` in `src/core/packages/plugins/server-internal/src/plugins_system.ts:329-396`
builds the graph from `requiredPlugins` plus `optionalPlugins` that are present, and runs Kahn's
algorithm. A leftover graph throws:

```
Topological ordering of plugins did not complete due to circular dependencies:
Detected circular dependencies:
  spikeClassicA -> spikeClassicB -> spikeClassicA
```

- `optionalPlugins` counts toward a cycle whenever the optional plugin is enabled (`:340`).
  Verified: `control/` boots into that FATAL error.
- A disabled or missing optional plugin is dropped from the graph, so it cannot form a cycle.
- `runtimePluginDependencies` is not in the sort. It only feeds the runtime resolver
  (`:418-431`, `plugin_contract_resolver.ts`), which answers `core.plugins.onSetup/onStart('x')`
  with `{ found, contract }` after all plugins finish that phase.
- Setup and start run in the sorted order. Every plugin finishes setup before any plugin starts.
- With no edge between two plugins, their relative order comes from discovery order. Discovery
  sorts by path (`plugins_discovery.ts:103-113`) and Kahn's algorithm pops from the end, so in the
  spike every B ran before its A. Renaming a folder flips the order.

The browser uses the same order (server sends the sorted `uiPlugins()`), and the same
`CoreInjectionService`/`PluginModule` code from `@kbn/core-di-internal`
(`src/core/packages/plugins/browser-internal/src/plugin.ts:67-104`).

### What DI already offers for optional or late resolution

| Tool | Behavior (probe or boot) |
| --- | --- |
| `get(T, { optional: true })`, `@optional()` | `undefined` when unbound |
| `getAll(T, { optional: true })` | `[]` when unbound, all bindings across plugins when published |
| `isBound(T)` / `isCurrentBound(T)` | `isBound` sees the root, `isCurrentBound` only the plugin's own container |
| `KibanaContainerModule` `inject(...)` | waits for the plugin's own start, then resolves. All setups are done by then |
| `KibanaContainerModule` `onSetup/onStart(T, ...)` | skips tokens bound by other plugins, it checks `isCurrentBound` (`module.ts:320-323`) |
| `LazyServiceIdentifier` | solves import cycles between files, not plugin order |

## 2. Designs

The data that crosses the plugin boundary is a typed token. Where the token lives decides the
TypeScript graph: if B imports a token from A's plugin package and A imports one from B's, the
TS project references form a cycle even when the runtime graph does not. So every design puts
tokens and types in a small shared package with no runtime code (`shared/tokens.ts` here).

### Option A: optional lookup (consumer pulls)

Provider:
```ts
bind(OptAGreeter).toConstantValue({ greet: () => 'hello from spikeOptA' });
bind(Global).toConstantValue(OptAGreeter);
```
Consumer, resolved after setup (start, request handlers, or `inject()`):
```ts
container.get(OptAGreeter, { optional: true })?.greet() ?? 'absent'
```

### Option B: extension registry (consumer pushes, provider collects)

This is the kibana-team#3800 direction. Contributor:
```ts
bind(RegAWidget).toConstantValue({ type: 'fromB', render: () => '...' });
bind(Global).toConstantValue(RegAWidget);
```
Registry owner (embeddable's role), collecting at its own start:
```ts
bind(OnStart).toResolvedValue(
  (registry) => (container) =>
    container.getAll(RegAWidget, { optional: true }).forEach((w) => registry.register(w)),
  [WidgetRegistry]
);
```

### Option C: runtime plugin contract (classic escape hatch through DI)

Manifest: `"runtimePluginDependencies": ["spikeRtB"]`. Consumer:
```ts
bind(OnStart).toResolvedValue((plugins) => () => {
  plugins.onStart<{ spikeRtB: RtStart }>('spikeRtB').then(({ spikeRtB }) => {
    fromB = spikeRtB.found ? spikeRtB.contract.greet() : 'absent';
  });
}, [CoreStart('plugins')]);
```

### Open questions and answers

| Question | A: optional lookup | B: registry | C: runtime contract |
| --- | --- | --- | --- |
| Load order | No edge, so order is arbitrary. Lookup at setup returns `absent` if the provider sorts later (seen: `spikeOptB` at setup) | Collect at owner's start. At setup the owner saw only contributors that sorted earlier (seen: `spikeRegB` at setup saw nothing) | Order irrelevant |
| Lifecycle timing | Safe at start, in requests, or through `inject()`. A default-scope singleton built during setup freezes `absent` forever (seen: `singletonInjected: absent` at start and on requests) | Safe from owner's start onward | Contract arrives only after every plugin started. Still `pending` inside `OnStart` |
| Typing | Token carries the type. `inject()` with `optional: true` needs explicit generics to type-check | Token carries the type | String plugin id plus a hand-written contract generic |
| Provider absent | `undefined`, consumer branches | Contributor's bindings sit unused. Consumer code has no branch | `{ found: false }`, consumer branches |
| Cycle A↔B | Boots, both see each other at start | Boots, both registries filled at start | Boots, both contracts found on request |
| Testing | Bind or skip the token in a test container (`shared/consumer.test.ts`) | Same, plus `getAll` returns `[]` | Mock `core.plugins.onStart` |
| Footguns | Setup-time lookup and singleton capture fail silently, and the outcome depends on folder names. Two publishers of one token make `get` throw "Ambiguous bindings" | A plugin that binds two extensions but publishes once breaks `getAll` for everyone ("Ambiguous bindings") | Manifest entry still needed, but cannot form a cycle |

## 3. Recommendation

Use Option B for registrations and Option A for pull APIs. Each needs some core work first.
Option C works today but keeps the classic contract shape.

How embeddable is used: 55 manifests list `embeddable` in `requiredPlugins`, 42 of them outside
examples and test plugins. Some already guard it as if it were optional, for example Lens writes
`if (embeddable) { embeddable.registerEmbeddablePublicDefinition(...) }`
(`x-pack/platform/plugins/shared/lens/public/plugin.ts:386-394`). Of the 55, a rough grep
finds 21 calling an `embeddable.register*` method and about 12 calling `getStateTransfer()` on the
start contract. Both shapes are needed.

Core work either option needs (not started):

- A public way to publish a token across plugins. `Global` is private, and raw `bind(Global)` has
  the "Ambiguous bindings" footgun, so a helper should publish each binding (for example
  `contribute(Token).toConstantValue(x)`).
- A cross-plugin collect helper. `KibanaContainerModule.onStart(Token, ...)` checks
  `isCurrentBound` and misses other plugins' bindings.
- For Option A, a late accessor that throws when used before start, plus `inject()` typing that
  accepts `optional: true` without explicit generics.
- A convention for token packages (types plus tokens, no runtime code), so TS project references
  stay acyclic.

Embeddable constraint: the browser registry throws after `closeSetup()`, which embeddable calls
first thing in `start()` (`src/platform/plugins/shared/embeddable/public/plugin.tsx:63`). An
adapter inside embeddable has to collect DI contributions and then call `closeSetup()`.

Side finding: the README's "Get Started" snippet uses `export const module = new ContainerModule(...)`.
In a CommonJS-compiled file that collides with Node's `module` variable, and Node then fails with
`exports is not defined in ES module scope`. The repo example uses `export { pluginModule as module }`.

## 4. Evidence

Run from the repo root with ES on 9200 (`node scripts/es snapshot`):

```
examples/di_soft_dependency_spike/run_scenario.sh both      # all six spike plugins
examples/di_soft_dependency_spike/run_scenario.sh a_off     # *_a disabled via config
examples/di_soft_dependency_spike/run_scenario.sh b_off     # *_b disabled via config
examples/di_soft_dependency_spike/run_scenario.sh control   # classic optionalPlugins cycle
node examples/di_soft_dependency_spike/probe/run.js         # container semantics
node scripts/jest --config examples/di_soft_dependency_spike/jest.config.js
```

Outputs land in `results/`: `<scenario>.log` (filtered boot log), `<scenario>.json` (route
responses from `GET /api/spike/<id>`), `probe.log`.
