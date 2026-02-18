# @kbn/core-execution-context-server-internal

This package contains the internal types and implementation for Core's server-side execution context service.

## Implementation notes (for Core developers)

### How request context is installed

Core HTTP parses the incoming `x-kbn-context` header at request start and calls `executionContext.set(...)` (see `src/core/packages/http/server-internal/src/http_server.ts`).

The execution context service stores context using Node’s `AsyncLocalStorage` so it is available across async work spawned by a request.

### Why `enterWith()` is used for `set()`

Hapi’s lifecycle is event-based; wrapping only the request handler in `AsyncLocalStorage.run()` would lose context in other lifecycle hooks. For that reason, `ExecutionContextService.set()` uses `AsyncLocalStorage.enterWith()` (see `src/core/packages/execution-context/server-internal/src/execution_context_service.ts`).

For cases where you *can* safely scope the context to a specific function, `withContext()` uses `AsyncLocalStorage.run()` and supports nested contexts (stacked via `child`).

### Header parsing and propagation

- **Incoming header**: `x-kbn-context` is parsed as `JSON.parse(decodeURIComponent(value))` in `src/core/packages/execution-context/server-internal/src/execution_context_container.ts`.
- **Elasticsearch `x-opaque-id`**: Core builds an `x-opaque-id` value that combines a request id with a compact execution context chain (type/name/id, with nested children), prefixed with `kibana:`. See:
  - `ExecutionContextService.getAsHeader()` in `src/core/packages/execution-context/server-internal/src/execution_context_service.ts`
  - `ExecutionContextContainer.toString()` in `src/core/packages/execution-context/server-internal/src/execution_context_container.ts`

### Config

The service can be disabled with `execution_context.enabled` (default `true`). See `src/core/packages/execution-context/server-internal/src/execution_context_config.ts`.
