# @kbn/core-execution-context-common

This package contains the common types for Core's execution context.

## `KibanaExecutionContext` (field reference)

`KibanaExecutionContext` is a small object describing where work originates. It is used by the browser to populate the `x-kbn-context` header, and by the server to enrich Elasticsearch `x-opaque-id`.

- **`type`**: high-level category (e.g. `application`, `dashboard`, `visualization`, `task`).
- **`name`**: public name of an app/feature/subsystem (e.g. `discover`, `lens`, `taskManager`).
- **`space`**: current space id (when applicable).
- **`page`**: stable logical unit like a page/tab/route segment (avoid embedding ids; put those in `id`).
- **`id`**: identifier for the current entity (dashboard id, rule id, saved object id, etc.).
- **`description`**: human-readable description (avoid large values and sensitive data).
- **`url`**: browser URL or server endpoint/task URL (avoid unique identifiers if not needed).
- **`meta`**: optional extra structured details (keep small; avoid sensitive data).
- **`child`**: nested context spawned from the current one (embeddables/sub-operations); can be chained.
