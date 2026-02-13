---
name: scout-migrate-from-ftr
description: Use when migrating Kibana Functional Test Runner (FTR) tests to Scout, including decisions about UI vs API tests, mapping FTR services/page objects/hooks to Scout fixtures, and splitting loadTestFile patterns.
---

# Migrate FTR to Scout

## Overview

Migrate FTR tests to Scout by deciding whether a test should be UI or API, mapping FTR concepts to Scout fixtures, and rewriting loadTestFile-based suites into standalone Scout specs. Core principle: keep UI tests focused on user interactions and move data validation to API tests.

## Required sub-skills

- **REQUIRED SUB-SKILL:** scout-create-scaffold (place tests under the correct `test/scout` path).
- **REQUIRED SUB-SKILL:** scout-ui-testing (page objects, browser auth, parallel UI patterns).
- **REQUIRED SUB-SKILL:** scout-api-testing (apiClient/auth, apiServices patterns).
- **REQUIRED SUB-SKILL:** ftr-testing (understand FTR structure, loadTestFile, and configs).

## Core workflow

1. Decide whether the test should be Scout UI or Scout API.
   - UI tests: verify user flows and rendering.
   - API tests: validate server responses, data setup, or backend behaviors.
2. Identify the module root and target Scout path.
   - Place tests under `<module-root>/test/scout*/{ui,api}/{tests,parallel_tests}`.
   - UI: use `ui/parallel_tests/` + `spaceTest` when the flow can be isolated by a Kibana space and should run in parallel; otherwise use `ui/tests/` + `test`.
   - API: default to `api/tests/` (sequential). Use `api/parallel_tests/` + `parallel.playwright.config.ts` only when the test is safe to run in parallel (no shared state) and you need the speedup.
3. Translate FTR suites into Scout specs.
   - Split `loadTestFile` suites into standalone Scout spec files.
   - If a single FTR file contains multiple top-level `describe` blocks, split into multiple Scout specs (one describe per file).
4. Replace FTR-only patterns.
   - Replace `supertest` calls with Scout `apiClient` (endpoint under test) + `requestAuth`/`samlAuth` (auth).
   - Use `apiServices`/`kbnClient` for setup/teardown and verifying side effects.
   - Replace webdriver waits with Playwright/page object methods.
5. Move UI selectors/actions into page objects.
   - Create a page object for the page under test and register it in plugin fixtures.
   - Keep test-subject constants in fixtures (for reuse across tests and page objects).
6. Port data ingestion to Scout fixtures/global setup (when needed).
   - For parallel tests, prefer a `parallel_tests/global.setup.ts` that loads data once.
   - If using synthtrace generators, add `@kbn/synthtrace-client` to the test tsconfig references.
7. Move isolated UI logic to component/unit tests when possible.
   - If a feature can be tested in isolation (dropdowns, sorting, small components), prefer RTL/unit tests instead of Scout e2e.
8. Clean up FTR wiring.
   - Remove the `loadTestFile` entry from the FTR index.
   - If the test exists in both stateful and serverless FTR suites, remove from all relevant config/index files.
   - Delete the old FTR test file once Scout coverage is in place.
   - For staged migrations, mark the remaining FTR suite as `describe.skip` to avoid duplicate coverage.
9. Update Scout manifests (discovery/CI).
   - Run `node scripts/scout.js update-test-config-manifests` so `.meta` manifests reflect the new/changed tests and configs.
10. Verify in both stateful and serverless when applicable.
   - Use `node scripts/scout.js run-tests --stateful --testFiles <path>` and
     `node scripts/scout.js run-tests --serverless=oblt --testFiles <path>` (adjust serverless target).
   - If the tests are under `test/scout_<configSet>/...`, `run-tests` auto-detects the server config dir from the Playwright config path (use `--config-dir <configSet>` only to override, or when using `start-server`).

## Common patterns

- Create a dedicated page object for the page under test and register it in the plugin page objects index.
- Extract shared helpers into `test/scout*/ui/fixtures/helpers.ts` (e.g., look up rule IDs via `apiServices`).
- Use `kbnClient` for saved object setup/cleanup inside tests.
- Add/extend `apiServices` to create and delete saved views or other API resources in `beforeAll/afterAll`.
- Place tests under `test/scout*/ui/parallel_tests/...` when using the parallel Scout config.
- Add test-subject constants to fixtures for reuse in tests and page objects.
- If a feature is tested in both stateful and serverless FTR suites, migrate both and delete both FTR suites.
- Use `globalSetupHook` to load data once for parallel tests; keep isolation tests in `tests/`.
- Add synthtrace generators under `test/scout*/ui/fixtures/synthtrace/` when porting data ingestion.
- Prefer component/unit tests for isolated UI behaviors rather than Scout e2e.
- Use `page.addInitScript` helpers to set localStorage before navigation when tours or flyouts interfere.
- Split large FTR suites into focused Scout specs when different state/reset behavior is required
  (for example, a dedicated spec for a UI tour flow).
- Add `data-test-subj` attributes to UI components when Scout needs stable selectors.
- When FTR used rison-encoded query params, replicate with `@kbn/rison` and add it to
  `test/scout*/ui/tsconfig.json` `kbn_references`.
- Use a dedicated page object for deep-linkable pages (node details) and centralize URL building
  and page-ready waits there.
- For large chart sets, use `expect.soft` and `expect.poll` to reduce flakiness and collect more signal.

## Common mistakes

- Migrating data validation UI tests instead of converting to API tests.
- Forgetting to split `loadTestFile` suites into separate Scout specs.
- Forgetting UI tags (required; Scout validates UI tags at runtime). API tests should also be tagged so CI/discovery can select the right deployment target.
- Placing Scout tests outside `test/scout*/{ui,api}/{tests,parallel_tests}`.
- Ignoring existing parallel Scout config (mixing `tests/` with `parallel_tests/`).

## References

Open only what you need:

- Migration checklist (UI vs API, paths, fixtures mapping, manifests): `references/migration-workflow.md`
