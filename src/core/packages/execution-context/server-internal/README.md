# @kbn/core-execution-context-server-internal

This package contains the internal types and implementation for Core's server-side execution context service.

## Pointers

- Core HTTP installs request execution context from the `x-kbn-context` header in `src/core/packages/http/server-internal/src/http_server.ts`.
- `AsyncLocalStorage` storage and the `withContext(...)` implementation live in `src/core/packages/execution-context/server-internal/src/execution_context_service.ts`.
- `x-kbn-context` parsing and the compact context string used for Elasticsearch `x-opaque-id` live in `src/core/packages/execution-context/server-internal/src/execution_context_container.ts`.
- Config: `execution_context.enabled` in `src/core/packages/execution-context/server-internal/src/execution_context_config.ts`.
