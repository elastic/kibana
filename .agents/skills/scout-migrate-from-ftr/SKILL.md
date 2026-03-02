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

## Important note

- If the suite mostly validates **data correctness**, migrate it to a Scout **API** test (or unit/integration) instead of a Scout UI test.
- Prefer component/unit tests (RTL/Jest) for isolated UI behaviors rather than Scout functional tests. Strong candidates for RTL/Jest:
  - Internal component logic: loading/error states, conditional rendering based on props or hooks.
  - Table/list structure: column configuration, row rendering, sorting.
  - Hover states, tooltips, popovers, and field validation — use RTL or Storybook.
  - Filter behavior that doesn't require a running server.
- Follow steps **1–10** below. Common migration failures: missing UI tags, wrong Scout package imports, relying on ordering/shared state, and ingestion/setup that isn't space/parallel-safe.

## Guardrails / gotchas (high signal)

- **Preserve relevant comments**: if FTR test comments provide useful context (intent, workarounds, non-obvious setup), keep them in the migrated Scout spec. Drop only outdated comments.
- Scout specs are **standalone**: don't rely on file execution order or `loadTestFile()` indexes.
- Each Scout `test()` runs in a **fresh browser context**: if an FTR suite used multiple `it()` blocks as one journey, combine into one `test()` + `test.step()`. Do login/navigation in `beforeEach` (avoid `page`/`browserAuth`/`pageObjects` in `beforeAll`).
- Keep **one suite per file**, avoid nested `describe`, and don't use `*.describe.configure()`.
- Keep spec files **focused and small**: aim for **4–5 short test scenarios** or **2–3 long scenarios** per file. This is critical for parallel execution, where the test runner balances work at the spec-file level — oversized specs create bottlenecks.
- UI tests: tags are **required** (validated at runtime).
- `parallel_tests/`: ingest via `parallel_tests/global.setup.ts` + `globalSetupHook` (don't use `esArchiver` in spec files).
- Use the correct Scout package for the test location (`@kbn/scout` vs `@kbn/scout-security`/`@kbn/scout-oblt`/`@kbn/scout-search`) and import `expect` from `/ui` or `/api`.
- Replace FTR config nesting / per-suite server args with `uiSettings` / `scoutSpace.uiSettings` and (when needed) `apiServices.core.settings(...)`.
- Auth/roles are fixture-driven: `browserAuth` (UI), `requestAuth` (API key), `samlAuth` (cookie), plus custom roles. Avoid FTR-style role mutation.

## Core workflow

### 1) Decide the test type

- **Component/unit test (RTL/Jest)**: if the behavior can be tested in isolation, prefer RTL/Jest and skip Scout entirely. Strong candidates:
  - Internal component logic: loading/error states, conditional rendering based on props or hooks.
  - Table/list structure: column configuration, row rendering, data-driven assertions.
  - Form fields and filters: input validation, field interactions, filter clearing.
  - Hover states, tooltips, popovers, and toggle behaviors.
  - Feature-flagged UI: tabs/sections that appear based on config, agent type, or license.
- **Scout API test**: if the suite validates server responses, data correctness, or backend behaviors, migrate to a Scout API test.
- **Scout UI test**: if the suite validates user flows and rendering that require a real browser, migrate to a Scout UI test.
- Data validation belongs in API tests (or unit tests), not UI tests.

### 2) Place files correctly

- UI: `<module-root>/test/scout*/ui/{tests,parallel_tests}/**/*.spec.ts`
- API: `<module-root>/test/scout*/api/{tests,parallel_tests}/**/*.spec.ts`
- UI: use `ui/parallel_tests/` + `spaceTest` when the flow can be space-isolated (state is scoped to a Kibana space) and should run in parallel; otherwise use `ui/tests/` + `test`. See [Scout parallelism](docs/extend/scout/parallelism.md) for details on when to choose parallel vs sequential.
- API: default to `api/tests/` (sequential). Use `api/parallel_tests/` + `parallel.playwright.config.ts` only when the test is safe to run in parallel (no shared state) and you need the speedup.
- Parallel UI: avoid hardcoded saved object IDs (they can differ per space) and make names unique when needed (often suffix with `scoutSpace.id`).

### 3) Translate the test structure

- `describe/it` -> `test.describe/test` or `apiTest.describe/apiTest` (but don't assume 1:1 `it` -> `test`).
- `before/after` -> `test.beforeAll/test.afterAll`.
- `beforeEach/afterEach` -> `test.beforeEach/test.afterEach`.
- Keep **one suite per file** and a flat hierarchy (avoid nested `describe`; use `test.step()` inside a test for structure).
- If a single FTR file contains multiple top-level `describe` blocks, split into multiple Scout specs (one describe per file).

#### `it` blocks are sometimes steps (not full test cases)

In FTR it's common for multiple `it(...)` blocks in one `describe(...)` to behave like a single user journey (shared browser state across `it`s).
In Scout (Playwright), each `test(...)` runs with a fresh browser context, so you usually can't preserve that state across multiple `test`s.

Guideline:

- If the FTR suite uses multiple `it(...)` blocks as sequential steps of one flow, combine them into a single `test(...)` and convert the step boundaries into `test.step(...)`.
- If an `it(...)` block is already an independent test case, keep it as its own `test(...)` and ensure it sets up its own preconditions.

Minimal sketch:

```ts
// FTR: multiple `it`s continue in the same browser context
it('create entity', async () => {});
it('edit entity', async () => {}); // continues...

// Scout: combine into one test and use `test.step` for debuggability
test('create and edit entity', async () => {
  await test.step('create entity', async () => {});
  await test.step('edit entity', async () => {});
});
```

### 4) Replace FTR dependencies

- Replace `supertest` calls with Scout `apiClient` (endpoint under test) + `requestAuth`/`samlAuth` (auth).
- Replace other FTR services with Scout fixtures (`pageObjects`, `browserAuth`, `apiServices`, `kbnClient`, `esArchiver`).
- Use `apiServices`/`kbnClient` for setup/teardown and verifying side effects.
- Replace webdriver waits with Playwright/page object methods.
- Move UI selectors/actions into Scout page objects; register new page objects in the plugin fixtures index.
- If the test needs API setup/cleanup, add a scoped API service and use it in `beforeAll/afterAll`.
- Replace per-suite FTR config flags with `uiSettings` / `scoutSpace.uiSettings`, and (when needed) `apiServices.core.settings(...)`.
- Use the correct Scout package for the test location (`@kbn/scout` vs `@kbn/scout-<solution>`), and import `expect` from `/ui` or `/api`.
- If the test needs rison-encoded query params, use `@kbn/rison` and add it to `test/scout*/ui/tsconfig.json` `kbn_references`.

### 5) Split loadTestFile suites

- Each `loadTestFile` target becomes its own Scout spec.
- Move shared setup into each spec (or a shared fixture/helper).
- Don't rely on spec execution order (it's not guaranteed).
- Split flows with different state requirements (localStorage, tour visibility) into dedicated specs.

### 6) Add helpers and constants

- Put shared helpers in `test/scout*/ui/fixtures/helpers.ts` (or API helpers in API fixtures).
- Add test-subject constants in `fixtures/constants.ts` for reuse across tests and page objects.
- For `parallel_tests/` ingestion, use `parallel_tests/global.setup.ts` + `globalSetupHook` (no `esArchiver` in spec files).
- If using synthtrace generators, add `@kbn/synthtrace-client` to the test tsconfig references.

### 7) Extract component/unit tests where possible

- While implementing, look for logic that can be pulled out of e2e into RTL/Jest (see step 1). Not every FTR `it` block needs a Scout equivalent.
- Place RTL tests next to the component under test (e.g., `my_component.test.tsx` alongside `my_component.tsx`).
- Good extraction candidates from FTR/Scout to RTL:
  - Assertions on component props, loading/error states, or conditional rendering.
  - Table structure, column configuration, and row data rendering.
  - Form validation, filter interactions, and input clearing.
  - Tooltip content, hover behavior, and popover rendering.
- Keep Scout tests for what **requires a real browser and running server**: navigation, cross-page flows, permission-gated UI, and serverless-vs-stateful differences.

### 8) Clean up FTR wiring

- Remove `loadTestFile` entries from any stateful and serverless FTR configs/index files.
- Delete old FTR test files once Scout coverage is verified.
- For staged migrations, mark remaining FTR suites as `describe.skip` to avoid duplicate coverage.

### 9) Verify and run tests locally

- Use `node scripts/scout.js run-tests --arch stateful --domain classic --testFiles <path>` and
  `node scripts/scout.js run-tests --arch serverless --domain observability_complete --testFiles <path>` (adjust serverless domain).
- If the tests are under `test/scout_<configSet>/...`, `run-tests` auto-detects the server config set from the Playwright config path.
- `start-server` has no Playwright config to inspect, so pass `--serverConfigSet <configSet>` when your tests require a custom config set.
- Each test must include assertions in the test body (not hidden inside page objects; page objects should return state).
- UI tests must have at least one supported tag (Scout validates UI tags at runtime). API tests should also be tagged.
- Avoid checking raw data in UI tests; prefer page object methods over direct selectors.
- Preserve or update tags for deployment targets when needed.
- Run Scout tests in both stateful and serverless if the plugin supports both.

### 10) Review against Scout best practices

- Read and follow the `scout-best-practices-reviewer` skill on all new/changed Scout spec files.
- Provide the removed FTR test files as context so the reviewer can verify migration parity.
- Address `blocker` and `major` findings before finalizing; discuss `minor` and `nit` items as appropriate.

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
- Hiding assertions inside page objects (ESLint `expect-expect` requires assertions in the test body; page objects should return state, not assert).
- Packing too many `test(...)` blocks into a single spec file. Keep specs focused: 4–5 short scenarios or 2–3 long scenarios per file. Oversized specs create bottlenecks in parallel execution.
