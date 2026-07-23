---
name: scout-best-practices-reviewer
description: Review Scout UI/API tests (including Scout test migrations) for best practices, reuse, parity, and server config hygiene.
---

# Scout Best Practices Reviewer

## Overview

Perform a static PR review of Scout UI and API test files (`*.spec.ts`) against Scout best practices and existing Scout abstractions (fixtures, page objects, API helpers). Produce actionable, PR-review-ready feedback that pushes for reuse over one-off implementations.

**Solution-specific skills may extend this skill** with additional review criteria. Check if one exists for your solution (e.g., Security Solution has one at `<plugin>/.agents/skills/scout-best-practices-reviewer/`). Run the general review first, then apply solution-specific checks.

Important: Do not post GitHub comments unless explicitly stated.

### Inputs

1. Changed `*.spec.ts` files (and imported helpers/fixtures).
   - UI Tests: Use `test` / `spaceTest` (usually in `**/test/scout/ui/**`).
   - API Tests: Use `apiTest` (usually in `**/test/scout/api/**`).
2. Neighboring Scout code in the same plugin/solution (existing specs + `test/scout/**/fixtures/**`) to spot reuse opportunities and avoid duplicating helpers.
3. Removed/previous tests (if this is a migration) to verify behavior parity.
4. Scout docs (open only what you need — best practices are split by test type so you can skip the irrelevant half):

   - **General best practices** (always relevant): `docs/extend/testing/scout-best-practices.md`
   - **UI-only best practices** (open when reviewing UI tests): `docs/extend/testing/ui-best-practices.md`
   - **API-only best practices** (open when reviewing API tests): `docs/extend/testing/api-best-practices.md`
   - Core concepts & fixtures: `docs/extend/testing/scout.md`, `docs/extend/testing/fixtures.md`
   - Reuse surfaces: `docs/extend/testing/page-objects.md`, `docs/extend/testing/api-services.md`
   - Type-specific guides: `docs/extend/testing/write-ui-tests.md`, `docs/extend/testing/write-api-tests.md`
   - As needed: `docs/extend/testing/api-auth.md`, `docs/extend/testing/browser-auth.md`, `docs/extend/testing/parallelism.md`, `docs/extend/testing/deployment-tags.md`, `docs/extend/testing/a11y-checks.md`, `docs/extend/testing/debugging.md`, `docs/extend/testing/run-scout-tests.md`

   **Rule of thumb:** always read the general best practices, then open **only** the UI-specific file for UI reviews or the API-specific file for API reviews. If a PR mixes UI and API specs, open both.

## Critical checks (do these first, one by one)

This review is a **multi-step workflow**. Before the general scope/checklist below, work through the numbered critical checks in this section **one at a time, in order** — do not batch them and do not skip ahead. Each check is high-signal: a genuine hit almost always means the PR should change before merge, so treat them as the highest priority findings in the review.

For every critical check:

