---
name: cypress-to-scout-migration
description: >
  Migrate Kibana Cypress E2E tests (.cy.ts) to Scout (Playwright). Applies to any Kibana plugin or
  solution. Includes triage gates (duplicate detection, layer analysis, value assessment),
  Cypress-to-Scout pattern mapping, data cleanup audit, and PR workflow. Use when: (1) migrating a
  Cypress test to Scout, (2) converting .cy.ts to .spec.ts, (3) planning a Cypress-to-Scout migration
  batch, (4) rewriting Cypress screens/tasks as Scout page objects, (5) asked "how do I move this
  Cypress test to Scout/Playwright", (6) asked about differences between Cypress and Scout.
---

# Cypress to Scout Migration

## Overview

Migrate Cypress tests to Scout by first validating each test through triage gates, then rewriting using Scout patterns. **Never migrate Cypress tests directly** — validate first, then rewrite following Scout best practices.

**Solution-specific skills may extend this skill** with additional conventions, paths, and API services. Check if one exists for your solution (e.g., Security Solution has one at `<plugin>/.agents/skills/cypress-to-scout-migration/`).

## Required sub-skills

- **REQUIRED:** scout-create-scaffold (generate Scout directory structure)
- **REQUIRED:** scout-ui-testing (page objects, browser auth, parallel UI)
- **REQUIRED:** scout-api-testing (apiClient/auth, apiServices patterns)
- **REQUIRED:** scout-best-practices-reviewer (review migrated tests)

## Core principle

Exercise behavior in the least flaky automation layer first:
**UNIT > API > UI**

A Cypress E2E test should only become a Scout E2E test if it genuinely tests a user workflow that cannot be verified at a lower layer.

## Tools

- **Scaffold a spec file:** `bash scripts/scaffold_scout_spec.sh --name <name> --domain <path> --plugin-test-dir <path> [--type parallel|sequential]`
- **Check selector validity:** `bash scripts/extract_selectors.sh <cypress-test-file> [--app-src <path>]`
- **Templates:** `assets/page_object_template.ts`, `assets/api_service_template.ts`

All paths relative to this skill's directory.

## Phase 1: Triage (before touching any code) `[medium freedom]`

For each Cypress test, pass all five gates before migrating.

### Gate 0: Is the feature still valid?

1. Check if the feature under test still exists in the codebase
2. Run `scripts/extract_selectors.sh <test-file>` to verify selectors still exist
3. Check if the feature was removed, redesigned, or moved behind a feature flag

