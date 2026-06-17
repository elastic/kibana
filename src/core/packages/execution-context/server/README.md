# @kbn/core-execution-context-server

Server-side execution context helps Kibana correlate **server work** with a meaningful “origin” (app/page/entity/background task). Core uses it to enrich Elasticsearch `x-opaque-id`, which is useful for tracing expensive searches in Elasticsearch slow logs.

This package contains the **public contract types** for `core.executionContext` on the server. The common data shape is `KibanaExecutionContext` from [`@kbn/core-execution-context-common`](../common).

## Request handling (typical case)

For HTTP requests initiated from the browser, Core’s HTTP layer parses the incoming `x-kbn-context` header and installs it into request-scoped async context. In a normal route handler you generally **do not need to do anything**—Elasticsearch client calls will automatically include the derived `x-opaque-id`.

For more context on how `x-opaque-id` is used to trace slow searches, see Elastic docs: [`Trace an Elasticsearch query in Kibana`](https://www.elastic.co/docs/troubleshoot/kibana/trace-elasticsearch-query-to-the-origin-in-kibana).

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

## Debugging

To see stored execution context in Kibana logs, enable debug logging for the `execution_context` logger:

```yml
logging:
  loggers:
    - name: execution_context
      level: debug
```
