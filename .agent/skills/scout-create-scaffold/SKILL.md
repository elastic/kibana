---
name: Scout Create Scaffold
description: Use when creating, relocating, or reviewing Scout test scaffolds for a Kibana module and you must choose the correct test/scout path, ui/api split, or file naming conventions.
---

# Create Scout Scaffold

## Overview

Place Scout tests next to the module under test using the repo's Scout path conventions. Core principle: derive the test root from the target module path first, then choose the ui/api split and naming rules.

## Core workflow

1. Determine the module root.
   - Walk up from the target file path until you find `kibana.jsonc` (preferred).
   - If none, use the directory that represents the module boundary (plugin/package root).
2. Choose test type.
   - UI test: uses Playwright page or page objects.
   - API test: uses HTTP clients only (no browser).
3. Choose the Scout root.
   - Default: `<module-root>/test/scout`.
   - If a custom Scout root exists (for example `test/scout_cspm_agentless`, `test/scout_uiam_local`), place new tests under the same root.
4. Prefer scaffolding via the Scout CLI when starting from scratch.
   - `node scripts/scout.js generate` (also picks the correct Scout package import for the module)
5. Place files using Scout path conventions.
6. Create the minimal scaffold (see checklist below).

## Quick reference

| Purpose              | Path pattern                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| UI tests (sequential) | `test/scout{_<configSet>}/ui/tests/**/*.spec.ts`                        |
| UI tests (parallel)  | `test/scout{_<configSet>}/ui/parallel_tests/**/*.spec.ts`              |
| API tests (sequential) | `test/scout{_<configSet>}/api/tests/**/*.spec.ts`                      |
| API tests (parallel) | `test/scout{_<configSet>}/api/parallel_tests/**/*.spec.ts`             |
| Global setup         | `test/scout{_<configSet>}/{ui,api}/{tests,parallel_tests}/global.setup.ts` |

## Path conventions

Scout test files must match:

UI:
```
<module-root>/test/scout{_<configSet>}/ui/{tests,parallel_tests}/**/*.spec.ts
```

API:
```
<module-root>/test/scout{_<configSet>}/api/{tests,parallel_tests}/**/*.spec.ts
```

Notes:

- `{_<configSet>}` is optional. Examples: `test/scout` (default), `test/scout_cspm_agentless`, `test/scout_uiam_local`.
- UI test files live in `ui/tests/` or `ui/parallel_tests/`.
- API test files live in `api/tests/` (sequential) or `api/parallel_tests/` (parallel). Parallel API runs are supported but require careful isolation (indices, saved objects, etc.).
- `global.setup.ts` lives under the configured `testDir` and uses worker-scoped fixtures only.
- Non-test helpers can live under `test/scout*/ui/helpers/` or `test/scout*/common/` (shared UI+API).

## Scaffold checklist

### UI tests

- `test/scout*/ui/playwright.config.ts`
  - If missing, copy from a similar Scout-enabled plugin in the same solution.
  - Filename must be exactly `playwright.config.ts` (tooling discovery).
- Optional: `test/scout*/ui/parallel.playwright.config.ts` (plus `ui/parallel_tests/`)
  - Filename must be exactly `parallel.playwright.config.ts` (tooling discovery).
- `test/scout*/ui/fixtures/index.ts`
  - Provide the `test` fixture export used by UI tests.
- `test/scout*/ui/tests/`
  - Place UI `.spec.ts` files here.
- Optional: `test/scout*/ui/parallel_tests/`
- Optional: `test/scout*/ui/tests/global.setup.ts` or `parallel_tests/global.setup.ts`
- Optional: `test/scout*/ui/tsconfig.json` (follow existing pattern in the module).

### API tests

- `test/scout*/api/playwright.config.ts`
  - If missing, copy from a similar Scout-enabled plugin in the same solution.
  - Filename must be exactly `playwright.config.ts` (tooling discovery).
- Optional: `test/scout*/api/parallel.playwright.config.ts` (plus `api/parallel_tests/`)
  - Filename must be exactly `parallel.playwright.config.ts` (tooling discovery).
- `test/scout*/api/fixtures/index.ts`
  - Provide the `apiTest` fixture export used by API tests.
- `test/scout*/api/tests/`
  - Place API `.spec.ts` files here.
- Optional: `test/scout*/api/parallel_tests/`
- Optional: `test/scout*/api/tests/global.setup.ts` or `parallel_tests/global.setup.ts`
- Optional: `test/scout*/api/tsconfig.json` (follow existing pattern in the module).

## Example

Request: "Create a new scout test for x-pack/solutions/observability/plugins/apm/public/components/service_overview.tsx"

Outcome:

- Module root: `x-pack/solutions/observability/plugins/apm`
- UI tests path: `x-pack/solutions/observability/plugins/apm/test/scout/ui/tests/service_overview.spec.ts`
- Ensure `x-pack/solutions/observability/plugins/apm/test/scout/ui/playwright.config.ts` exists
- Ensure `x-pack/solutions/observability/plugins/apm/test/scout/ui/fixtures/index.ts` exists

## Common mistakes

- Put test files directly under `test/scout*/ui` instead of `test/scout*/ui/tests`.
- Forget `{ tag: ... }` on UI suites/tests (Scout validates UI tags at runtime). API tests should also be tagged so CI/discovery can select the right deployment target.
- Use `.test.ts` or `.ts` instead of `.spec.ts` for Scout tests.
- Place UI tests under `api` (or API tests under `ui`).
- Create a new `test/scout_*` root when a module already uses `test/scout` (or vice versa).

## Red flags

- Unsure where the module root is.
- No `tests/` or `parallel_tests/` directory in the target path.
- Using `.test.ts` or `.ts` for a Scout test file.
- Creating a new `test/scout_*` root without a corresponding server config set or an existing precedent in the module.

## Discovery / manifests

- Scout config discovery and CI rely on `.meta` manifests under `<module-root>/test/scout*/.meta/...`.
- After adding or moving Scout tests (or changing Playwright configs), run `node scripts/scout.js update-test-config-manifests` to refresh manifests.
- If you add a new custom Scout root like `test/scout_<configSet>`, you typically also need a matching server config set under `src/platform/packages/shared/kbn-scout/src/servers/configs/custom/<configSet>`.
- `run-tests` auto-detects the custom config dir from the Playwright config path; `start-server` requires `--config-dir <configSet>`.
