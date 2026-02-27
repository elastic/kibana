---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/core-packages.html
---

# Core packages [core-packages]

::::{warning}
This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
::::


Core packages are domain-organized, with well-defined boundaries and single responsibilities. They adhere to a specific naming schema based on their contents:

For example, core capability packages are:

* `core-capabilities-browser-internal`
* `core-capabilities-browser-mocks`
* `core-capabilities-common`
* `core-capabilities-server`
* `core-capabilities-server-internal`
* `core-capabilities-server-mocks`

Each domain includes a public types package, usable throughout the Kibana codebase and its unit tests. While internal to core and not for public use, plugins can leverage these packages to create mock versions for testing.

Domains also feature separate packages for client-side and server-side code, with a base often supporting both. Shared server/client code resides in a `common` package, and mocks have their own dedicated package.

All of core’s public API’s have inline `jsdocs` that include examples as nescessary.
