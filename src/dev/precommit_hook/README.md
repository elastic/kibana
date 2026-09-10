# Pre-commit hook: file casing validation

This check validates the **casing of Kibana resources** (files and folders). It runs as part of the pre-commit hook and can also be run manually via the check file casing script.

## Expected casing

- **Default:** All resources are expected to use **snake_case**.
- **Package roots:** Folder names of Kibana modules of type `"package"` are expected to use **kebab-case**. Package roots are the directories that contain a `kibana.jsonc` manifest with `type !== 'plugin'` (i.e. they are packages, not plugins).
- **KEBAB_CASE_PATTERNS:** The `config.ts` file defines a `KEBAB_CASE_PATTERNS` constant (glob patterns). Any path matching one of these patterns is expected to use **kebab-case**.

Kibana modules are identified by the presence of a `kibana.jsonc` manifest. The manifest’s `type` property indicates the kind of module: `type === 'plugin'` for plugins, and any other value (e.g. `"package"`) for packages. Only package root directories get the kebab-case expectation; plugins do not.

## Exclusions

Paths matching any of the **IGNORE_PATTERNS** in `config.ts` are excluded from the check. That list includes build artifacts, third-party conventions, and other paths where casing cannot or should not be enforced.

## Configuration

- **IGNORE_PATTERNS** (`config.ts`): Glob patterns for paths to skip entirely.
- **KEBAB_CASE_PATTERNS** (`config.ts`): Glob patterns for paths that must use kebab-case instead of snake_case.
- **exceptions.json**: Paths that are known violations and are temporarily allowed (e.g. until migrated). Use `--generate-exceptions` when running the check to refresh this file from current violations.