1. Determine whether the PR triggers the check (see each check's **Detect**).
2. If it does, run the check's evaluation and decide whether it's a real hit.
3. If it's a hit, produce a finding and **point to the referenced docs**.

### Check 1 — Scout custom server config additions

**Why:** Every custom server config set boots its **own dedicated local Kibana** (extra CI cost, **not supported on Cloud/QA** — local only), so it must earn its keep. Many settings need no custom server because they're **runtime-toggleable** via `apiServices.core.settings(...)`, which works everywhere including Cloud.

**Detect** — the PR touches a config set: files under `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/<name>/**` (esp. `serverArgs` / `ScoutServerConfig` fields), a new `test/scout_<name>/` dir, or new `--serverConfigSet <name>` usage.

**Verify** — for each added setting, is a dedicated server actually required, or achievable at runtime?

- Runtime-toggleable (does NOT justify a config set): `--feature_flags.overrides.*`, `--uiSettings.overrides.*` / `globalOverrides.*`, plugin `experimentalFeatures` read at runtime → move to `apiServices.core.settings(...)` in `global.setup.ts` (parallel) or `beforeAll`/`afterAll` (sequential).
- Boot-required (justifies a config set): settings read during plugin `setup` (route registration), `--xpack.<plugin>.enabled`, ES/server args (`esServerlessOptions`), auth/IdP wiring. When unsure, ask the author — don't assert.

**Flag when:** additions are only runtime-toggleable (drop the config set); a set mixes boot-required + runtime (move the runtime subset out, keep it minimal); a new set lacks evidence it's needed (docs require reaching out to AppEx QA first — ask if that happened).

**Refs:** `docs/extend/testing/feature-flags.md` (runtime-vs-custom-server table, `#scout-feature-flags-runtime`, `#scout-feature-flags-custom-servers`), `docs/extend/testing/global-setup-hook.md`.

### Check 2 — Scout spec lives where selective testing will run it

**Why:** PR CI schedules a Scout config only when its owning `@kbn/` module (nearest `kibana.jsonc` to the config, resolved via `findPackageForPath`) is in the affected set — the changed modules plus everything that depends on them through `tsconfig.json` `kbn_references`. A spec that exercises module `X` but lives in a package with no `kbn_references` edge to `X` never runs on `X`'s PRs — silent coverage loss until the post-merge suite.

**Detect** — the PR adds/moves a spec (`**/test/scout{,_*}/**/{ui,api}/**/*.spec.ts`) that exercises code outside its host package: `page.gotoApp('security'|...)` / `page.goto('/app/<other>')` or another solution's `data-test-subj` / nav (e.g. `securitySolutionUI:*`, Cases, ML) from a platform/shared plugin; cross-solution tags (e.g. `@local-serverless-security_complete`); or a `<namespace>` that doesn't match the `public/<area>/` it covers.

**Verify** — find the spec's host module (nearest `kibana.jsonc`) and the module(s) owning the code it exercises; confirm they're the same or that the host's `tsconfig.json` `kbn_references` transitively reach the covered module. The host plugin must be in `.buildkite/scout_ci_config.yml` `plugins.enabled`.

**Flag when:** the host package doesn't depend on the code under test → relocate the spec + its config set (`*.playwright.config.ts`, `fixtures/`, `tests|parallel_tests/`, `global.setup.ts`) to the owning plugin, fix `kbn_references` + CODEOWNERS, and rerun `node scripts/scout update-test-config-manifests`. Keep only solution-agnostic assertions (chrome/breadcrumb) in the platform plugin.

**Refs:** `src/platform/packages/shared/kbn-scout/src/tests_discovery/{testing_scope,affected_modules}.ts`, `src/platform/packages/private/kbn-scout-info/src/paths.ts`, `.buildkite/scripts/steps/test/scout/resolve_selective_testing.ts`, `.buildkite/scout_ci_config.yml`.

### Check 3 — Pick the right test type (and 100% justify it)

**Why:** Test type is the biggest lever on speed, reliability, and cost: UI (browser) is the slowest/most flake-prone, API is cheaper/deterministic, Jest unit/RTL is cheapest/most direct. A UI test for what is really data correctness or pure logic buys flakiness and CI time for coverage a cheaper layer gives faster. Migrations are the moment to fix a mis-layered test, not port it 1:1. "It works / it's easier / that's how the FTR test did it" is NOT sufficient.

**Detect** — the PR adds/migrates a UI spec (`test` / `spaceTest` under `**/test/scout/ui/**`), an API spec (`apiTest` under `**/test/scout/api/**`), or an FTR→Scout / Cypress→Scout migration.

**Verify** — map each test to the cheapest layer that fully covers it:

- UI asserting data correctness / API shape (exact counts, aggregations, response fields, `403`/capability read via the DOM, e.g. `toHaveText('1,024')`) → move to `apiTest`.
- UI verifying pure logic or a single component's rendering (conditional/empty states, a badge that's a pure function of a prop, formatters, validation) → Jest unit/RTL.
- UI is justified only for browser-only behavior: multi-step/-component flows, in-app role behavior, non-trivial front-end logic (e.g. a flyout's conflict resolution). A number in the DOM alone doesn't justify UI.

**Flag when:** a UI test's assertions are data-correctness/logic-only, a migration ports an FTR data/logic suite straight into UI, or the type is defended only with "it works / easier / that's how it was" → ask "what does a browser round-trip verify that an API (data/contract) or unit/RTL (logic) test wouldn't?" If nothing, move it down the pyramid; if there's real UI-layer behavior, have the author name it. Move only the offending assertion when the rest is a legit flow.

**Refs:** `docs/extend/testing/scout-best-practices.md#pick-the-right-test-type` (selection table), `docs/extend/testing/migrate-tests.md#dont-migrate-blindly`, `docs/extend/testing/ui-best-practices.md`.

## Scope (be comprehensive)

- Don’t limit the review to the diff. Look for duplication and missed reuse by scanning:
  - existing Scout specs in the same area (and similar suites elsewhere in the repo)
  - available fixtures (`docs/extend/testing/fixtures.md` + local `test/scout/**/fixtures`)
  - existing page objects, API services, and fixtures (in `@kbn/scout`, solution Scout packages, and plugin-local `test/scout/**`) before suggesting brand-new helpers

### Quick checklist

Checklist items are tagged with the document they're detailed in:

- **[general]** → `docs/extend/testing/scout-best-practices.md` (applies to both UI and API tests)
- **[ui]** → `docs/extend/testing/ui-best-practices.md`
- **[api]** → `docs/extend/testing/api-best-practices.md`

Open only the docs relevant to the test type(s) under review.

- **[general]** **Reuse-first**: prefer existing `pageObjects`, fixtures, and `apiServices`; if adding helpers/page objects, place them in the right scope (plugin vs solution vs `@kbn/scout`) and register via fixtures.
- **[general]** **No unused constants**: flag constants that are unused or used in only one place — prefer inlining them.
- **[api]** **Fixture boundaries**: `apiClient` for the endpoint under test; `apiServices`/`kbnClient` for setup/teardown only; correct auth + common headers.
- **[api]** **Correctness**: guardrail assertions before dereferencing response fields; validate contract + side effects; stable error assertions.
- **[ui]** **UI scope**: keep UI specs focused on user interactions and rendering; for data-correctness assertions and choosing the right layer, see **Check 3 — Pick the right test type**.
- **[ui]** **Page objects**: Encapsulate multi-step interactions and reused sequences in page objects — specs should primarily hold assertions (`expect`), test flow (`test.step`), and page-object method calls. Short inline locator calls for simple one-off assertions (e.g. a single label or nav-link check) are acceptable. Flag raw locators when the interaction is complex enough to benefit from abstraction or is duplicated across specs. Extract all locators as `readonly` properties in the constructor; no inline locator creation inside methods.
- **[general]** **Isolation**: parallel-safe data; resilient cleanup in `afterAll`/`afterEach`; defensive cleanup in `beforeAll` for failed-run leftovers; `scoutSpace.savedObjects.cleanStandardList()` as catch-all after domain-specific cleanup; no reliance on file ordering or shared mutable state.
- **[general]** **RBAC / realism**: minimal permissions (avoid `admin` unless required); space-aware behavior covered or explicitly out of scope.
- **[ui]** **Flake traps**: avoid `waitForTimeout()` and time-based assertions/retries; rely on auto-waiting + explicit readiness signals. Some locators are restricted by `@kbn/eslint/scout_no_locators` (e.g. `globalLoadingIndicator`).
- **[general]** **Cost**: avoid repeating expensive setup; consider a global setup hook for shared one-time operations.
- **[general]** **Global teardown** (when `global.teardown.ts` is present): cleanup must use `esClient`/`kbnClient`/`apiServices`. `esArchiver` isn't on the teardown fixture surface — Scout intentionally never exposed archive-unloading (slow and unnecessary; leftover indexes don't break tests with idempotent `loadIfNeeded`). Flag teardowns that try to use `esArchiver` at all, that **load** new data (teardown is for state reset only), or that duplicate work belonging in `afterAll`/per-test cleanup.
- **[general]** **Tags / environment**: validate deployment tags and avoid assumptions that only hold in specific environments.

