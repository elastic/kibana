# @kbn/lazy-require

Tooling to lazify CommonJS requires, deferring loading and execution of the module until it's actually being used.

## Background

Kibana loads many TypeScript or JavaScript fails, both at runtime and for tooling/scripts. When a module is required, it is A) load from disk, B) transformed through Babel or other means, C) executed. This consumes CPU and memory, and is exacerbated by the fact we a complicated dependency graph, barrel imports and exports, and (soft) requirements to import code from the root of the package, which in turn causes all modules in that package to be eagerly executed or evaluated.

## How it works

`@kbn/lazy-require/babel` exports a Babel plugin that will rewrite _CommonJS_ imports to use a helper function that will return a getter for the module, and will only load the file when the module is actually being used. This significantly reduces the amount of CPU and memory that will be used.

The most impactful consequence is that import and execution order is no longer deterministic. That is, modules are not guaranteed to be imported in the same order as they are described in the source file. This can lead to race conditions, especially when using Jest.

## Opting in

By default, lazy requires are disabled. There are several ways to opt-in:

- Set the `KBN_ENABLE_LAZY_REQUIRE` env variable to "true" or "1".
- Using the `@kbn/test/jest_lazy` or `@kbn/test/jest_node_lazy` presets.
- Importing `src/setup_node_env/lazy` in your script instead of `src/setup_node_env`.

If lazy requires are enabled, you can still disable it at runtime by calling `requireDeferred()`, which will immediately load modules that have been deferred, and any subsequent module requires will be loaded eagerly again.

## Notes

- Babel's cache will be invalidated when enabling/disabling lazy requires at transform time. This might slow down initial runs as the cache has to be repopulated.
- `@emotion` and `styled-components` do not work out of the box with lazy requires, due to some runtime safeguards. To work around this issue, import `@kbn/lazy-require/wrap_styled` in your Jest setup files. This is handled by the `@kbn/test` out of the box, but if you override `setupFilesAfterEnv`, you'll have to import the module yourself.
