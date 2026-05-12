# Kibana

## Setup
- Run `yarn kbn bootstrap` for initial setup, after switching branches, or when encountering dependency errors
- Run Kibana in development mode: `yarn start` (or `node scripts/kibana.js`)

## Overview

### Repository layout
- `src/` — Open source code (SSPL/AGPLv3). Platform core and shared plugins.
- `x-pack/` — Elastic License 2.0 code. Enterprise plugins and solutions (security, observability, search, etc.).
- `packages/` — Root-level utility packages (build tools, test helpers, CLI tools).
- `scripts/` — Development scripts (`node scripts/generate.js`, `node scripts/jest.js`, etc.).

Code for new features goes in `src/` if open-source or `x-pack/` if enterprise. Never import `x-pack/` code from `src/`.

### Module system
- Kibana is organized into modules, each defined by a `kibana.jsonc`: core, packages, and plugin packages.
- Packages are reusable units with explicit boundaries and a single public entry point (no subpath imports), usually with a focused purpose.
- Plugins are a package type (`type: "plugin"`) that include a plugin class with setup/start/stop lifecycles, utilized by the core platform to enable applications.
- **Server plugin entry (`server/index.ts`)** should not load `./plugin` until the plugin may run. Use `import type` (and `export type`) for types from `./plugin`, keep shared config in `config.ts` / `../common/config` (not re-exported runtime values from `./plugin` at the entry), and instantiate the implementation with `await import('./plugin')` inside the async `plugin` initializer. Static value imports, `export { … }` / `export *` of values, `import './plugin'`, and `require('./plugin')` in that entry force Node to parse and execute `plugin.ts` even when the plugin is disabled. `@kbn/eslint/no_sync_import_from_plugin` in `@kbn/eslint-config` enforces this on plugin `server/index.ts` files (see [PR #170856](https://github.com/elastic/kibana/pull/170856) and [issue #171080](https://github.com/elastic/kibana/issues/171080)).
- Plugins that depend on other plugins rely on the contracts returned by those lifecycles, so circular dependencies must be avoided.
- Module IDs (typically `@kbn/...`) live in `kibana.jsonc`; `package.json` names are derived where present.
- Plugin IDs are additional camelCase IDs under `plugin.id` in `kibana.jsonc`, used by core platform and other plugins.
- Modules are grouped by domain (platform vs solutions) with visibility rules: `shared` modules expose a public API to other groups; `private` modules are only accessible within their own group.

### Plugin structure
Each plugin follows this layout:
```
my-plugin/
├── kibana.jsonc          # manifest (id, type, requiredPlugins, visibility)
├── public/
│   ├── index.ts          # exports SetupContract, StartContract types
│   └── plugin.ts         # implements Plugin<Setup, Start, PluginsDeps>
└── server/
    ├── index.ts
    └── plugin.ts
```
- `setup()` receives `core` + contracts from `requiredPlugins`; returns the plugin's own setup contract.
- `start()` similarly returns the start contract. Circular plugin dependencies are not allowed.

- Utility scripts live in `scripts/` (e.g., `node scripts/generate.js`).
- If a user correction contradicts this doc or any skills you followed, or missing guidance caused avoidable work, submit DevEx feedback: `echo "..." | scripts/devex_feedback.sh` (include the gap and suggested fix).

## Testing
Always run `node scripts/check_changes.ts` to validate your changes — this runs the precommit hook (ESLint, type-check, and relevant tests) scoped to files you've modified, as a fast local gate before CI.

### Jest unit
`node scripts/jest [--config=<pathToConfigFile>] [TestPathPattern]`
- Config is auto-discovered from the test file path (walks up to nearest `jest.config.js`). Simplest usage:
  `node scripts/jest src/core/packages/http/server-internal/src/http_server.test.ts`
- Only one `--config` per run. To test multiple packages, run separate commands.

### Jest integration
`node scripts/jest_integration [--config=<pathToConfigFile>] [TestPathPattern]`
- Auto-discovers `jest.integration.config.js` (not `jest.config.js`). Same single-config constraint as above.

### Function Test Runner (FTR)
`node scripts/functional_tests [--config <file1> [--config <file2> ...]]`
- For new tests, prefer using Scout

### Scout (UI/API with Playwright)
`node scripts/scout run-tests --arch stateful --domain classic --config <scoutConfigPath>` (or `--testFiles <specPath1,specPath2>`)

## Code Style Guidelines
Follow existing patterns in the target area first; below are common defaults.

### Type check
`node scripts/type_check [--project path/to/tsconfig.json]`
- Without `--project` it checks **all** projects (very slow). Always scope to a single project:
  `node scripts/type_check --project src/core/packages/http/server-internal/tsconfig.json`
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
- Plugin `server/index.ts` files are checked by `@kbn/eslint/no_sync_import_from_plugin` (see plugin server entry note above).

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

## Internationalization (i18n)
- Guidelines are found in src/platform/packages/shared/kbn-i18n/GUIDELINE.md
- Run `node scripts/i18n_check --fix` to check for and fix errors.

## Contribution Hygiene
- Unsure: read more code; if still stuck, ask w/ short options. Never guess.
- Fix root cause (not band-aid).
- Make focused changes; avoid unrelated refactors.
- Update docs and tests when behavior or usage changes.
- Never remove, skip, or comment out tests to make them pass; fix the underlying code.
- Always open PRs as draft.
