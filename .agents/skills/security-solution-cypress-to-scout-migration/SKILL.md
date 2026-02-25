---
name: security-solution-cypress-to-scout-migration
description: >
  Security Solution specific. Migrate Security Solution Cypress E2E tests (.cy.ts) to Scout (Playwright).
  Includes triage gates (duplicate detection, layer analysis, value assessment), Cypress-to-Scout pattern
  mapping, data cleanup audit, and PR workflow. Use when: (1) migrating a Cypress test to Scout,
  (2) converting .cy.ts to .spec.ts, (3) planning a Cypress-to-Scout migration batch, (4) rewriting
  Cypress screens/tasks as Scout page objects, (5) asked "how do I move this Cypress test to Scout/Playwright",
  (6) asked about differences between Cypress and Scout for Security Solution.
---

# Security Solution — Cypress to Scout Migration

## Overview

Migrate Cypress tests to Scout by first validating each test through triage gates, then rewriting using Scout patterns. **Never migrate Cypress tests directly** — validate first, then rewrite following Scout best practices.

## Required sub-skills

- **REQUIRED:** scout-create-scaffold (generate Scout directory structure)
- **REQUIRED:** scout-ui-testing (page objects, browser auth, parallel UI)
- **REQUIRED:** scout-api-testing (apiClient/auth, apiServices patterns)
- **REQUIRED:** scout-best-practices-reviewer (review migrated tests)
- **ON FLAKY TESTS:** security-solution-flaky-test-doctor (when source test is flaky/skipped)

## Best practices priority

When guidance from different sources conflicts, follow this priority order:

1. **Security Solution best practices** (this skill's references and team conventions) — highest weight
2. **Scout framework skills** (scout-ui-testing, scout-api-testing, scout-best-practices-reviewer)
3. **General Kibana conventions** (AGENTS.md)

Security Solution conventions override general Scout guidance when they differ.

## Core principle

Exercise behavior in the least flaky automation layer first:
**UNIT > API > UI**

A Cypress E2E test should only become a Scout E2E test if it genuinely tests a user workflow that cannot be verified at a lower layer.

## Tools

- **Scaffold a spec file:** `bash scripts/scaffold_scout_spec.sh --name <name> --domain <path> [--type parallel|sequential]`
- **Check selector validity:** `bash scripts/extract_selectors.sh <cypress-test-file>`
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

If covered in Scout → check if the Cypress test provides MKI coverage (`@serverless` tag). If yes, keep Cypress until Scout MKI pipelines are ready. If no, delete Cypress.

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

### Gate 4: Is it flaky?

If currently skipped or chronically flaky:
1. Read the `security-solution-flaky-test-doctor` skill for root cause analysis
2. Determine if flakiness is a test problem or an app bug
3. App bug → fix the app first, then write the Scout test
4. Cypress-specific issue (timing, selectors) → migrate with proper patterns

## PR strategy

**One Cypress spec file = one PR.** Each migrated spec file must be submitted as its own pull request. Do not batch multiple spec migrations into a single PR:
- Keeps reviews focused and manageable
- Isolates risk — a problem in one migration doesn't block others
- Makes it easy to revert a single migration if issues surface

**Every PR must pass the [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner) before merging.** Run the new Scout test through the flaky test suite runner to verify stability. Do not merge until the test demonstrates consistent passing across multiple runs.

## Phase 2: Migration

Tests that pass all triage gates proceed here. **Do not port Cypress code 1:1.** Rewrite using Scout patterns.

### Step 1: Determine test type `[high freedom]`

- **UI test** if it verifies user flows, page rendering, or interactive behavior
- **API test** if the Cypress test primarily validates data via API assertions

### Step 2: Set up Scout scaffold `[low freedom — use script]`

If the plugin doesn't have a Scout test directory yet, read the `scout-create-scaffold` skill.

Generate the spec file boilerplate:
```bash
bash scripts/scaffold_scout_spec.sh --name <spec_name> --domain <domain_path> --type parallel
```

Use `assets/page_object_template.ts` and `assets/api_service_template.ts` as starting points when creating new page objects or API services.

- Tests go under `x-pack/solutions/security/plugins/security_solution/test/scout/`
- Use `@kbn/scout-security` for imports

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
| `{ force: true }` | Fix the underlying issue — don't port force clicks |
| `.within()` | `.locator()` chaining (no stale reference issues) |
| `beforeEach` (UI setup) | `apiServices` in `beforeAll` (API-based setup) |
| `@ess` / `@serverless` tags | `tags.stateful.classic`, `tags.serverless.security_complete` |
| `ftrConfig` (serverless tiers) | Scout test tags |
| `ftrConfig` (feature flags) | Kibana Core APIs (MKI/cloud) or custom server config (stateless) |
| `esArchiver` (system indices) | **Forbidden** — use `kbnClient` |

### Step 3b: Data cleanup audit `[low freedom — must be thorough]`

**Critical:** Cypress runs each spec in a clean environment, so many Cypress tests never clean up after themselves. Scout shares the environment across specs — leftover data will break other tests. **Do not trust the Cypress test's cleanup.** You must identify and clean all data regardless of what the Cypress test does.

1. **Read the Cypress test and its tasks/setup** — identify every resource created during execution:
   - Saved objects (rules, cases, timelines, dashboards, saved queries)
   - ES indices or documents
   - Fleet agents, policies, integrations
   - Engine state (Risk Engine, Entity Store, Privileged User Monitoring, Asset Criticality)
   - User preferences, UI settings, localStorage state
   - API keys or credentials
   - Alerts generated by rule execution

2. **For each resource, add explicit cleanup** in the Scout test:

```typescript
spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
  await apiServices.ruleService.deleteAllRules();
  await apiServices.caseService.deleteAllCases();
  await scoutSpace.savedObjects.cleanStandardList();
});
```

3. **Also add defensive cleanup in `beforeAll`** — handles leftover data from a previous failed run:

```typescript
spaceTest.beforeAll(async ({ apiServices }) => {
  await apiServices.entityStoreService.cleanup();
  await apiServices.ruleService.deleteAllRules();
});
```

4. **Verify cleanup works** — run the test twice in a row locally. If the second run fails, cleanup is incomplete.

Even if the Cypress test has no `afterEach` or cleanup logic, the Scout test **must** clean up everything it creates.

### Step 4: Write the Scout test `[high freedom]`

Read the `scout-ui-testing` or `scout-api-testing` skill for implementation details.

Key rules:
- **Tags are required** — Scout validates UI test tags at runtime
- **One suite per file** — single top-level `test.describe()` or `spaceTest.describe()`
- **UI actions in page objects**, assertions in specs
- **API-based setup/teardown** via `apiServices` / `kbnClient`
- **Use `test.step()`** for multi-step flows (avoids new browser context per test block, improving execution time)
- **Parallelize when possible** — use `spaceTest` + `scoutSpace` for worker-isolated spaces
- **Use the right package** — `@kbn/scout-security` for Security-specific code, `@kbn/scout` for shared code
- **Test fixture** for setup that each test gets a fresh, isolated version of
- **Worker fixture** for setup that multiple tests safely share within the same worker
- **Page objects** encapsulate selectors and actions; assertions stay in specs. Split large pages into smaller page objects or component objects.
- **EUI wrappers** — Scout provides `EuiComboBoxWrapper`, `EuiDataGridWrapper`, `EuiSelectableWrapper`, etc. for stable EUI interactions
- **All created data must be cleaned up** — see Step 3b above

### Step 5: Review and verify `[low freedom — mandatory checklist]`

1. Run the `scout-best-practices-reviewer` skill against the new test
2. **Make sure the test fails** — intentionally break the feature and confirm the test catches it
3. Run locally: `node scripts/scout.js run-tests --stateful --testFiles <path>`
4. Update manifests: `node scripts/scout.js update-test-config-manifests`
5. Open a PR with **only this spec file's migration** (one spec per PR)
6. **Run the [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner)** on the PR — do not merge until the test passes consistently across multiple runs

## Phase 3: Cleanup

After the Scout test is verified:

1. Delete the Cypress test file
2. Remove orphaned code (tasks, screens, objects only used by the deleted test)
3. Check for orphaned imports in shared files (run grep to verify no other usages)
4. If the Cypress test ran in both stateful and serverless configs, remove from all relevant index files
5. Update manifests: `node scripts/scout.js update-test-config-manifests`

## Common mistakes

- Trusting the Cypress test's cleanup — Cypress runs in a clean env so most tests never clean up. Scout shares the env, so **you** must add cleanup for all created data
- Porting Cypress code line-by-line instead of rewriting with Scout patterns
- Migrating tests that belong at API/unit layer
- Forgetting triage gates and migrating flaky/invalid/duplicate tests
- Using `page.waitForTimeout()` (same problem as `cy.wait(ms)` — forbidden)
- Missing Scout tags (Scout validates UI tags at runtime)
- Using `esArchiver` for system indices (use `kbnClient` instead)
- Not parallelizing tests that could run in parallel
- Putting assertions in page objects (keep assertions in specs)
- Skipping the "make sure your test fails" verification
- Treating test code as throwaway — treat it as production code
- Writing vague test names — use meaningful, descriptive names
- Batching multiple spec migrations into a single PR (one spec = one PR)
- Merging without running the Flaky Test Runner first
- Following general Scout guidance over Security Solution conventions when they conflict

## References

Open only what you need:

- Key differences between Cypress and Scout (auth, CI, MKI, tags, execution model): `references/cypress-vs-scout-differences.md`
- Best practices for writing Scout tests (fixtures, page objects, parallelism): `references/migration-best-practices.md`
