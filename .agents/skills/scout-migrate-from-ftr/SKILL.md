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
- **REQUIRED SUB-SKILL:** scout-best-practices-reviewer (review new Scout tests and migration parity).

## Guardrails / gotchas (high signal)

- Scout specs are **standalone**: don’t rely on file execution order or `loadTestFile()` indexes.
- Each Scout `test()` runs in a **fresh browser context**: if an FTR suite used multiple `it()` blocks as one journey, combine into one `test()` + `test.step()`. Do login/navigation in `beforeEach` (avoid `page`/`browserAuth`/`pageObjects` in `beforeAll`).
- Keep **one suite per file**, avoid nested `describe`, and don’t use `*.describe.configure()`.
- UI tests: tags are **required** (validated at runtime).
- `parallel_tests/`: ingest via `parallel_tests/global.setup.ts` + `globalSetupHook` (don’t use `esArchiver` in spec files).
- Use the correct Scout package for the test location (`@kbn/scout` vs `@kbn/scout-security`/`@kbn/scout-oblt`/`@kbn/scout-search`) and import `expect` from `/ui` or `/api`.
- Replace FTR config nesting / per-suite server args with `uiSettings` / `scoutSpace.uiSettings` and (when needed) `apiServices.core.settings(...)`.

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
   - If multiple FTR `it(...)` blocks were sequential steps of one flow, combine into a single Scout `test(...)` and use `test.step(...)`.
   - Keep one top-level suite per file and avoid nested `describe` blocks.
4. Replace FTR-only patterns.
   - Replace `supertest` calls with Scout `apiClient` (endpoint under test) + `requestAuth`/`samlAuth` (auth).
   - Use `apiServices`/`kbnClient` for setup/teardown and verifying side effects.
   - Replace webdriver waits with Playwright/page object methods.
   - Replace per-suite FTR config flags with `uiSettings` / `scoutSpace.uiSettings`, and (when needed) `apiServices.core.settings(...)`.
   - Use the correct Scout package for the test location and import `expect` from `/ui` or `/api`.
5. Move UI selectors/actions into page objects.
   - Create a page object for the page under test and register it in plugin fixtures.
   - Keep test-subject constants in fixtures (for reuse across tests and page objects).
6. Port data ingestion to Scout fixtures/global setup (when needed).
   - For parallel tests, ingest in `parallel_tests/global.setup.ts` via `globalSetupHook` (don’t use `esArchiver` in spec files).
   - If using synthtrace generators, add `@kbn/synthtrace-client` to the test tsconfig references.
7. Move isolated UI logic to component/unit tests when possible.
   - If a feature can be tested in isolation (dropdowns, sorting, small components), prefer RTL/unit tests instead of Scout e2e.
8. Clean up FTR wiring.
   - Remove the `loadTestFile` entry from the FTR index.
   - If the test exists in both stateful and serverless FTR suites, remove from all relevant config/index files.
   - Delete the old FTR test file once Scout coverage is in place.
   - For staged migrations, mark the remaining FTR suite as `describe.skip` to avoid duplicate coverage.
9. Verify tests pass locally (look at tags to see where they should be run).

- Use `node scripts/scout.js run-tests --stateful --testFiles <path>` and
  `node scripts/scout.js run-tests --serverless=oblt --testFiles <path>` (adjust serverless target).
- If the tests are under `test/scout_<configSet>/...`, `run-tests` auto-detects the server config dir from the Playwright config path (use `--config-dir <configSet>` only to override, or when using `start-server`).

## Common patterns

- Use `test.step(...)` inside a single `test(...)` when an FTR suite used multiple `it(...)` blocks as one journey.
- Parallel UI: isolate per-space state via `spaceTest` + `scoutSpace`; avoid hardcoded saved object IDs and make names unique (often suffix with `scoutSpace.id`).
- Use `globalSetupHook` in `parallel_tests/global.setup.ts` to ingest shared data once.
- Use `page.addInitScript(...)` before navigation to set localStorage/cookies (skip tours/onboarding).
- When FTR used rison-encoded query params, replicate with `@kbn/rison` and add it to `test/scout*/ui/tsconfig.json` `kbn_references`.
- Add stable `data-test-subj` attributes when selectors are unstable.
- Centralize deep links + page-ready waits in page objects.

## Common mistakes

- Migrating data validation UI tests instead of converting to API tests.
- Forgetting to split `loadTestFile` suites into separate Scout specs.
- Forgetting UI tags (required; Scout validates UI tags at runtime). API tests should also be tagged so CI/discovery can select the right deployment target.
- Placing Scout tests outside `test/scout*/{ui,api}/{tests,parallel_tests}`.
- Ignoring existing parallel Scout config (mixing `tests/` with `parallel_tests/`).
- Using the wrong Scout package (solution tests in security/observability/search must import from their solution Scout package, not `@kbn/scout`).
- Importing `expect` from the wrong entrypoint (use `/ui` for UI, `/api` for API).
- Using `esArchiver` in `parallel_tests/` spec files (ingest in `parallel_tests/global.setup.ts` instead).
- Using nested `describe` blocks or `*.describe.configure()` (split into separate specs instead).
- Spreading one user journey across multiple Scout `test(...)` blocks (fresh browser context per test).

## References

Open only what you need:

- Migration checklist (UI vs API, paths, fixtures mapping, manifests): `references/migration-workflow.md`
