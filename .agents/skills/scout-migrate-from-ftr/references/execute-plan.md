# Migration execution

Detailed execution steps for converting FTR tests to Scout, used **after** the user has approved the migration plan produced in step 1 of the parent skill ([`SKILL.md`](../SKILL.md)).

The plan answers _what_ and _why_; this file answers _how_.

## Required sub-skills

- **REQUIRED SUB-SKILL:** scout-create-scaffold (place tests under the correct `test/scout` path).
- **REQUIRED SUB-SKILL:** scout-ui-testing (page objects, browser auth, parallel UI patterns).
- **REQUIRED SUB-SKILL:** scout-api-testing (apiClient/auth, apiServices patterns).
- **REQUIRED SUB-SKILL:** ftr-testing (understand FTR structure, loadTestFile, and configs).

## Important note

- If the suite mostly validates **data correctness**, migrate it to a Scout **API** test (or unit/integration) instead of a Scout UI test.
- Prefer component/unit tests (RTL/Jest) for isolated UI behaviors rather than Scout functional tests. For a full catalog of what should be downgraded and where the resulting tests live, see [`pick-correct-test-type.md`](pick-correct-test-type.md).
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
- **TypeScript layout for Scout tests** (pick one; see **Where Scout tests are typechecked** under step 6): either fold `test/scout/**/*` into the **plugin root** `tsconfig.json` and add Scout `kbn_references` (like `discover_enhanced`), or keep **dedicated** `test/scout/{ui,api}/tsconfig.json` files. Only the latter forbids relative imports into `server/` / `public/`.
- Replace FTR config nesting / per-suite server args with `uiSettings` / `scoutSpace.uiSettings` and (when needed) `apiServices.core.settings(...)`.
- Auth/roles are fixture-driven: `browserAuth` (UI), `requestAuth` (API key), `samlAuth` (cookie / `cookieHeader`), plus custom roles. Avoid FTR-style role mutation. For Scout **API** tests, see **Scout API auth (`cookieHeader` vs API key)** under step 4.

## Core workflow

### 1) Decide the test type

For each FTR file the plan marked as **API test**, **UI test**, or **unit test (RTL/Jest)**, follow the plan. The full criteria for downgrades to API or RTL/Jest live in [`pick-correct-test-type.md`](pick-correct-test-type.md); consult it when:

- the plan flags a test as a downgrade, or
- you discover during execution that the plan's classification is wrong (rare; report back to the user before proceeding).

### 2) Place files correctly

- UI: `<module-root>/test/scout*/ui/{tests,parallel_tests}/**/*.spec.ts`
- API: `<module-root>/test/scout*/api/{tests,parallel_tests}/**/*.spec.ts`
- UI: use `ui/parallel_tests/` + `spaceTest` when the flow can be space-isolated (state is scoped to a Kibana space) and should run in parallel; otherwise use `ui/tests/` + `test`. See [Scout parallelism](../../../../docs/extend/scout/parallelism.md) for details on when to choose parallel vs sequential.
- API: default to `api/tests/` (sequential). Use `api/parallel_tests/` + `parallel.playwright.config.ts` only when the test is safe to run in parallel (no shared state) and you need the speedup.
- Parallel UI: avoid hardcoded saved object IDs (they can differ per space) and make names unique when needed (often suffix with `scoutSpace.id`).

#### Tags when the FTR suite was "deployment agnostic"

For available tag helpers and their meaning, see [Deployment tags](../../../../docs/extend/scout/deployment-tags.md).

FTR **deployment-agnostic** configs often load the same files under both stateful and serverless. In Scout, **do not assume** `tags.deploymentAgnostic` is the right default for every migrated spec. Instead:

- **Solution modules** (`x-pack/solutions/observability|security|search/...`): use explicit solution targets (e.g. `[...tags.stateful.classic, ...tags.serverless.observability.complete]`) so CI only runs where that solution is present. Match sibling specs in the same module.
- **Platform modules** (`src/platform/**`, `x-pack/platform/**`): `tags.deploymentAgnostic` is appropriate when the original intent was "run everywhere."

API and UI specs should both carry tags that match the intended `run-tests` / CI targets; see step 9.

### 3) Translate the test structure

