# Kibana

## Setup
- Run `yarn kbn bootstrap` for initial setup, after switching branches, or when encountering dependency errors

## Overview
- Kibana is organized into modules, each defined by a `kibana.jsonc`: core, packages, and plugin packages. Aside from tooling and testing, most code lives in these modules.
- Packages are reusable units with explicit boundaries and a single public entry point (no subpath imports), usually with a focused purpose.
- Plugins are a package type (`type: "plugin"`) that include a plugin class with setup/start/stop lifecycles, utilized by the core platform to enable applications.
- Plugins that depend on other plugins rely on the contracts returned by those lifecycles, so circular dependencies must be avoided.
- Module IDs (typically `@kbn/...`) live in `kibana.jsonc`; `package.json` names are derived where present.
- Plugin IDs are additional camelCase IDs under `plugin.id` in `kibana.jsonc`, used by core platform and other plugins.
- Modules are grouped by domain (platform vs solutions) with visibility rules (`shared` vs `private`) that limit cross-group access.
- Utility scripts live in `scripts/` (e.g., `node scripts/generate.js`).

## Critical Thinking
- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options. Never guess.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.

## Testing

### Jest unit
`yarn test:jest [--config=<pathToConfigFile>] [TestPathPattern]`

### Jest integration
`yarn test:jest_integration [--config=<pathToConfigFile>] [TestPathPattern]`

### Function Test Runner (FTR)
`yarn test:ftr [--config <file1> [--config <file2> ...]]`
- For new tests, prefer using Scout

### Scout (UI/API with Playwright)
`node scripts/scout.js run-tests --stateful --config <scoutConfigPath>` (or `--testFiles <specPath1,specPath2>`)

## Code Style Guidelines
Follow existing patterns in the target area first; below are common defaults.

### Type check
`yarn test:type_check [--project path/to/tsconfig.json]`
- Without `--project` it checks **all** projects (very slow). Always scope to a single project:
  `yarn test:type_check --project src/core/packages/http/server-internal/tsconfig.json`
- Only one `--project` per run. To check multiple packages, run separate commands.

### TypeScript & Types
- Use TypeScript for all new code; avoid `any` and `unknown`.
- Prefer explicit return types for public APIs and exported functions.
- Use `import type` for type-only imports.
- Avoid non-null assertions (`!`) unless locally justified.
- Prefer `readonly` and `as const` for immutable structures.
- Prefer const arrow functions
- Prefer explicit import/exports over "*"
- Prefer destructuring of variables, rather than property access
- Never suppress type errors with `@ts-ignore`, `@ts-expect-error`; fix the root cause.

### Linting
`node scripts/eslint --fix $(git diff --name-only)`
- Never suppress linting errors with `eslint-disable`; fix the root cause.

### Formatting
- Follow existing formatting in the file; do not reformat unrelated code.
- Prefer single quotes in TS/JS unless the file uses double quotes.

### Naming
- `PascalCase` for classes, types, and React components.
- `camelCase` for functions, variables, and object keys.
- New filenames must be `snake_case` (lowercase with underscores) unless an existing convention requires otherwise.
- Use descriptive names; avoid single-letter names outside tight loops.

### Control Flow & Error Handling
- Prefer early returns and positive conditions.
- Handle errors explicitly; return typed errors from APIs when possible.
- Keep async logic linear; avoid nested `try` blocks when possible.

### React / UI Conventions
- Use functional components; type props explicitly.
- Keep hooks at the top level; avoid conditional hooks.
- Avoid inline styles unless consistent with the file’s conventions.
- Use `@elastic/eui` components with Emotion (`@emotion/react`) for styling.

## Contribution Hygiene
- Make focused changes; avoid unrelated refactors.
- Update docs and tests when behavior or usage changes.
- Never remove, skip, or comment out tests to make them pass; fix the underlying code.
