---
name: write-ftr-functional-test
description: Generate an FTR functional (UI) test with page objects, testSubjects, retry-aware assertions
---

# Write FTR functional test for a Kibana UI workflow

Use this skill when the user wants a functional (UI) test for a Kibana app or workflow (e.g. "add a functional test for the X page" or "test that clicking Y does Z").

## Inputs

- **App or workflow** — e.g. "Dashboard save flow", "Uptime overview filters"
- **Test location** — which FTR config and folder (e.g. `test/functional/apps/dashboard`, or `x-pack/solutions/observability/test/functional/apps/uptime`)
- **Scenarios** — what to assert (e.g. "page loads", "filter applies", "save button creates saved object")

## Steps

1. **Locate the right FTR config and test layout.** Find the functional test suite for this app (e.g. under `test/functional/` or `x-pack/.../test/functional/`). Note the config file (e.g. `config.base.ts`) and how tests receive `FtrProviderContext` (e.g. `export default ({ getPageObjects, getService }: FtrProviderContext) => { ... }`).

2. **Create or open the test file** (e.g. `overview.ts` or `save_flow.ts`). Use the same extension (ts) and export pattern as neighboring tests: `export default (context: FtrProviderContext) => { ... }`.

3. **Use FTR services and page objects:**
   - **getPageObjects(names)** — Returns page objects (e.g. `common`, `dashboard`, `uptime`). Use for navigation (`navigateToApp`, `navigateToUrl`) and high-level actions.
   - **getService(name)** — Use `retry` for retry-aware waits, `testSubjects` for `data-test-subj` selectors, `esArchiver` for loading fixtures, `browser` for URL/cookies if needed. Prefer `testSubjects` over CSS or XPath.

4. **Structure the test:**
   - Top-level `describe('feature or page name', function () { ... })`.
   - Use `before`/`beforeEach` for fixtures (e.g. `esArchiver.load(...)`) and navigation to the app. Use `after`/`afterEach` for cleanup if needed.
   - Use `it('does something specific', async () => { ... })` for each scenario. Use async/await for all FTR calls.

5. **Interact via data-test-subj:** Use `testSubjects.find('myButton')`, `testSubjects.click('myButton')`, `testSubjects.exists('myPanel')`, `testSubjects.getVisibleText('title')`. Ensure the app under test adds the corresponding `data-test-subj` attributes so tests are stable. If they are missing, add them to the UI and then reference them in the test.

6. **Use retry for flakiness:** Wrap assertions or actions that depend on async UI in `retry.try(async () => { ... })` or use the page object’s retry-aware helpers (e.g. wait for an element then click). Avoid raw `setTimeout`; prefer waiting for a specific condition.

7. **Assert:** Use `@kbn/expect` (e.g. `expect(await testSubjects.getVisibleText('heading')).to.equal('Expected')`). Keep assertions focused on visible behavior and URL/state where relevant.

## Validation (run these and fix any failures)

1. **Type check:** Run `node scripts/type_check` from repo root. Fix any errors in the new test file.
2. **Lint:** Run `node scripts/eslint_all_files` for the test file. Fix any violations.
3. **Run the FTR functional suite** that includes this test (e.g. the app’s functional config). Ensure the new test passes. Re-run once more to reduce flakiness; fix any intermittent failures (e.g. add waits or narrow scope).

After validation, report: test file path, scenarios covered, and that type-check, lint, and the functional test run pass.
