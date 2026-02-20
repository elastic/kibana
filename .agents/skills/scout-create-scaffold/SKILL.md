---
name: scout-create-scaffold
description: Generate or repair a Scout test scaffold for a Kibana plugin/package (test/scout*/{api,ui} Playwright configs, fixtures, example specs). Use when you need the initial Scout directory structure; prefer `node scripts/scout.js generate` with flags for non-interactive/LLM execution.
---

# Create Scout Scaffold (Generator-First)

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

## After Generating

- Update `.meta` manifests when adding/moving configs or tests:
  - `node scripts/scout.js update-test-config-manifests`
- Custom server config sets:
  - If you create/use `test/scout_<configSet>`, you typically also need a matching server config under `src/platform/packages/shared/kbn-scout/src/servers/configs/custom/<configSet>`.
  - `start-server` requires `--config-dir <configSet>` when using a custom server config set.

## Path Conventions (Specs)

- UI sequential specs: `test/scout*/ui/tests/**/*.spec.ts`
- UI parallel specs: `test/scout*/ui/parallel_tests/**/*.spec.ts`
- API specs: `test/scout*/api/tests/**/*.spec.ts`
