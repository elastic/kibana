# @kbn/core-deferred-init-browser-internal

Core's browser-side machinery for plugins with an `initialize()` hook. Nothing here is exposed to
plugins: `@kbn/core-plugins-browser-internal` applies it to every app registered by a plugin whose
manifest sets `hasInitialization: true`.

- `DeferredInitService`: owns the poll loop against core's plugin initialization status route
  (`DEFERRED_INIT_STATUS_ROUTE` from `@kbn/core-deferred-init-common`). One shared, ref-counted poll
  per plugin id: the first subscriber starts it, the last one to unsubscribe stops it, and it completes
  once the plugin reports `available`. A failed fetch on one tick is skipped and the next tick retries.
  Polling is also how an app being opened makes the server run `initialize()` when core has not already
  done so at boot (`plugins.initializeOnBoot: false`): the status route starts an attempt for an `idle`
  plugin.
- `mountWithInitializingGate`: wraps an app's `mount()` so it does not run until the plugin is
  `available`, rendering `<AppInitializingGate>` (a loading screen, or an error page with a reload
  action after a failed attempt) in the app's element until then. If the real `mount()` then rejects,
  the same gate reports that failure instead of leaving an empty element.

`CoreSystem` creates the service and hands its contract (`DeferredInitStart` from
`@kbn/core-deferred-init-browser`) to the plugins service as `deferredInit`.
