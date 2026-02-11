# Migration Workflow (Condensed)

Use this as a checklist when migrating FTR tests to Scout.

## 1) Decide UI vs API

- UI tests should validate user interactions and rendering.
- Data validation belongs in API tests.

## 2) Place files correctly

- UI: `<module-root>/test/scout*/ui/{tests,parallel_tests}/**/*.spec.ts`
- API: `<module-root>/test/scout*/api/{tests,parallel_tests}/**/*.spec.ts`
- UI: use `ui/parallel_tests/` + `spaceTest` when the flow can be space-isolated and should run in parallel; otherwise use `ui/tests/` + `test`.
- API: default to `api/tests/` (sequential). Use `api/parallel_tests/` only when it’s safe to run in parallel and you need the speedup.

## 3) Translate the test structure

- `describe/it` -> `test.describe/test` or `apiTest.describe/apiTest`.
- `before/after` -> `test.beforeAll/test.afterAll`.
- `beforeEach/afterEach` -> `test.beforeEach/test.afterEach`.

## 4) Replace FTR dependencies

- Replace FTR services with Scout fixtures (`pageObjects`, `browserAuth`, `apiClient`, `apiServices`, `kbnClient`, `esArchiver`, `requestAuth`, `samlAuth`).
- Move UI selectors/actions into Scout page objects.
- Register new page objects in the plugin fixtures index.
- If the test needs API setup/cleanup, add a scoped API service and use it in `beforeAll/afterAll`.
- If the test needs rison-encoded query params, use `@kbn/rison` and add it to
  `test/scout*/ui/tsconfig.json` `kbn_references`.

## 5) Split loadTestFile suites

- Each `loadTestFile` target becomes its own Scout spec.
- Move shared setup into each spec (or a shared fixture/helper).
- Split flows with different state requirements (localStorage, tour visibility) into dedicated specs.

## 6) Add helpers and constants

- Put shared helpers in `test/scout*/ui/fixtures/helpers.ts` (or API helpers in API fixtures).
- Add test-subject constants in `fixtures/constants.ts` for reuse.
- For large data ingestion, use `parallel_tests/global.setup.ts` to load once.
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
