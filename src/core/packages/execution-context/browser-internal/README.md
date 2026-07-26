# @kbn/core-execution-context-browser-internal

This package contains the internal types and implementation for Core's browser-side execution context service.

## Pointers

- `x-kbn-context` is attached to `core.http.fetch(...)` requests in `src/core/packages/http/browser-internal/src/fetch.ts`.
- The header value is URI-encoded JSON produced by `src/core/packages/execution-context/browser-internal/src/execution_context_container.ts`.
- `HttpFetchOptions.context` is merged with the current global context via `executionContext.withGlobalContext(...)` before serialization.