- `describe/it` -> `test.describe/test` or `apiTest.describe/apiTest` (but don't assume 1:1 `it` -> `test`).
- `before/after` -> `test.beforeAll/test.afterAll`.
- `beforeEach/afterEach` -> `test.beforeEach/test.afterEach`.
- Keep **one suite per file** and a flat hierarchy (avoid nested `describe`; use `test.step()` inside a test for structure).
- If a single FTR file contains multiple top-level `describe` blocks, split into multiple Scout specs (one describe per file).
- **Nested `describe` blocks**: if the FTR file has nested describes, prefer splitting into separate Scout spec files. However, if the file is small and the nested describes are lightweight, flatten them into a single `test.describe` with individual `test(...)` blocks using `test.step(...)` for sub-structure instead of creating many tiny spec files.

#### Combine duplicate stateful / serverless FTR tests

FTR often has **separate but near-identical** test files under `test/*api_integration*/` (stateful) and `test/serverless/` (or similar directories). Before migrating each file individually, compare them: if the test flow is identical or almost identical, **combine into a single Scout spec** with tags covering both deployment targets (e.g. `[...tags.stateful.classic, ...tags.serverless.observability.complete]`). Extract any deployment-specific differences into conditional helpers or small branching within the spec. Only keep separate specs when the flows genuinely diverge.

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

- Replace `supertest` calls with Scout `apiClient` (endpoint under test) + `requestAuth`/`samlAuth` (auth). FTR stateful tests often use `supertest` with an implicit **admin** role—don't carry that over blindly. Research whether a lower default role like `editor` or `viewer` is sufficient; comparing the roles used in the **serverless** version of the same test (if one exists) is a good starting point.
- Replace other FTR services with Scout fixtures (`pageObjects`, `browserAuth`, `apiServices`, `kbnClient`, `esArchiver`).
- Use `apiServices`/`kbnClient` for setup/teardown and verifying side effects.
- **Audit FTR before/after hooks carefully**—don't copy them verbatim. Review every call in `before`/`beforeEach`/`after`/`afterEach` and verify it is still correct for Scout: replace FTR-specific APIs with their Scout equivalents, remove unnecessary calls (e.g. FTR service initialization that Scout fixtures handle automatically), and add any missing setup or cleanup that the FTR suite neglected. Ensure every resource created in `beforeAll`/`beforeEach` has matching cleanup in `afterAll`/`afterEach`—FTR suites frequently lack proper teardown. Place `kbnClient.savedObjects.cleanStandardList()` (or `scoutSpace.savedObjects.cleanStandardList()`) in **`afterAll`**, not `beforeAll`; `beforeAll` cleanup masks missing teardown and hides leaked state from previous runs.
- Replace webdriver waits with Playwright/page object methods.
- Move UI selectors/actions into Scout page objects; register new page objects in the plugin fixtures index.
- If the test needs API setup/cleanup, add a scoped API service and use it in `beforeAll/afterAll`.
- Replace per-suite FTR config flags with `uiSettings` / `scoutSpace.uiSettings`, and (when needed) `apiServices.core.settings(...)`.
- Use the correct Scout package for the test location (`@kbn/scout` vs `@kbn/scout-<solution>`), and import `expect` from `/ui` or `/api`.
- If the test needs rison-encoded query params, use `@kbn/rison` and add it to `test/scout*/ui/tsconfig.json` `kbn_references`.

#### Always lint before committing

Run ESLint on every changed spec file before committing:

```bash
node scripts/eslint <changed-file>
```

Fix **all errors** (not just warnings) before pushing. Common Scout-specific lint errors:

- `playwright/no-nth-methods` — replace `.first()` / `.last()` / `.nth()` with `.filter()`, `allInnerTexts()[0]`, or CSS `:nth-child()` selectors
- `playwright/no-force-option` — do not pass `{ force: true }` to clicks; use `.focus()` for plain textareas or the Monaco API for Monaco editors (see Monaco section below)
- `playwright/no-wait-for-timeout` — replace `waitForTimeout` with `toBeVisible({ timeout })` or `toBeHidden({ timeout })`
- `playwright/no-conditional-in-test` — replace `if (await locator.isVisible())` guards with `locator.click().catch(() => {})` or equivalent non-conditional patterns
- `playwright/expect-expect` — if all assertions are inside a helper function, add at least one direct `expect()` call visible to ESLint in the test body

#### EUI ComboBox (index / data-view selector)

EUI's async ComboBox debounces `onSearchChange` by 250 ms. `fill()` sends a programmatic value change that does **not** trigger this handler — the listbox never opens.

```ts
// ✅ correct
await indexCombo.locator('[data-test-subj="comboBoxInput"]').click();   // open the box
await indexCombo
  .locator('[data-test-subj="comboBoxSearchInput"]')
  .pressSequentially('my-index-prefix', { delay: 50 });                // fires keyboard events
const option = page.locator('.euiComboBoxOption[title="my-index-name"]');
await option.waitFor({ state: 'visible', timeout: 30_000 });
await option.click();

// ❌ wrong — fill() bypasses the debounce; listbox never appears
await indexInput.fill('my-index-name');
await page.locator('[role="listbox"] [role="option"]:first-child').click(); // also banned: no-nth-methods
```

**Why a partial prefix?** `getIndexOptions()` always appends a "Choose…" entry whose title equals the exact typed text. If you type the full index name, both the "Based on your data views" result and the "Choose…" entry get the same `title` attribute → Playwright strict-mode violation. Type a prefix short enough that the two entries have distinct titles.

**`<select>` time-field options:** `<option>` elements inside a `<select>` are never "visible" in Playwright — use `{ state: 'attached' }`:

```ts
await timeFieldSelect.locator('option:nth-child(2)').waitFor({ state: 'attached' });
await timeFieldSelect.selectOption({ index: 1 });
```

#### Monaco editors

`fill()` and `focus()` on the hidden Monaco textarea do **not** reliably trigger React re-renders. The textarea is obscured by Monaco's own view layers, so `{ force: true }` is both fragile and banned by `playwright/no-force-option`.

Use the Monaco JS API instead:

```ts
// Single editor on the page (e.g. queryJsonEditor)
await page.locator('[data-test-subj="queryJsonEditor"]').waitFor({ state: 'visible' });
await page.evaluate((v) => {
  const editor = (window as any).MonacoEnvironment?.monaco?.editor;
  if (editor) editor.getModels().forEach((m) => m.setValue(v));
}, newValue);

// Multiple editors on the page (e.g. DSL filter popover + main editor)
// target the most recently created instance
await page.evaluate((v) => {
  const monaco = (window as any).MonacoEnvironment?.monaco?.editor;
  if (monaco) {
    const editors = monaco.getEditors();
    editors[editors.length - 1]?.getModel()?.setValue(v);
  }
}, dslFilterValue);
```

After setting a Monaco value, buttons that depend on it (e.g. "Save filter") may be below the viewport — call `.scrollIntoViewIfNeeded()` before clicking.

#### Tokenized / OR-based search results

Some Kibana list UIs use token-based OR search. A search for `my-rule-1234` may also return `other-rule-1234` because they share the `1234` token. This causes:
- `toHaveCount(1)` failures when extra rows appear
- Wrong-row actions when an unscoped `collapsedItemActions` click targets the first matching element

Scope action locators to the specific row using `.filter()`:

```ts
const row = page
  .locator('[data-test-subj^="rule-row"]')
  .filter({ has: page.locator(`[title="${ruleName}"]`) });

await row.locator('[data-test-subj="collapsedItemActions"]').click(); // targets only this row
```

When two test entities are created simultaneously and their names must not share tokens, use UUID-based names:

```ts
import { randomUUID } from 'node:crypto';
const r1Name = `clearfind-${randomUUID()}`;
const r2Name = `clearcheck-${randomUUID()}`;
```

#### EUI filter dropdowns stay open between clicks

EUI multiselect filter dropdowns stay open after an option click. `.euiBasicTable:not(.euiBasicTable-loading)` waitFor resolves too early and causes stale count assertions. Use `toHaveCount` (which auto-retries) directly after each click instead:

```ts
// ✅ correct
await page.testSubj.click('ruleStatusFilterButton');          // open once
await page.testSubj.click('ruleStatusFilterOption-enabled');
await expect(getTableRows(page)).toHaveCount(2);              // auto-retries
await page.testSubj.click('ruleStatusFilterOption-disabled');
await expect(getTableRows(page)).toHaveCount(4);              // dropdown still open
await page.testSubj.click('ruleStatusFilterButton');          // close at end
```

After a full page refresh (navigate away and back), dropdowns reset — re-open before clicking options.

#### Client-side-filtered list pages

Some Kibana list pages (connectors, saved objects) load all items once at page load and filter client-side. Create API resources **before** navigating to the page:

```ts
// ✅ connector is in the initial snapshot
const created = await apiServices.alerting.connectors.create({ ... });
await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));

// ❌ connector created after page load is invisible until reload
await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
const created = await apiServices.alerting.connectors.create({ ... });
```

#### Form dirty-state detection

When a test fills a form field and immediately clicks Cancel expecting a "discard changes?" confirmation modal, use `pressSequentially()` instead of `fill()`. `fill()` may not fire the synthetic events that mark the form as dirty before the cancel click lands:

```ts
const nameInput = page.testSubj.locator('ruleDetailsNameInput');
await nameInput.click();
await nameInput.pressSequentially('any-change');
await page.testSubj.click('rulePageFooterCancelButton');
await expect(page.testSubj.locator('confirmRuleCloseModal')).toBeVisible();
```

#### Modal overlay race between sequential tests

Some Kibana modals use an EUI overlay mask that can persist long enough to block the next test's first click. When a test only needs to verify the re-enable/re-enable path (not the disable modal itself), trigger the state change via API to avoid the modal entirely:

```ts
await kbnClient.request({ method: 'POST', path: `/api/alerting/rule/${id}/_disable`, ... });
// now test the UI re-enable flow without an overlay race
```

#### Scout API auth (`cookieHeader` vs API key)

For general Scout API auth patterns (`requestAuth`, `samlAuth`, common headers, code examples), see [Authentication in Scout API tests](../../../../docs/extend/scout/api-auth.md).

**FTR mapping:** FTR `roleScopedSupertest` with `useCookieHeader: true` / `withInternalHeaders` maps to **`samlAuth`** + **`cookieHeader`** merged with common headers on `apiClient` requests. FTR `supertest` with API key auth maps to **`requestAuth.getApiKey(...)`** + **`apiKeyHeader`**.

**FTR migration gotchas (not covered in the general doc):**

- Handlers that call **`core.security.authc.apiKeys.create`** (nested API keys) often **fail with HTTP 500** when the incoming request uses an API key. Use **`samlAuth.asInteractiveUser('admin')`** (or the role FTR used with cookies) for those routes.
- **Negative / least-privilege tests** that in FTR used a **custom role + cookie** (e.g. empty `kibana: []` privileges) and expect **404** from scoped saved-object access: use **`samlAuth.asInteractiveUser(customRoleDescriptor)`** + **`cookieHeader`**. **`requestAuth.getApiKeyForCustomRole(...)`** can resolve **200** for the same role shape because API-key privilege resolution differs from an interactive session.

### 5) Split loadTestFile suites

- Each `loadTestFile` target becomes its own Scout spec.
- Move shared setup into each spec (or a shared fixture/helper).
- Don't rely on spec execution order (it's not guaranteed).
- Split flows with different state requirements (localStorage, tour visibility) into dedicated specs.

