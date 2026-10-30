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

The `@kbn/imports/no_group_crossing_imports` lint rule enforces `private` for every package under `src/core`. It rejects an import of a Core-private package from a file outside `src/core`, unless the file is in `packages/kbn-eslint-plugin-imports/src/helpers/core_private_importers.ts`. That list holds the files that imported a Core-private package when the rule was added. `@elastic/kibana-core` owns the list, so a new entry needs their review. A test fails when a listed file no longer imports a Core-private package, so remove the entry in the change that removes the import. To regenerate the list, run `node packages/kbn-eslint-plugin-imports/scripts/generate_core_private_importers.mjs`.

## KEEP THIS FILE UP TO DATE

If you (agent working in `src/core`) notice a discrepancy between this document and the actual code while working in `src/core`, include a fix to this AGENTS.md as part of your changeset.

## Related docs

- `src/core/CONVENTIONS.md` — plugin structure, API design, and mock patterns
