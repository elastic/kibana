# Deferred Init Example Dependency

A **disposable demo plugin**, companion to `deferred_init_example`, that plays the role of an
ordinary, non-lazy required dependency.

## What it demonstrates

This plugin has no `enableLazyInitialize`, no `lazyInitialize`, nothing special at all — `start()`
runs at boot like any other plugin's and returns a plain start contract:

```ts
export interface DeferredInitExampleDependencyStartContract {
  getGreeting(): string;
}
```

It exists so `deferred_init_example` can demonstrate a fourth shape of `loadPluginContract` usage,
distinct from the one `deferred_init_example_consumer` shows:

| Plugin | Where it calls `loadPluginContract` | Target of the call |
| --- | --- | --- |
| `deferred_init_example_consumer` | A route handler closure over `core` | `deferredInitExample` (**lazy**) |
| `deferred_init_example` | Its own `lazyInitialize`, via `core: CoreStart` captured on `this` during `start()` | `deferredInitExampleDependency` (**not lazy**, this plugin) |

`LazyInitContext` (what `lazyInitialize` receives) has no `core`/`plugins` field, so reaching
`core.plugins.loadPluginContract` from inside `lazyInitialize` only works because `start()` stashed
`core` on the instance first. Because this plugin isn't itself lazy, the call resolves as soon as
its `start()` has run — there's no deferred init on this side to wait for — but it's the same
`loadPluginContract` code path either way, and the *first* place in the codebase demonstrating it
being called from a plugin's own `lazyInitialize` rather than from a route handler.

## Why a separate plugin

Same reason as `deferred_init_example_consumer`: `loadPluginContract` requires the target to be a
declared dependency in the caller's manifest, and a plugin cannot declare itself.