### 6) Add helpers and constants

- Put shared helpers in `test/scout*/ui/fixtures/helpers.ts` (or API helpers in API fixtures).
- Add test-subject constants in `fixtures/constants.ts` for reuse across tests and page objects.
- For `parallel_tests/` ingestion, use `parallel_tests/global.setup.ts` + `globalSetupHook` (no `esArchiver` in spec files).
- For suite-wide Elasticsearch/Kibana state reset (e.g. reverting feature flags or global `uiSettings`, dropping hand-indexed data that affects other Scout configs sharing the cluster), use the **optional** `globalTeardownHook` in `parallel_tests/global.teardown.ts`. Picked up automatically when `runGlobalSetup: true` — no extra config flag. Use `esClient.indices.delete` / `deleteDataStream` / `deleteByQuery`, `kbnClient.uiSettings.unset(...)`, and `apiServices.core.settings(...)` to reset state. Per-test/per-suite cleanup still belongs in `afterEach`/`afterAll`.

#### Synthtrace in Scout **API** tests

Import the fixture from **`@kbn/scout-synthtrace`** (not from `@kbn/scout` / `@kbn/scout-oblt` alone). Merge it into your module's `apiTest` in `test/scout*/api/fixtures/index.ts`:

```ts
import { apiTest as baseApiTest, mergeTests } from '@kbn/scout-oblt'; // or '@kbn/scout' for platform-only modules
import { synthtraceFixture } from '@kbn/scout-synthtrace';

export const apiTest = mergeTests(baseApiTest, synthtraceFixture);
```

