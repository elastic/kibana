# @kbn/core-deferred-init-browser

Browser-side types for the status of a plugin's server-side `initialize()`:

- `DeferredInitStatus`: the plugin's state on the server (`idle` / `initializing` / `available` /
  `failed`), plus the last error message and the failed-attempt count once an attempt has failed.
- `DeferredInitStart`: `getStatus$(pluginId)` to observe a plugin's status and `refresh(pluginId)` to
  force a re-check outside the regular poll cadence.

Core consumes this contract itself (`InternalCoreSetup.deferredInit`, implemented by
`@kbn/core-deferred-init-browser-internal`); it is not exposed to plugins. A plugin with `initialize()`
needs no browser code: core wraps every app it registers in `<AppInitializingGate>` from
`@kbn/core-application-browser`, which shows a loading screen until the plugin is `available` on the
server, and an error page with a reload action if `initialize()` fails. Core alone decides when
`initialize()` runs (`plugins.initializeOnBoot`); the browser only ever observes the result.