| Finding | Action |
|---------|--------|
| Feature exists unchanged | Continue to Gate 1 |
| Feature redesigned | Write new Scout test from scratch (don't port) |
| Feature removed | Delete Cypress test, no migration needed |

### Gate 1: Is it already covered?

Search for existing coverage in:
- Scout tests in `test/scout/`
- API integration tests
- Unit tests co-located with source code
- Other Cypress tests covering same behavior

Don't rely on test names — check what the test actually asserts.

If covered at a lower layer → delete Cypress, no migration needed.

If covered in Scout → delete Cypress. Scout now runs on MKI, so Cypress tests are no longer needed for MKI coverage.

### Gate 2: Is it at the right layer?

| What the test validates | Right layer |
|------------------------|-------------|
| Data transformation / API response | API test or unit test |
| Component rendering in isolation | Unit test (RTL) |
| User workflow across pages | Scout UI test |
| Permission-gated UI behavior | Scout UI test (with role-based auth) |
| Visual/cosmetic behavior | Consider deletion or visual regression tool |

If the test belongs at API/unit layer → write coverage there instead.

### Gate 3: Does it add value?

Delete without migrating if the test:
- Only verifies a page loads without errors
- Only checks that a button or element exists
- Tests trivial behavior already covered by type safety
- Has been skipped for 3+ months with no progress
- Tests deprecated or soon-to-be-removed functionality

### Gate 4: Flakiness risk assessment

Two checks — current status and source code risk scan.

#### 4a: Current status

If the test is currently skipped (`.skip`, `@skipInServerless`, etc.) or chronically flaky:
1. Determine if flakiness is a test problem or an app bug
2. App bug → fix the app first, then write the Scout test
3. Cypress-specific issue (timing, selectors) → migrate with proper patterns

If the solution has a flaky-test-doctor skill, use it for deeper root cause analysis.

#### 4b: Source code risk scan

Even if the Cypress test passes reliably today, its source code may contain patterns that would produce a flaky Scout test. Scan the Cypress file **and its imported tasks/screens** against the pattern catalog in `references/flakiness-risk-patterns.md`.

| Risk level | Action |
|------------|--------|
| No risky patterns | Proceed to migration |
| Medium-risk patterns | Proceed — address each pattern during rewrite (note planned remediation) |
| High/critical-risk patterns | Assess effort — may be simpler to write the test from scratch |
| App-level timing issues detected | Fix the app first, then write the Scout test |

For tests with 3+ critical/high-risk patterns, strongly consider writing the Scout test from scratch using the feature spec rather than porting the Cypress logic.

## PR strategy

**One Cypress spec file = one PR.** Each migrated spec file must be submitted as its own pull request:
- Keeps reviews focused and manageable
- Isolates risk — a problem in one migration doesn't block others
- Makes it easy to revert a single migration if issues surface

**Every PR must pass the [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner) before merging.** Run the new Scout test through the flaky test suite runner to verify stability.

## Phase 2: Migration

Tests that pass all triage gates proceed here. **Do not port Cypress code 1:1.** Rewrite using Scout patterns.

### Step 1: Determine test type `[high freedom]`

- **UI test** if it verifies user flows, page rendering, or interactive behavior
- **API test** if the Cypress test primarily validates data via API assertions

### Step 2: Set up Scout scaffold `[low freedom — use script]`

If the plugin doesn't have a Scout test directory yet, read the `scout-create-scaffold` skill.

Generate the spec file boilerplate:
```bash
bash scripts/scaffold_scout_spec.sh --name <spec_name> --domain <domain_path> \
  --plugin-test-dir <plugin>/test/scout/ui --type parallel
```

Use `assets/page_object_template.ts` and `assets/api_service_template.ts` as starting points for new page objects or API services.

### Step 3: Map Cypress patterns to Scout `[medium freedom]`

| Cypress | Scout |
|---------|-------|
| `cy.visit()` | `page.gotoApp()` or page object `goto()` |
| `cy.get('[data-test-subj="x"]')` | `page.testSubj.locator('x')` |
| `cy.intercept() + cy.wait()` | Playwright auto-waiting or `expect.poll()` |
| `cy.request()` (setup/teardown) | `apiServices` / `kbnClient` in `beforeAll` |
| `cy.wait(ms)` | **Forbidden** — use `expect.poll()` or locator assertions |
| Screens files (selectors) | Page object class with locators |
| Tasks files (actions) | Page object methods |
| `{ force: true }` | Fix the underlying issue — don't port force clicks (app bugs: use `dispatchEvent('click')` — see best practices) |
| `.within()` | `.locator()` chaining (no stale reference issues) |
| `beforeEach` (UI setup) | `apiServices` in `beforeAll` (API-based setup) |
| `@ess` / `@serverless` tags | `tags.stateful.<domain>`, `tags.serverless.<solution>.<tier>` |
| `ftrConfig` (serverless tiers) | Scout test tags |
| `ftrConfig` (feature flags) | Kibana Core APIs (MKI/cloud) or custom server config (stateless) |
| `esArchiver` (system indices) | **Forbidden** — use `kbnClient` |

### Step 3b: Data cleanup audit `[low freedom — must be thorough]`

**Critical:** Cypress runs each spec in a clean environment, so many Cypress tests never clean up after themselves. Scout shares the environment across specs — leftover data will break other tests. **Do not trust the Cypress test's cleanup.**

1. **Read the Cypress test and its tasks/setup** — identify every resource created:
   - Saved objects (rules, cases, dashboards, saved queries)
   - ES indices or documents
   - Fleet agents, policies, integrations
   - User preferences, UI settings, localStorage state
   - API keys or credentials

2. **Add explicit cleanup** in the Scout test (`afterAll` / `afterEach`)

3. **Add defensive cleanup in `beforeAll`** — handles leftover data from a previous failed run

4. **Verify cleanup works** — run the test twice in a row locally. Second run fails → cleanup is incomplete.

### Step 4: Write the Scout test `[high freedom]`

Read the `scout-ui-testing` or `scout-api-testing` skill for implementation details.

Key rules:
- **Tags are required** — Scout validates UI test tags at runtime
- **One suite per file** — single top-level `test.describe()` or `spaceTest.describe()`
- **UI actions in page objects**, assertions in specs
- **API-based setup/teardown** via `apiServices` / `kbnClient`
- **Use `test.step()`** for multi-step flows to reuse browser context
- **Parallelize when possible** — use `spaceTest` + `scoutSpace` for worker-isolated spaces
- **Test fixture** for per-test isolated setup; **Worker fixture** for shared setup
- **Page objects** encapsulate selectors and actions; assertions stay in specs
- **EUI wrappers** — use Scout's `EuiComboBoxWrapper`, `EuiDataGridWrapper`, etc.
- **All created data must be cleaned up** — see Step 3b

### Step 5: Review and verify `[low freedom — mandatory checklist]`

1. Run the `scout-best-practices-reviewer` skill against the new test
2. **Make sure the test fails** — intentionally break the feature and confirm the test catches it
3. Run locally: `node scripts/scout.js run-tests --stateful --testFiles <path>`
4. Update manifests: `node scripts/scout.js update-test-config-manifests`
5. Open a PR with **only this spec file's migration** (one spec per PR)
6. **Run the [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner)** — do not merge until stable

## Phase 3: Cleanup

After the Scout test is verified:

1. Delete the Cypress test file
2. Remove orphaned code (tasks, screens, objects only used by the deleted test)
3. Check for orphaned imports (grep to verify no other usages)
4. Remove from all relevant config/index files
5. Update manifests: `node scripts/scout.js update-test-config-manifests`

## Common mistakes

- Trusting the Cypress test's cleanup — Scout shares the env, so **you** must add cleanup
- Porting Cypress code line-by-line instead of rewriting with Scout patterns
- Migrating tests that belong at API/unit layer
- Forgetting triage gates and migrating flaky/invalid/duplicate tests
- Skipping the Gate 4b risk scan — Cypress patterns that seem harmless produce flaky Scout tests
- Using `page.waitForTimeout()` — forbidden, same as `cy.wait(ms)`
- Using `page.waitForLoadState('networkidle')` — anti-pattern, actively removed from Scout tests; wait for specific elements instead
- Using short custom timeouts on `waitFor()` (e.g., 3s) — causes CI flakiness; use the default (10s)
- Adding explicit waits before `clear()`, `fill()`, `click()` — these auto-wait; the extra wait is redundant
- Specifying `{ state: 'visible' }` on `waitFor()` — it's the default, omit it
- Missing Scout tags (validated at runtime)
- Using `esArchiver` for system indices (use `kbnClient`)
- Not parallelizing tests that could run in parallel
- Putting assertions in page objects (keep in specs)
- Skipping the "make sure your test fails" verification
- Batching multiple spec migrations into a single PR
- Merging without running the Flaky Test Runner
- Using `fill()` on Kibana query bars — `QueryStringInput` submits React props, not DOM value; use `pressSequentially()` (see best practices)
- Asserting `.euiTableRow` count as 0 — `EuiBasicTable` always renders an empty-state row; assert on the message text instead (see best practices)

## Phase 4: Skill improvement

After every migration, review what you learned and suggest updating this skill if any of these apply:

- **New Kibana/EUI component interaction pattern** — a component required a non-obvious Playwright approach (e.g., `pressSequentially` for query bars, `dispatchEvent` for unstable popovers, CSS `:has()` for tooltip anchors)
- **New flakiness pattern** — a Cypress pattern caused flakiness in Scout that isn't already in `references/flakiness-risk-patterns.md`
- **New API service or page object** — reusable infrastructure warrants documenting in the solution-specific skill
- **New role or auth method** — a convenience login method was added (e.g., `loginAsT1Analyst`)
- **Lint rule workaround** — a Playwright lint rule required a non-obvious alternative (e.g., `dispatchEvent` instead of `force: true`, `toContainText([...])` instead of `nth()`)
- **Ownership or architecture insight** — learned where UI code lives, which plugin owns what, or how data flows

Prompt the user: _"During this migration I learned [X]. Want me to add it to the skill so future migrations benefit?"_

## References

Open only what you need:

- Key differences between Cypress and Scout (auth, CI, MKI, tags, execution model): `references/cypress-vs-scout-differences.md`
- Best practices for writing Scout tests (fixtures, page objects, parallelism): `references/migration-best-practices.md`
- Flakiness risk patterns to scan for during Gate 4b (hard-coded waits, missing cleanup, force clicks, etc.): `references/flakiness-risk-patterns.md`
- Complete before/after migration example with annotated decisions (Timeline creation): `references/example-migration.md`
