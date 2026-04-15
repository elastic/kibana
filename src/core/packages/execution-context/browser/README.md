# @kbn/core-execution-context-browser

Browser-side execution context helps Kibana associate **HTTP requests** with a meaningful “where did this come from?” context (app/page/entity). Core includes this context in the `x-kbn-context` header on `core.http.fetch(...)` requests so the server can propagate it (for example into Elasticsearch `x-opaque-id` for slow log tracing).

This package contains the **public contract types** for `core.executionContext` in the browser. The common data shape is `KibanaExecutionContext` from [`@kbn/core-execution-context-common`](../common).

## How to set it (recommended)

Use the `useExecutionContext` hook from `@kbn/kibana-react-plugin/public` in your React components.

```ts
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';

const ctx: KibanaExecutionContext = {
  type: 'application',
  name: 'discover',
  page: 'sessionView',
  id: discoverSessionId,
};

useExecutionContext(core.executionContext, ctx);
```

Notes:
- `page` should be a **stable logical unit** (don’t embed ids in `page`; use `id` for identifiers).
- The hook clears on unmount; Core also clears the context when the current app changes.

## Nested context with `child` (embeddables/components)

If you already have a parent context (e.g. from an app), add a child context for a nested component:

```ts
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

const parent: KibanaExecutionContext = {
  type: 'application',
  name: 'dashboard',
  page: 'view',
  id: dashboardId,
};

const ctx: KibanaExecutionContext = {
  ...parent,
  child: { type: 'visualization', name: embeddableType, id: embeddableId },
};
```

This pattern is used in e.g. ML embeddables: [`use_embeddable_execution_context.ts`](../../../../../x-pack/platform/plugins/shared/ml/public/embeddables/common/use_embeddable_execution_context.ts).

## Per-request context (for a single `http.fetch`)

You can attach a per-request context that will be merged with the current global context:

```ts
await core.http.fetch('/api/my_plugin/do_something', {
  context: { type: 'myPlugin', name: 'doSomething', id: entityId },
});
```

## Space id (`space`)

`KibanaExecutionContext.space` is the active space id. In the browser, the Spaces plugin keeps it in sync by calling `core.executionContext.set({ space })`, so most plugins shouldn’t need to set it themselves.

## Keep it small

The `x-kbn-context` header is URI-encoded JSON and is size-limited. Keep context values small and avoid sensitive data (especially in `description` and `meta`).
