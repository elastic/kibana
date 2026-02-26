# Migration Workflow (Condensed)

## TL;DR migration recipe

- If the suite mostly validates **data correctness**, migrate it to a Scout **API** test (or unit/integration) instead of a Scout UI test.
- Follow steps **1–9** below. Common migration failures: missing UI tags, wrong Scout package imports, relying on ordering/shared state, and ingestion/setup that isn’t space/parallel-safe.

## Migration checklist

Use this as a checklist when migrating FTR tests to Scout.

## 0) Key differences / constraints (FTR -> Scout) [scout-ftr-to-scout-mapping]

- `loadTestFile()` indexes often control ordering and share hooks -> Scout specs are **standalone** and file order is **not guaranteed**.
- Each Scout `test()` runs in a **fresh browser context** -> combine multi-`it()` journeys into one `test()` + `test.step()`; do login/navigation in `beforeEach` (avoid `page`/`browserAuth`/`pageObjects` in `beforeAll`).
- Don’t port FTR config nesting / per-suite `kbnServerArgs`/`esServerArgs` -> prefer Scout defaults; use `uiSettings` / `scoutSpace.uiSettings` and (when needed) `apiServices.core.settings(...)`.
- Auth/roles are fixture-driven -> `browserAuth` (UI), `requestAuth` (API key), `samlAuth` (cookie), plus custom roles (avoid FTR-style role mutation).
- `parallel_tests/`: ingest via `parallel_tests/global.setup.ts` + `globalSetupHook` (don’t use `esArchiver` in spec files).
- Structure is stricter -> keep **one suite per file**, avoid nested `describe`, don’t use `*.describe.configure()`, and include required UI tags.
- Imports are constrained -> use the correct Scout package (`@kbn/scout` vs `@kbn/scout-<solution>`) and import `expect` from `/ui` or `/api`.

## 1) Decide UI vs API

- UI tests should validate user interactions and rendering.
- Data validation belongs in API tests.

## 2) Place files correctly

- UI: `<module-root>/test/scout*/ui/{tests,parallel_tests}/**/*.spec.ts`
- API: `<module-root>/test/scout*/api/{tests,parallel_tests}/**/*.spec.ts`
- UI: use `ui/parallel_tests/` + `spaceTest` when the flow can be space-isolated and should run in parallel; otherwise use `ui/tests/` + `test`.
- API: default to `api/tests/` (sequential). Use `api/parallel_tests/` only when it’s safe to run in parallel and you need the speedup.
- Parallel UI: avoid hardcoded saved object IDs (they can differ per space) and make names unique when needed (often suffix with `scoutSpace.id`).

## 3) Translate the test structure

- `describe/it` -> `test.describe/test` or `apiTest.describe/apiTest` (but don’t assume 1:1 `it` -> `test`).
- `before/after` -> `test.beforeAll/test.afterAll`.
- `beforeEach/afterEach` -> `test.beforeEach/test.afterEach`.
- Keep **one suite per file** and a flat hierarchy (avoid nested `describe`; use `test.step()` inside a test for structure).

### `it` blocks are sometimes steps (not full test cases)

In FTR it’s common for multiple `it(...)` blocks in one `describe(...)` to behave like a single user journey (shared browser state across `it`s).
In Scout (Playwright), each `test(...)` runs with a fresh browser context, so you usually can’t preserve that state across multiple `test`s.

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

## 4) Replace FTR dependencies

- Replace FTR services with Scout fixtures (`pageObjects`, `browserAuth`, `apiClient`, `apiServices`, `kbnClient`, `esArchiver`, `requestAuth`, `samlAuth`).
- Move UI selectors/actions into Scout page objects.
- Register new page objects in the plugin fixtures index.
- If the test needs API setup/cleanup, add a scoped API service and use it in `beforeAll/afterAll`.
- Replace per-suite FTR config flags with `uiSettings` / `scoutSpace.uiSettings`, and (when needed) `apiServices.core.settings(...)`.
- Use the correct Scout package for the test location (`@kbn/scout` vs `@kbn/scout-<solution>`), and import `expect` from `/ui` or `/api`.
- If the test needs rison-encoded query params, use `@kbn/rison` and add it to
  `test/scout*/ui/tsconfig.json` `kbn_references`.

## 5) Split loadTestFile suites

- Each `loadTestFile` target becomes its own Scout spec.
- Move shared setup into each spec (or a shared fixture/helper).
- Don’t rely on spec execution order (it’s not guaranteed).
- Split flows with different state requirements (localStorage, tour visibility) into dedicated specs.

## 6) Add helpers and constants

- Put shared helpers in `test/scout*/ui/fixtures/helpers.ts` (or API helpers in API fixtures).
- Add test-subject constants in `fixtures/constants.ts` for reuse.
- For `parallel_tests/` ingestion, use `parallel_tests/global.setup.ts` + `globalSetupHook` (no `esArchiver` in spec files).
- If using synthtrace generators, add `@kbn/synthtrace-client` to the test tsconfig references.

## 7) Prefer component/unit tests for isolated UI

- If functionality can be tested in isolation (dropdown constraints, sorting, small UI components), add RTL/unit tests instead of e2e.
- Consider unit tests for tab configuration, feature-flagged tabs, and hook logic.

## 8) Clean up FTR wiring

- Remove `loadTestFile` entries from any stateful and serverless FTR configs.
- Delete old FTR test files once Scout coverage is verified.
- For staged migrations, mark remaining FTR suites as `describe.skip` to avoid duplicate coverage.

## 9) Verify expectations

- Each test must include assertions.
- UI tests must have at least one supported tag (Scout validates UI tags at runtime). API tests should also be tagged so discovery/CI can select the right deployment target.
- Avoid checking raw data in UI tests.
- Prefer page object methods over direct selectors.
- Preserve or update tags for deployment targets when needed.
- Run Scout tests in both stateful and serverless if the plugin supports both.
