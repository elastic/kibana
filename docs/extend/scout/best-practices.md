---
navigation_title: Best practices
---

# Best practices for Scout tests [scout-best-practices]

This guide covers best practices for writing Scout UI and API tests that are reliable, maintainable, and fast. Since Scout is built on Playwright, also see the official [Playwright best practices](https://playwright.dev/docs/best-practices).

If you’re new to Scout, start with [What is Scout?](./introduction.md).

## Quick reference [scout-best-practices-quick-ref]

### UI and API tests [scout-best-practices-ui-and-api]

| Question | Where |
| --- | --- |
| How should I organize test files? | [Organize by role and user flow](#organize-by-role-and-user-flow) |
| Where should shared one-time setup go? | [Use a global setup hook](#use-a-global-setup-hook) |
| Where should cleanup go? | [Cleanup in hooks](#cleanup-in-hooks) |
| What permissions should I use? | [Minimal permissions](#minimal-permissions) |

### UI tests [scout-best-practices-ui]

| Question | Where |
| --- | --- |
| Parallel vs sequential? | [Prefer parallel](#prefer-parallel-when-possible) |
| Multiple `test()` vs `test.step`? | [Use `test.step` for flows](#use-teststep-for-flows) |
| Setup/teardown via UI? | [Prefer APIs](#prefer-apis-for-setup-and-teardown) |
| Waiting strategy | [Rely on auto-waiting](#rely-on-auto-waiting) |
| Locator strategy | [Use `data-test-subj` (`page.testSubj`)](#use-data-test-subj) |

### API tests [scout-best-practices-api]

| Question | Where |
| --- | --- |
| Which fixture should validate the endpoint? | [Use `apiClient` + scoped credentials](#use-apiclient) |
| What should I assert? | [Validate response body](#validate-response-body) |

## UI and API tests [scout-best-practices-both]

### Keep test suites independent [keep-suites-independent]

Each test file should contain **one test suite** (`test.describe`) with a flat structure (avoid nested `describe`). If you need different setup, split into separate files.

:::::{warning}
Test file execution order is not guaranteed. Don’t rely on one file running before another. Use a [global setup hook](./global-setup-hook.md) for shared setup.
:::::

### Organize by role and user flow [organize-by-role-and-user-flow]

Organize test files by:

- Role (viewer/editor/custom)
- User flow (for example `dashboard_crud.spec.ts`, `dashboard_filters.spec.ts`)

Put shared login/navigation in `beforeEach`.

### Use a global setup hook [use-a-global-setup-hook]

Move repeated one-time setup operations (data ingestion, bulk API setup) into a [global setup hook](./global-setup-hook.md) to avoid repeated work across files.

### Cleanup in hooks [cleanup-in-hooks]

Don’t put cleanup in the test body—cleanup won’t run if the test fails. Use `afterEach` / `afterAll`.

### Minimal permissions [minimal-permissions]

Avoid using `admin` unless absolutely required. Prefer:

- `viewer`/`editor`/`privileged` roles, or
- custom role descriptors (least privilege)

See:

- [Browser authentication](./browser-auth.md)
- [API authentication](./api-auth.md)

## UI tests [scout-best-practices-ui-section]

### Prefer parallel when possible [prefer-parallel-when-possible]

Prefer running UI suites in parallel when isolation is possible. See [Parallelism](./parallelism.md).

### Use `test.step` for flows [use-teststep-for-flows]

Use `test.step` to group a multi-step flow inside a single test when steps share browser context and logically belong together.

### Prefer APIs for setup and teardown [prefer-apis-for-setup-and-teardown]

Use Kibana APIs (via `kbnClient`, `apiServices`, `uiSettings`, saved objects helpers, etc.) for setup and teardown rather than navigating through UI.

### Rely on auto-waiting [rely-on-auto-waiting]

Playwright actions and assertions auto-wait/auto-retry. Add explicit waits only when the next action depends on a UI state change that isn’t covered by the action you’re about to perform.

### Use `data-test-subj` [use-data-test-subj]

Prefer `data-test-subj` selectors via `page.testSubj` over text selectors. If a stable test subject doesn’t exist, add one to the source code instead of using brittle locator workarounds.

## API tests [scout-best-practices-api-section]

### Use `apiClient` [use-apiclient]

Use `apiClient` to validate the endpoint under test with realistic scoped credentials. Use `apiServices`/`kbnClient` for setup/teardown and side-effect verification.

See [Write API tests](./write-api-tests.md).

### Validate response body [validate-response-body]

Don’t stop at status code checks—assert response body structure and key fields to catch regressions.

## Contribute to Scout [contribute-to-scout]

If your page objects, EUI wrappers, API helpers, or fixtures are reusable:

- Platform-wide: contribute to `@kbn/scout`
- Solution-specific: contribute to `@kbn/scout-<solution>`

Internal (Elasticians): for contribution guidance, see internal AppEx QA documentation.

