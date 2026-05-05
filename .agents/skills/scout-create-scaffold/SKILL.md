---
name: scout-create-scaffold
description: Generate or repair a Scout test scaffold for a Kibana plugin/package (test/scout*/{api,ui} Playwright configs, fixtures, example specs). Use when you need the initial Scout directory structure; prefer `node scripts/scout.js generate` with flags for non-interactive/LLM execution.
---

# Create Scout Scaffold (Generator-First)

## Related skills

- **`scout-migrate-from-ftr`** — After generating files, wire TypeScript for CI using **Pattern A** or **Pattern B** (*Where Scout tests are typechecked* in that skill). This skill documents layout; the migration skill has the full rules (relative imports, `kbn_references`, `node scripts/type_check --project …`).

## Inputs to Collect

- Module root (repo-relative path to the plugin/package directory, e.g. `x-pack/platform/plugins/shared/maps`)
- Test type: `api`, `ui`, or `both`
- Scout root directory name under `<moduleRoot>/test/`
  - Default: `scout` (creates `<moduleRoot>/test/scout/...`)
  - Custom config set: `scout_<configSet>` (for example `scout_uiam_local`, `scout_cspm_agentless`)
- For UI scaffolds: whether tests can run in parallel (space-isolated). Default is parallel; use sequential when isolation is not possible.

## Generate (Preferred)

Run from the Kibana repo root:

```bash
node scripts/scout.js generate --path <moduleRoot> --type <api|ui|both>
```

Common variants:

```bash
# UI scaffold, sequential (non-parallel)
node scripts/scout.js generate --path <moduleRoot> --type ui --no-ui-parallel

# Generate into a custom Scout root (test/scout_<configSet>/...)
node scripts/scout.js generate --path <moduleRoot> --type both --scout-root scout_<configSet>

# If some Scout directories already exist, generate only missing sections without prompting
node scripts/scout.js generate --path <moduleRoot> --type both --force
```

Notes:

- The generator will not modify existing `test/<scout-root>/{api,ui}` sub-directories.
- If any Scout directories already exist and you pass `--path`, you must also pass `--force` (otherwise the command fails rather than prompting).

## What It Creates

- API scaffold:
  - `test/<scout-root>/api/playwright.config.ts`
  - `test/<scout-root>/api/fixtures/constants.ts`
  - `test/<scout-root>/api/fixtures/index.ts`
  - `test/<scout-root>/api/tests/example.spec.ts`
- UI scaffold (sequential):
  - `test/<scout-root>/ui/playwright.config.ts`
  - `test/<scout-root>/ui/fixtures/constants.ts`
  - `test/<scout-root>/ui/fixtures/index.ts`
  - `test/<scout-root>/ui/fixtures/page_objects/*`
  - `test/<scout-root>/ui/tests/example.spec.ts`
- UI scaffold (parallel):
  - `test/<scout-root>/ui/parallel.playwright.config.ts`
  - `test/<scout-root>/ui/parallel_tests/example_one.spec.ts`
  - `test/<scout-root>/ui/parallel_tests/example_two.spec.ts`
  - `test/<scout-root>/ui/parallel_tests/global.setup.ts`

The generator **does not** create **`tsconfig.json`** files. Playwright runs without them, but **`node scripts/type_check`** (CI) must still include Scout specs in a TS project—see **TypeScript layout** below.

## TypeScript layout (`check_types`)

Pick **one** pattern and wire it after `scout.js generate` completes:

### Pattern A — plugin root includes Scout (e.g. `discover_enhanced`)

- In the **plugin or package root** `tsconfig.json`, add **`test/<scout-root>/**/*`** (or broader **`test/**/*`**) to **`include`**.
- Add **`kbn_references`** for the Scout stack you use:
  - Platform / generic: **`@kbn/scout`**.
  - Observability: **`@kbn/scout-oblt`**; for API tests using synthtrace workers, also **`@kbn/scout-synthtrace`**, **`@kbn/synthtrace-client`** (and **`@kbn/rison`** for UI if needed).
  - Match sibling plugins in the same solution for consistency.
- **Do not** add nested `test/<scout-root>/{ui,api}/tsconfig.json` when using this pattern (one program for plugin + Scout).
- **Allows** relative imports from specs/fixtures into **`server/`** or **`common/`** when the test needs shared registration constants or light server utilities.

### Pattern B — dedicated `tsconfig.json` under `test/<scout-root>/{ui,api}/`

- Add **`test/<scout-root>/api/tsconfig.json`** and/or **`test/<scout-root>/ui/tsconfig.json`** with **`extends`**, **`include`**: `["**/*"]`, and scoped **`kbn_references`** (see SLO, `data_views`, infra Scout modules for examples).
- Keeps the **main** plugin typecheck smaller.
- **Does not** allow relative imports that climb into **`../../../../server/...`** or **`public/...`** from those folders—TypeScript will treat `server/**` as part of the wrong composite project (`TS6059` / `TS6307`). Use **`fixtures/constants.ts`**, **`common/`**, or switch to **Pattern A**.

### After wiring either pattern

1. Run **`yarn kbn bootstrap`** so `packages/kbn-ts-projects/config-paths.json` picks up added or removed `tsconfig.json` paths.
2. Validate with **`node scripts/type_check --project <path-to-tsconfig.json>`** (plugin root `tsconfig.json` for **A**, or `test/<scout-root>/api/tsconfig.json` / UI sibling for **B**).

## After Generating

- Custom server config sets:
  - If you create/use `test/scout_<configSet>`, you typically also need a matching server config under `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/<configSet>`.
  - `start-server` requires `--serverConfigSet <configSet>` when using a custom server config set.

## Path Conventions (Specs)

- UI sequential specs: `test/scout*/ui/tests/**/*.spec.ts`
- UI parallel specs: `test/scout*/ui/parallel_tests/**/*.spec.ts`
- API specs: `test/scout*/api/tests/**/*.spec.ts`
