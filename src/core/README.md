# Core

Core is a set of systems (frontend, backend etc.) that Kibana and its plugins are built on top of.

## Plugin development
Core Plugin API Documentation:
 - [Core Public API](/docs/development/core/public/kibana-plugin-core-public.md)
 - [Core Server API](/docs/development/core/server/kibana-plugin-core-server.md)
 - [Conventions for Plugins](./CONVENTIONS.md)
 - [Testing Kibana Plugins](./TESTING.md)
 - [Kibana Platform Plugin API](./docs/developer/architecture/kibana-platform-plugin-api.asciidoc)
 
Internal Documentation:
 - [Saved Objects Migrations](./server/saved_objects/migrations/README.md)

## Integration with the "legacy" Kibana

Most of the existing core functionality is still spread over "legacy" Kibana and it will take some time to upgrade it.
Kibana is started using existing "legacy" CLI that bootstraps `core` which in turn creates the "legacy" Kibana server.
At the moment `core` manages HTTP connections, handles TLS configuration and base path proxy. All requests to Kibana server
will hit HTTP server exposed by the `core` first and it will decide whether request can be solely handled by the new
platform or request should be proxied to the "legacy" Kibana. This setup allows `core` to gradually introduce any "pre-route"
processing logic, expose new routes or replace old ones handled by the "legacy" Kibana currently.

Once config has been loaded and some of its parts were validated by the `core` it's passed to the "legacy" Kibana where
it will be additionally validated so that we can make config validation stricter with the new config validation system.
Even though the new validation system provided by the `core` is also based on Joi internally it is complemented with custom
rules tailored to our needs (e.g. `byteSize`, `duration` etc.). That means that config values that were previously accepted
by the "legacy" Kibana may be rejected by the `core` now.

### Logging
`core` has its own [logging system](./server/logging/README.mdx) and will output log records directly (e.g. to file or terminal) when configured. When no
specific configuration is provided, logs are forwarded to the "legacy" Kibana so that they look the same as the rest of the
log records throughout Kibana.

## Core API Review
To provide a stable API for plugin developers, it is important that the Core Public and Server API's are stable and
well documented. To reduce the chance of regressions, development on the Core API's includes an API signature review
process described below. Changes to the API signature which have not been accepted will cause the build to fail.

When changes to the Core API's signatures are made, the following process needs to be followed:
1. After changes have been made, run `yarn docs:acceptApiChanges` which performs the following:
   - Recompiles all typescript typings files
   - Updates the API review files `src/core/public/kibana.api.md` and `src/core/server/kibana.api.md`
   - Updates the Core API documentation in `docs/development/core/`
2. Review and commit the updated API Review files and documentation
3. Clearly flag any breaking changes in your pull request