Specs then receive worker fixtures such as **`logsSynthtraceEsClient`** (`index` / `clean`) for `@kbn/synthtrace-client` generators (`log`, `timerange`, etc.).

Add the same Scout **`kbn_references`** on **whichever `tsconfig.json` includes the Scout API files**: either the **plugin root** `tsconfig.json` or `test/scout*/api/tsconfig.json`. Typical API set: `@kbn/scout-oblt` (or `@kbn/scout`), **`@kbn/scout-synthtrace`**, **`@kbn/synthtrace-client`** (add `@kbn/synthtrace` only if types require it). UI-only synthtrace: same **`@kbn/scout-synthtrace`** import in fixtures.

#### Where Scout tests are typechecked (choose one)

See **TypeScript layout** in the `scout-create-scaffold` skill for full **Pattern A** / **Pattern B** details (what to add to `tsconfig.json`, `kbn_references`, and the `yarn kbn bootstrap` / `type_check` steps).

**Choosing:** Prefer **Pattern A** when migrating FTR tests that already imported registration constants or server helpers. Prefer **Pattern B** when you want minimal plugin compile cost and can keep imports boundary-safe.

#### Scout API imports and TypeScript project boundaries (Pattern B only)

If the module uses **Pattern B**, treat the Scout API directory as isolated:

