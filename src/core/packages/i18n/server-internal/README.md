# @kbn/core-i18n-server-internal

This package contains the internal implementation of Core's server-side i18n service.

## Lifecycle

The `I18nService` is instantiated by the Kibana server as a core service (not a plugin). It participates in two lifecycle phases: **preboot** and **setup**. It has no `start()` method.

### Why `initTranslations` runs twice

Both `preboot()` and `setup()` call the same private `initTranslations()` method. This is intentional — the two phases use different HTTP service instances:

- **Preboot** routes are served while Kibana is still starting up (e.g., the loading screen). The preboot HTTP service is a separate instance that only handles requests during this early phase.
- **Setup** routes are served once the full application is ready. The setup HTTP service is the long-lived instance that handles requests for the lifetime of the server.

Both phases need the `/translations/{locale}.json` route registered, so `initTranslations()` runs in each to configure the translation engine and register routes on the respective HTTP service.

The second call is largely free: the `i18nLoader` caches loaded translation files by file path, so the default locale's files are only read from disk once. The `i18n.init()` call re-initializes the global singleton, which is idempotent for the same locale.
