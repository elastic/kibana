# DI soft dependencies examples

Five plugins that use each other through Kibana's dependency injection, with no `requiredPlugins` or `optionalPlugins` between them.
Each plugin works when its peer is disabled, and the pairs do not form a circular plugin dependency.
Every plugin has a server and a browser half.

`tokens/` (`@kbn/di-soft-dependencies-example-tokens`) holds the shared extension points and types, declared with `createExtensionPoint`.
Each plugin imports extension points from it and never from another plugin, so the TypeScript project references stay acyclic.

## Lookup: `lookup_a` and `lookup_b`

Each plugin contributes a greeter and uses the other plugin's greeter when that plugin is enabled.
The greeter depends on `CoreStart('http')`, which exists only once its plugin has started, so the consumer resolves it in an `OnExtensionsReady` hook or a request handler.

```ts
// extension point
export const LookupAGreeter = createExtensionPoint<Greeter>('diSoftDepsLookupA.Greeter');

// provider
extensions
  .contribute(LookupAGreeter)
  .toResolvedValue((http) => ({ greet: () => 'hello from diSoftDepsLookupA' }), [CoreStart('http')]);

// consumer
constructor(@inject(ExtensionService) private readonly extensionService: ExtensionService) {}

getStatus() {
  return this.extensionService.get(LookupAGreeter)?.greet() ?? 'diSoftDepsLookupA is disabled';
}
```

## Registry: `registry_a` and `registry_b`

Each plugin owns a registry that it fills once every plugin has started, and contributes one entry to the other plugin's registry.
This is the shape of a registry like embeddable's: the owner defines the extension point in the tokens package, and contributors only contribute entries to it.
Each owner also contributes a built-in entry to its own extension point, which the registry collects once.

```ts
// owner
extensions.collect(RegistryAEntry, Registry, (context, entry, registry) => registry.register(entry));

// contributor
extensions.contribute(RegistryAEntry).toConstantValue({ id: 'diSoftDepsRegistryB', label: '...' });
```

The registry stays empty until every plugin has started.
A registry that something reads before that, such as saved objects migrations on the server, does not fit this pattern, and its contributors keep `requiredPlugins`.

## Classic plugin: `classic_consumer`

A plugin with a `setup`/`start` class and no `module` export uses extension points too.
It gets `ExtensionService` and binds an `OnExtensionsReady` hook through `core.injection.getContainer()`:

```ts
setup(core: CoreSetup) {
  const container = core.injection.getContainer();
  this.extensionService = container.get(ExtensionService);
  container.bind(OnExtensionsReady).toConstantValue(() => {
    this.status.onReady = this.extensionService?.get(LookupBGreeter)?.greet() ?? 'diSoftDepsLookupB is disabled';
  });
}
```

Its server route returns what the lookup of `LookupBGreeter` gave at each point of the lifecycle.
Its browser half writes `{ id, fromLookupB }` to `window.__diSoftDeps.diSoftDepsClassicConsumer` in an `OnExtensionsReady` hook, without logging.

| Where the lookup runs | Result |
| --- | --- |
| `setup()` | throws |
| `start()` | throws |
| `OnExtensionsReady` hook (the `onReady` field) | the greeting, or `diSoftDepsLookupB is disabled` |
| `initialize()` | the greeting, or `diSoftDepsLookupB is disabled` |
| request handler | the greeting, or `diSoftDepsLookupB is disabled` |

## Find the hidden edges

Extension points add no manifest edge, so the plugin tooling cannot show that one plugin uses another.
`scripts/report_edges.js` scans the source and lists, per extension point id, which plugins call `extensions.contribute`, `extensions.collect`, and `get` or `getAll` on an `ExtensionService`:

```sh
node examples/di_soft_dependencies/scripts/report_edges.js
```

It scans `src`, `x-pack`, and `examples` by default. Pass directories to scan only those.
It maps the identifier passed at a call site to an id through the `createExtensionPoint<...>('id')` declarations it finds, and reports an identifier with no single declaration, such as an import alias, by name.
It counts `get` and `getAll` on a variable typed or assigned as `ExtensionService`, or on one whose name contains `extension` when the argument is a declared extension point.
It skips test files and files that do not import `@kbn/core-di`.

## Run

Start Kibana with the examples:

```sh
yarn start --run-examples --no-base-path
```

Read the server status of each plugin:

```sh
curl -u elastic:changeme http://localhost:5601/api/di_soft_deps/diSoftDepsLookupA
curl -u elastic:changeme http://localhost:5601/api/di_soft_deps/diSoftDepsRegistryA
curl -u elastic:changeme http://localhost:5601/api/di_soft_deps/diSoftDepsClassicConsumer
```

In the browser, every plugin writes its status to `window.__diSoftDeps[pluginId]` in an `OnExtensionsReady` hook, once every plugin has started.
Every plugin but `classic_consumer` also logs it with `console.info`.

Disable a plugin to see its peer fall back:

```sh
yarn start --run-examples --no-base-path --di_soft_deps_lookup_b.enabled=false --di_soft_deps_registry_b.enabled=false
```