- Avoid relative imports into plugin **`server/`** / **`public/`** just to reuse a string constant—use **`api/fixtures/constants.ts`** or move the constant to **`common/`** if both prod and tests should share it.
- Prefer **`@kbn/scout*`** / **`@kbn/synthtrace-client`** per that folder's **`kbn_references`**.

**FTR migration tip:** FTR often imported server files because tests sat in the plugin program. **Pattern A** preserves that. **Pattern B** matches "thin" e2e deps—duplicate small literals or use fixtures when adding `server/` to the Scout `tsconfig` graph is wrong.

### 7) Extract component/unit tests where possible

While implementing, look for logic that can be pulled out of e2e into RTL/Jest. Not every FTR `it` block needs a Scout equivalent. The full catalog of extraction candidates and where the resulting tests live is in [`pick-correct-test-type.md`](pick-correct-test-type.md).

Keep Scout tests for what **requires a real browser and running server**: navigation, cross-page flows, permission-gated UI, and serverless-vs-stateful differences.

### 8) Clean up FTR wiring

- Remove `loadTestFile` entries from any stateful and serverless FTR configs/index files.
- Delete old FTR test files once Scout coverage is verified.
- For staged migrations, mark remaining FTR suites as `describe.skip` to avoid duplicate coverage.

### 9) Verify and run tests locally

- **Typecheck:** For **Pattern A**, run **`node scripts/type_check --project <plugin-root>/tsconfig.json`**. For **Pattern B**, run **`node scripts/type_check --project <plugin>/test/scout/api/tsconfig.json`** (and UI project if present). Use full **`node scripts/type_check`** when shared types changed broadly. Huge **`TS6059` / `TS6307`** counts under a **Scout-only** project usually mean **Pattern B** + forbidden **`server/`** relatives—switch to **Pattern A** or fix imports (step 6).
- Use `node scripts/scout.js run-tests --arch stateful --domain classic --testFiles <path>` and
  `node scripts/scout.js run-tests --arch serverless --domain observability_complete --testFiles <path>` (adjust serverless domain).
- If the tests are under `test/scout_<configSet>/...`, `run-tests` auto-detects the server config set from the Playwright config path.
- `start-server` has no Playwright config to inspect, so pass `--serverConfigSet <configSet>` when your tests require a custom config set.
- Each test must include assertions in the test body (not hidden inside page objects; page objects should return state).
- UI tests must have at least one supported tag (Scout validates UI tags at runtime). API tests should also be tagged.
- Avoid checking raw data in UI tests; prefer page object methods over direct selectors.
- Preserve or update tags for deployment targets when needed; for **solution** modules, prefer **stateful + solution serverless** tags over `tags.deploymentAgnostic` (see **Tags when the FTR suite was "deployment agnostic"** under step 2).
- Run Scout tests in both stateful and serverless if the plugin supports both.

### 10) Hand off to Step 5

Once the new specs typecheck and run, control returns to the parent skill. Step 5 (review parity & best practices) is owned by [`SKILL.md`](../SKILL.md), which dispatches to the `scout-best-practices-reviewer` skill with the removed FTR files as parity context.

## Common patterns

