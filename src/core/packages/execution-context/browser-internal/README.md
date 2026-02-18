# @kbn/core-execution-context-browser-internal

This package contains the internal types and implementation for Core's browser-side execution context service.

## Implementation notes (for Core developers)

### How `x-kbn-context` is produced

- **Where it’s injected**: Core HTTP attaches the header for each `core.http.fetch(...)` call in `src/core/packages/http/browser-internal/src/fetch.ts`.
- **Header name**: `x-kbn-context`
- **Header value**: `encodeURIComponent(JSON.stringify(context))`
- **Length limit**: the value is truncated to align with the W3C baggage per-pair max (4096 bytes), conservatively using ~1024 characters. See:
  - `src/core/packages/execution-context/browser-internal/src/execution_context_container.ts`

### Per-request overrides

`HttpFetchOptions.context` is merged with the current global context via `executionContext.withGlobalContext(...)` before serialization (also in `fetch.ts`).
