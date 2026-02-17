# src/core

Code lives in `src/core/packages/`, organized by domain (e.g., `http`, `elasticsearch`, `saved-objects`). Each domain contains sub-packages following a naming convention.

## Sub-package suffixes

| Suffix | Role | Visibility |
|---|---|---|
| `-server` | Public server-side types and contracts | `shared` |
| `-server-internal` | Server-side implementation | `private` |
| `-server-mocks` | Jest mocks for server contracts | `shared`, `devOnly` |
| `-browser` | Public browser-side types and contracts | `shared` |
| `-browser-internal` | Browser-side implementation | `private` |
| `-browser-mocks` | Jest mocks for browser contracts | `shared`, `devOnly` |
| `common` | Types/utilities shared across server and browser | `shared` |

- `-server` / `-browser` packages export **types and pure utilities only**. No implementation.
- `-internal` packages contain the implementation. They depend on the public API package, never the reverse.
- `-mocks` packages depend on the public API types to produce typed mock objects.

## Visibility

Each package declares `visibility` in its `kibana.jsonc`:

- **`shared`** — any package in Kibana may import it. Used for public API types (`-server`, `-browser`, `common`) and mocks (`-mocks`).
- **`private`** — only other `src/core` packages may import it. Used for all `-internal` packages since they contain implementation details that should not leak to plugins.

Rule of thumb: if the package suffix contains `internal`, its visibility must be `private`.

## Top-level re-exports

- `src/core/server/index.ts` re-exports public types from all `-server` packages.
- `src/core/public/index.ts` re-exports public types from all `-browser` packages.
- `src/core/server/mocks.ts` and `src/core/public/mocks.ts` aggregate all `-mocks` packages.

## Mocks

- Mock packages: `<domain>/<side>-mocks/` (e.g., `http/server-mocks/`).
- Mock factory files: `<name>.mock.ts` (e.g., `http_service.mock.ts`).
- Test-local mocks (for `jest.mock()` overrides): `<name>.test.mocks.ts`, colocated with the test in the `-internal` package.
- Use a typed temporary variable in mock factories for correct Jest type inference (see `CORE_CONVENTIONS.md` §3.1).

## Keeping this file up to date

If you notice a discrepancy between this document and the actual code while working in `src/core`, include a fix to this AGENTS.md as part of your changeset.

## Related docs

- `src/core/CORE_CONVENTIONS.md` — API design and mock patterns
- `src/core/CONVENTIONS.md` — plugin structure conventions