### Files to skip

Do not review or comment on:

- **`.meta` manifest files** (e.g., `**/.meta/**/*.json`): these are auto-generated for CI test planning and lane distribution. No manual regeneration is needed.

### Severity classification

Use these definitions when assigning severity:

- **Blocker**: Will cause test failures, breaks CI, missing required coverage (migration parity gaps), security or data leak risks
- **Major**: Likely to cause flakiness, incorrect test coverage, permission/auth errors, violates core best practices in ways that affect correctness
- **Minor**: Suboptimal patterns, missed reuse opportunities, efficiency improvements, style inconsistencies that don't affect correctness
- **Nit**: Cosmetic issues, naming suggestions, optional improvements, "nice to have" changes

When in doubt, prefer a lower severity. Optimization suggestions (efficiency improvements) should be `minor` or `nit`, not `major`.

### Migration parity analysis (required when migration is detected)

- **Detect migration** when the PR removes/changes FTR tests (for example `test/functional/**`, `loadTestFile()`, FTR configs) alongside new/changed Scout specs.
- **If migration is detected**:
  - Treat parity gaps as `blocker` unless explicitly de-scoped.
  - Confirm the suite is the right **test type** (UI vs API): if the old FTR suite is primarily “data correctness”, prefer migrating it to a Scout API test (or unit/integration) rather than a Scout UI test.
  - Build a parity map from old scenarios → new Scout coverage (roles, setup/teardown, assertions, cleanup).
  - Call out missing behaviors (including error paths) and recommend exactly where to add coverage.
  - Escalate meaningful **Scout vs FTR deltas** when they could change what’s actually being tested, weaken coverage, or increase flake risk. Treat these as parity issues that require action (code change or explicit de-scope/sign-off), and include them in the “Migration parity” output section.
    - auth/roles used (e.g., `admin` vs viewer), spaces behavior, and permission realism
    - headers/internal origin/REST versioning and any other request shaping differences
    - retries and error handling differences (e.g., helper methods with `ignoreErrors`, automatic retries)
    - parallelism/isolation differences (worker-scoped fixtures, shared state, cleanup semantics)
    - classic vs serverless coverage changes (suite removed from one environment but not the other)
    - assertion strength changes (weaker/stronger checks, removal of side-effect validation)
  - Verify suite wiring/discovery (new specs are picked up by Scout/Playwright config; no orphaned `loadTestFile()`).
  - Ensure any intentional de-scopes are explicit, and that tags/permissions remain equivalent and cloud/serverless compatible where applicable.
- **Output**: include the “Migration parity” section only when action is required; otherwise omit it.

### Kibana / EUI component patterns (UI)

These EUI/Kibana component behaviours are non-obvious and cannot be inferred from documentation alone.

- **`QueryStringInput`**: `fill()` races with React prop sync; use `pressSequentially()` instead.
- **`EuiBasicTable` empty state**: always renders a phantom "no items found" row — assert `toContainText('No items found')`, never `toHaveCount(0)`.
- **EUI disabled button tooltip**: hover the `span:has([data-test-subj="..."])` wrapper, not the button itself.
- **EUI CSS class selectors** (`.euiTableRow`, `.euiToolTipAnchor`, etc.): internal to EUI, change between versions — use `data-test-subj` or ARIA roles.
- **DOM instability from app bugs**: use `dispatchEvent('click')` over `{ force: true }`; document the bug location in a comment.

## Output

This skill does not prescribe an output format. The caller decides how findings are reported:

- **Automation (macroscope, Bugbot, CI bots, etc.)**: follow the output instructions provided by the calling config.
- **Local / direct invocation**: use the default format in [`OUTPUT.md`](./OUTPUT.md).

## Follow-up

Offer to generate the updated code, fully incorporating the suggested improvements and resolving any parity gaps.
