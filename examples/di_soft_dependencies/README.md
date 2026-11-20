# DI soft dependencies examples

Four plugins that use each other through Kibana's dependency injection, with no `requiredPlugins` or `optionalPlugins` between them.
Each plugin works when its peer is disabled, and the pairs do not form a circular plugin dependency.
Every plugin has a server and a browser half.

`tokens/` (`@kbn/di-soft-dependencies-example-tokens`) holds the shared tokens and types, with no runtime code.
Each plugin imports tokens from it and never from another plugin, so the TypeScript project references stay acyclic.

## Lookup: `lookup_a` and `lookup_b`

Each plugin exposes a greeter and uses the other plugin's greeter when that plugin is enabled.

```ts
// provider
expose(LookupAGreeter).toConstantValue({ greet: () => 'hello from diSoftDepsLookupA' });

// consumer
constructor(@inject(SoftDependencies) private readonly softDependencies: SoftDependencies) {}

getStatus() {
  return this.softDependencies.get(LookupAGreeter)?.greet() ?? 'diSoftDepsLookupA is disabled';
}
```

## Registry: `registry_a` and `registry_b`

Each plugin owns a registry that it fills at start, and contributes one entry to the other plugin's registry.
This is the shape of a registry like embeddable's: the owner defines the token in the tokens package, and contributors only expose entries for it.
Each owner also exposes a built-in entry to its own token, which the registry collects once.

```ts
// owner
collect(RegistryAEntry, Registry, (context, entry, registry) => registry.register(entry));

// contributor
expose(RegistryAEntry).toConstantValue({ id: 'diSoftDepsRegistryB', label: '...' });
```

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

In the browser, every plugin logs its status with `console.info` at start and writes it to `window.__diSoftDeps[pluginId]`.

Disable a plugin to see its peer fall back:

```sh
yarn start --run-examples --no-base-path --di_soft_deps_lookup_b.enabled=false --di_soft_deps_registry_b.enabled=false
```
