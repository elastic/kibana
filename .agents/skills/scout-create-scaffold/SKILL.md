---
name: scout-create-scaffold
description: Generate or repair a Scout test scaffold for a Kibana plugin/package (test/scout*/{api,ui} Playwright configs, fixtures, example specs). Use when you need the initial Scout directory structure; prefer `node scripts/scout generate` with flags for non-interactive/LLM execution.
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
- Optional namespace for a functional area in a large plugin (creates `test/<scout-root>/<namespace>/{ui,api}`)
  - One level only; lowercase letters, digits, and underscores
  - Do not mix root-level `{ui,api}` directories with namespaces in the same Scout root
- For UI scaffolds: whether tests can run in parallel (space-isolated). Default is parallel; use sequential when isolation is not possible.

## Generate (Preferred)

Run from the Kibana repo root:

```bash
node scripts/scout generate --path <moduleRoot> --type <api|ui|both>
```

Common variants:

```bash
# UI scaffold, sequential (non-parallel)
node scripts/scout generate --path <moduleRoot> --type ui --no-ui-parallel

# Generate into a custom Scout root (test/scout_<configSet>/...)
node scripts/scout generate --path <moduleRoot> --type both --scout-root scout_<configSet>

# Generate a functional-area namespace in a large plugin
node scripts/scout generate --path <moduleRoot> --type both --namespace <namespace>

# If some Scout directories already exist, generate only missing sections without prompting
node scripts/scout generate --path <moduleRoot> --type both --force
```

Notes:

- The generator will not modify existing `test/<scout-root>/{api,ui}` or `test/<scout-root>/<namespace>/{api,ui}` sub-directories.
- If any Scout directories already exist and you pass `--path`, you must also pass `--force` (otherwise the command fails rather than prompting).
- In the paths below, `<scout-content-root>` means `test/<scout-root>` or `test/<scout-root>/<namespace>`.

## What It Creates

- API scaffold:
  - `<scout-content-root>/api/playwright.config.ts`
  - `<scout-content-root>/api/fixtures/constants.ts`
  - `<scout-content-root>/api/fixtures/index.ts`
  - `<scout-content-root>/api/tests/example.spec.ts`
- UI scaffold (sequential):
  - `<scout-content-root>/ui/playwright.config.ts`
  - `<scout-content-root>/ui/fixtures/constants.ts`
  - `<scout-content-root>/ui/fixtures/index.ts`
  - `<scout-content-root>/ui/fixtures/page_objects/*`
  - `<scout-content-root>/ui/tests/example.spec.ts`
- UI scaffold (parallel):
  - `<scout-content-root>/ui/parallel.playwright.config.ts`
  - `<scout-content-root>/ui/parallel_tests/example_one.spec.ts`
  - `<scout-content-root>/ui/parallel_tests/example_two.spec.ts`
  - `<scout-content-root>/ui/parallel_tests/global.setup.ts`
  - `<scout-content-root>/ui/parallel_tests/global.teardown.ts` is **not** generated; opt in by adding the file with a `globalTeardownHook(...)` call. See `scout-ui-testing/references/scout-ui-parallelism.md`.

The generator **does not** create **`tsconfig.json`** files. Playwright runs without them, but **`node scripts/type_check`** (CI) must still include Scout specs in a TS project—see **TypeScript layout** below.

## TypeScript layout (`check_types`)

Pick **one** pattern and wire it after `node scripts/scout generate` completes:

### Pattern A — plugin root includes Scout (e.g. `discover_enhanced`)

- In the **plugin or package root** `tsconfig.json`, add **`test/<scout-root>/**/*`** (or broader **`test/**/*`**) to **`include`**.
- Add **`kbn_references`** for the Scout stack you use:
  - Platform / generic: **`@kbn/scout`**.
  - Observability: **`@kbn/scout-oblt`**; for API tests using synthtrace workers, also **`@kbn/scout-synthtrace`**, **`@kbn/synthtrace-client`** (and **`@kbn/rison`** for UI if needed).
  - Match sibling plugins in the same solution for consistency.
- **Do not** add nested `<scout-content-root>/{ui,api}/tsconfig.json` when using this pattern (one program for plugin + Scout).
- **Allows** relative imports from specs/fixtures into **`server/`** or **`common/`** when the test needs shared registration constants or light server utilities.

### Pattern B — dedicated `tsconfig.json` under `<scout-content-root>/{ui,api}/`

- Add **`<scout-content-root>/api/tsconfig.json`** and/or **`<scout-content-root>/ui/tsconfig.json`** with **`extends`**, **`include`**: `["**/*"]`, and scoped **`kbn_references`** (see SLO, `data_views`, infra Scout modules for examples).
- Keeps the **main** plugin typecheck smaller.
- **Does not** allow relative imports that climb into **`../../../../server/...`** or **`public/...`** from those folders—TypeScript will treat `server/**` as part of the wrong composite project (`TS6059` / `TS6307`). Use **`fixtures/constants.ts`**, **`common/`**, or switch to **Pattern A**.

### After wiring either pattern

1. Run **`yarn kbn bootstrap`** so `packages/kbn-ts-projects/config-paths.json` picks up added or removed `tsconfig.json` paths.
2. Validate with **`node scripts/type_check --project <path-to-tsconfig.json>`** (plugin root `tsconfig.json` for **A**, or the API/UI `tsconfig.json` under `<scout-content-root>` for **B**).

## After Generating

There is no need to run `node scripts/scout update-test-config-manifests`. CI takes care of this for you.
- Custom server config sets:
  - If you create/use `test/scout_<configSet>`, you typically also need a matching server config under `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/<configSet>`.
  - `start-server` requires `--serverConfigSet <configSet>` when using a custom server config set.

## Path Conventions (Specs)

`<scout-content-root>` may be `test/scout*` or `test/scout*/<namespace>`.

- UI sequential specs: `<scout-content-root>/ui/tests/**/*.spec.ts`
- UI parallel specs: `<scout-content-root>/ui/parallel_tests/**/*.spec.ts`
- API specs: `<scout-content-root>/api/tests/**/*.spec.ts`
