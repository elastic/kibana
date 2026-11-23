# DI soft dependencies examples

Four plugins that use each other through Kibana's dependency injection, with no `requiredPlugins` or `optionalPlugins` between them.
Each plugin works when its peer is disabled, and the pairs do not form a circular plugin dependency.
Every plugin has a server and a browser half.

`tokens/` (`@kbn/di-soft-dependencies-example-tokens`) holds the shared tokens and types, with no runtime code.
Each plugin imports tokens from it and never from another plugin, so the TypeScript project references stay acyclic.

## Lookup: `lookup_a` and `lookup_b`

Each plugin exposes a greeter and uses the other plugin's greeter when that plugin is enabled.
The greeter depends on `CoreStart('http')`, which exists only once its plugin has started, so the consumer resolves it in an `OnReady` hook or a request handler.

```ts
// provider
expose(LookupAGreeter).toResolvedValue(
  (http) => ({ greet: () => 'hello from diSoftDepsLookupA' }),
  [CoreStart('http')]
);

// consumer
constructor(@inject(SoftDependencies) private readonly softDependencies: SoftDependencies) {}

getStatus() {
  return this.softDependencies.get(LookupAGreeter)?.greet() ?? 'diSoftDepsLookupA is disabled';
}
```

## Registry: `registry_a` and `registry_b`

Each plugin owns a registry that it fills once every plugin has started, and contributes one entry to the other plugin's registry.
This is the shape of a registry like embeddable's: the owner defines the token in the tokens package, and contributors only expose entries for it.
Each owner also exposes a built-in entry to its own token, which the registry collects once.

```ts
// owner
collect(RegistryAEntry, Registry, (context, entry, registry) => registry.register(entry));

// contributor
expose(RegistryAEntry).toConstantValue({ id: 'diSoftDepsRegistryB', label: '...' });
```

The registry stays empty until every plugin has started.
A registry that something reads before that, such as saved objects migrations on the server, does not fit this pattern, and its contributors keep `requiredPlugins`.

## Find the hidden edges

Soft dependencies add no manifest edge, so the plugin tooling cannot show that one plugin uses another.
`scripts/report_edges.js` scans the source and lists, per token, which plugins call `expose`, `collect`, and `softDependencies.get` or `softDependencies.getAll`:

```sh
node examples/di_soft_dependencies/scripts/report_edges.js
```

It scans `src`, `x-pack`, and `examples` by default. Pass directories to scan only those.
It groups calls by the identifier passed at the call site, so two tokens imported under the same name are reported together.
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
```

In the browser, every plugin logs its status with `console.info` in an `OnReady` hook, once every plugin has started, and writes it to `window.__diSoftDeps[pluginId]`.

Disable a plugin to see its peer fall back:

```sh
yarn start --run-examples --no-base-path --di_soft_deps_lookup_b.enabled=false --di_soft_deps_registry_b.enabled=false
```
