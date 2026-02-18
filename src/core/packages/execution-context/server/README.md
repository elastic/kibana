# @kbn/core-execution-context-server

Server-side execution context helps Kibana correlate **server work** with a meaningful “origin” (app/page/entity/background task). It is used to enrich:

- **Elasticsearch `x-opaque-id`** (useful in slow logs/deprecation logs/tracing)
- **APM labels** (Kibana server transactions)

This package contains the **public contract types** for `core.executionContext` on the server. The common data shape is `KibanaExecutionContext` from [`@kbn/core-execution-context-common`](../common).

## Request handling (typical case)

For HTTP requests initiated from the browser, Core’s HTTP layer parses the incoming `x-kbn-context` header and installs it into request-scoped async context. In a normal route handler you generally **do not need to do anything**—Elasticsearch client calls will automatically include the derived `x-opaque-id`.

## Background/server-only work (use `withContext`)

For work that doesn’t originate from an incoming browser request (task manager, background sync, scheduled jobs, etc.), wrap your work with `core.executionContext.withContext(...)`:

```ts
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

const ctx: KibanaExecutionContext = {
  type: 'task',
  name: 'myPlugin',
  id: taskId,
  page: 'run',
  description: 'sync something',
};

return core.executionContext.withContext(ctx, async () => {
  // Any Elasticsearch calls made from here will include the derived x-opaque-id
  await esClient.asInternalUser.ping();
});
```

### Nesting / extending context (server-side child contexts)

Nested `withContext` calls stack contexts. When a parent context is present (from the request header or an outer `withContext`), the inner context becomes `child` of the current one. This is useful when you want to add a more specific “sub-operation” context around a particular call.

## APM labels

`core.executionContext.getAsLabels()` returns the subset of the current context that is used as APM labels. Today this includes **`name`**, **`id`**, and **`page`** (when present).

## Notes / constraints

- Execution context can be disabled via `execution_context.enabled` (default: `true`). When disabled, Core will not install/propagate execution context for server-side work.
- Keep context values small and avoid sensitive data. The context may be propagated to Elasticsearch headers and observability tooling.

