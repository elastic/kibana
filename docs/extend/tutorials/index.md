---
navigation_title: Tutorials
---

# Tutorials [tutorials]

Hands-on guides for specific Kibana plugin development tasks. If you're new to Kibana development, start with the [Getting Started](../getting-started/welcome.md) section instead.

## Data access

- [Access the Elasticsearch client](./access-the-elasticsearch-client-in-a-plugin.md) — obtain the Elasticsearch client in plugin lifecycle hooks and route handlers
- [Search saved objects](./saved-object-search-method.md) — use the powerful `search` method on `SavedObjectsClientContract`
- [Data views API](./data-views-api.md) — create, query, and manage data views programmatically
- [data.search services](./kibana-data-search-services.md) — run search requests with async search, sessions, and custom strategies

## Building user interfaces

- [Page template](./kibana-page-template.md) — create consistent page layouts with `KibanaPageTemplate`
- [Expressions service](./kibana-expressions-service.md) — build and execute expression pipelines
- [Lens Config Builder API](./lens-config-builder-api-examples.md) — embed Lens visualizations using the config builder API

## HTTP APIs

- [Register and access an endpoint](./registering-and-accessing-an-endpoint.md) — add a custom HTTP API and call it from client-side code
- [Versioning HTTP APIs](./versioning-http-apis.md) — create or migrate to versioned HTTP APIs
- [Versioning interfaces](./versioning-interfaces.md) — manage request and response schema versions over time
- [Generate OAS documentation](./generating-oas-for-http-apis.md) — generate OpenAPI Specification docs for your HTTP APIs
- [Add data tutorials](./home-tutorials.md) — register data ingestion tutorials in the Kibana home screen

## Configuration

- [UI settings](./ui-settings.md) — register a new UI setting (aka advanced setting / uiSetting) and read it at runtime

## Performance

- [Build and track custom performance metrics](./adding-performance-metrics.md) — instrument your plugin with EBT-based performance events

## Development environment

- [Debugging in development](../contributing/debugging-in-development.md) — debug the Kibana server and client using Chrome DevTools or VS Code
- [Debugging FIPS test failures](../contributing/debugging-fips-test-failures.md) — investigate failures from the FIPS nightly pipeline
- [Set up WSL on Windows](../getting-started/wsl-on-windows-development.md) — configure a Windows development environment using WSL2
- [Local cross-cluster search setup](../getting-started/local-cross-cluster-search-setup.md) — run two Elasticsearch clusters locally for CCS testing
- [Screenshotting service](./screenshotting/kibana-screenshotting-service.md) — generate screenshots programmatically

## Build and ship

- [Build a Kibana distributable](../contributing/building-a-kibana-distributable.md) — package Kibana for distribution
- [CI](../contributing/ci.md) — understand Kibana's BuildKite CI pipeline and comment triggers
- [Submit a pull request](../contributing/development-pull-request.md) — fork, branch, and open a PR against the Kibana repository
