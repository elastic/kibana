# @kbn/core-deferred-init-common

Zero-dependency leaf package holding what the server and browser sides of plugin initialization share:

- `PluginInitState` and `PluginInitStatus`: where a plugin's `initialize()` stands on one Kibana instance.
  Core alone decides when `initialize()` runs (`plugins.initializeOnBoot`: at boot by default, otherwise
  on first use); these types describe the outcome on this instance, not the schedule.
- `PluginInitializationError` and its `isPluginInitializationError` type guard. Core rejects with it when
  a plugin's `initialize()` attempt fails, and `@kbn/core-http-router-server-internal` converts it to a
  `503` + `Retry-After` response when it escapes a route handler.
- `DEFERRED_INIT_STATUS_ROUTE` (`GET /internal/core/deferred_init/{pluginId}`) and its response bodies,
  shared by the server status route and the browser status client so the two cannot drift.

The public types and the error are re-exported through `@kbn/core-plugins-server` → `@kbn/core/server`
for consumer plugins.

It lives in its own leaf package (rather than `@kbn/core-plugins-server`) to avoid a dependency cycle:
`@kbn/core-plugins-server` depends on `@kbn/core-elasticsearch-server-internal`, which depends on
`@kbn/core-http-server-internal`, which depends on `@kbn/core-http-router-server-internal` — so the
router package cannot depend on `@kbn/core-plugins-server` directly.