- Use `test.step(...)` inside a single `test(...)` when an FTR suite used multiple `it(...)` blocks as one journey.
- Parallel UI: isolate per-space state via `spaceTest` + `scoutSpace`; avoid hardcoded saved object IDs and make names unique (often suffix with `scoutSpace.id`).
- Use `globalSetupHook` in `parallel_tests/global.setup.ts` to ingest shared data once.
- Use the optional `globalTeardownHook` in `parallel_tests/global.teardown.ts` to reset shared state once after the suite (no `esArchiver`; `esClient`/`kbnClient`/`apiServices` only). See step 6 above for the cleanup primitives and cautions.
- Use `page.addInitScript(...)` before navigation to set localStorage/cookies (skip tours/onboarding).
- When FTR used rison-encoded query params, replicate with `@kbn/rison` and add **`@kbn/rison`** to **`kbn_references`** on the `tsconfig.json` that includes the Scout UI files (plugin root under **Pattern A**, or `test/scout/ui/tsconfig.json` under **Pattern B**).
- Add stable `data-test-subj` attributes when selectors are unstable.
- Centralize deep links + page-ready waits in page objects.

## Common mistakes

- **Not running ESLint before committing** — Scout spec files have strict lint rules (`no-force-option`, `no-nth-methods`, `no-wait-for-timeout`, `no-conditional-in-test`). Run `node scripts/eslint <changed-file>` and fix all errors before pushing.
- **Using `fill()` for EUI ComboBox or Monaco editor inputs** — `fill()` does not trigger debounced React `onSearchChange` handlers or Monaco model updates. Use `pressSequentially({ delay: 50 })` for comboboxes and the Monaco JS API (`window.MonacoEnvironment?.monaco?.editor`) for code editors.
- **Using `{ force: true }` on Monaco textareas** — banned by `playwright/no-force-option`; use the Monaco API instead.
- Migrating data validation UI tests instead of converting to API tests.
- Forgetting to split `loadTestFile` suites into separate Scout specs.
- Forgetting UI tags (required; Scout validates UI tags at runtime). API tests should also be tagged so CI/discovery can select the right deployment target.
- Placing Scout tests outside `test/scout*/{ui,api}/{tests,parallel_tests}`.
- Ignoring existing parallel Scout config (mixing `tests/` with `parallel_tests/`).
- Using the wrong Scout package (solution tests in security/observability/search must import from their solution Scout package, not `@kbn/scout`).
- Using `tags.deploymentAgnostic` for specs under a **solution** plugin/package when the FTR suite was only "deployment agnostic" in the sense of shared stateful+serverless **observability** (or security/search) configs—those jobs still differ from the broad `deploymentAgnostic` tag set; use **explicit `tags.stateful.*` + `tags.serverless.<solution>`** instead (see step 2).
- Importing `expect` from the wrong entrypoint (use `/ui` for UI, `/api` for API).
- Using `esArchiver` in `parallel_tests/` spec files (ingest in `parallel_tests/global.setup.ts` instead).
- Using nested `describe` blocks or `*.describe.configure()` (split into separate specs, or flatten small files into `test` + `test.step`—see step 3).
- Migrating near-identical stateful and serverless FTR files as two separate Scout specs instead of combining them into one spec with appropriate tags (see step 3).
- Spreading one user journey across multiple Scout `test(...)` blocks (fresh browser context per test).
- Hiding assertions inside page objects (ESLint `expect-expect` requires assertions in the test body; page objects should return state, not assert).
- Packing too many `test(...)` blocks into a single spec file. Keep specs focused: 4–5 short scenarios or 2–3 long scenarios per file. Oversized specs create bottlenecks in parallel execution.
- Using **`requestAuth.getApiKey('admin')`** for **internal** routes whose handlers **create nested API keys**—often **HTTP 500**; use **`samlAuth.asInteractiveUser`** and merge **`cookieHeader`** (see step 4).
- Using **`getApiKeyForCustomRole`** for FTR parity on **scoped saved-object / RBAC** assertions that used **cookie + custom role**—prefer **`samlAuth.asInteractiveUser(customRoleDescriptor)`** + **`cookieHeader`** so outcomes match FTR (e.g. **404** vs **200**).
- **Pattern B** + relative imports from `test/scout*/api/` into **`server/`** / **`public/`** (e.g. `server/saved_objects/...`). Fix by **Pattern A** (`test/scout/**/*` in the plugin `tsconfig` + Scout `kbn_references`) or duplicate constants in **`api/fixtures/constants.ts`** (step 6).
- **Pattern A** but forgetting to add **`test/scout/**/*`** to **`include`** or omitting **`@kbn/scout-oblt`** / synthtrace **`kbn_references`**—Scout files won't typecheck in **`check_types`**.
