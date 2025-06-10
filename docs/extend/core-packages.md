---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/core-packages.html
---

# Core packages [core-packages]

::::{warning}
This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
::::


Core packages have well defined boundaries, have a single responsibility, and are organized by domain. Core packages follow a specific naming schema, according to what they contain:

For example, core capapability packages are:

* `core-capabilities-browser-internal`
* `core-capabilities-browser-mocks`
* `core-capabilities-common`
* `core-capabilities-server`
* `core-capabilities-server-internal`
* `core-capabilities-server-mocks`

Each domain has a specific package for public types, which can be imported and used throughout the Kibana codebase including in its implementation and unit tests. These packages are internal to core and not intended for public use, but they can be used by plugins to create mock versions for unit testing.

In addition, domains contain separate packages for the client-side and server-side and, in some cases, a base, that supports both client and server needs. When a domain shares code between the server and client, that code lives in a `common` package. Mocks have their own dedicated package.

All of core’s public API’s have inline `jsdocs` that include examples as nescessary.

