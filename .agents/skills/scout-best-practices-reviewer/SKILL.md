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

**Reporting critical-check findings — use a GitHub important alert.** These checks are extremely important, so whenever you surface one of their findings (a GitHub review comment, PR comment, or your summary output), wrap it in a GitHub `> [!IMPORTANT]` alert so it stands out from ordinary findings:

> [!IMPORTANT]
> **Scout custom server config additions** — `<config set>` only enables runtime-toggleable flags, so it doesn't need a dedicated server. Enable them at runtime via `apiServices.core.settings(...)` instead. See `docs/extend/testing/feature-flags.md`.

This alert formatting is about *how* a critical-check finding is presented; it does not override the "Do not post GitHub comments unless explicitly stated" rule above — only post comments when the caller explicitly asks for it.

### Check 1 — Scout custom server config additions

**Why it matters:** Every custom server config set spins up its **own dedicated local Kibana instance**, which adds CI cost and is **not supported on Elastic Cloud (QA)** — it only runs locally. So every added or updated config set must earn its keep. Many settings do **not** require a custom config set at all because they can be toggled **at runtime** (no server reboot) via `apiServices.core.settings(...)`, which works everywhere including Cloud.

**Detect** — the PR adds or updates a Scout server config set if it touches any of:

- Files under `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/<name>/**` (a new config set directory, or new/edited `*.config.ts` / `shared.ts` / `base.config.ts`, especially changes to `serverArgs` or other `ScoutServerConfig` fields).
- A new path-convention config set: a new `test/scout_<name>/` directory (Scout maps `scout_<name>` → the `<name>` config set) or a new `--serverConfigSet <name>` usage.

**Evaluate** — for each added/updated config set, ask: *is a dedicated server actually required, or could the same effect be achieved at runtime?* Go through each added `serverArg` / setting:

- **Runtime-toggleable (does NOT justify a custom config set)** — settings the config-overrides API can force while the server runs, e.g.:
  - `--feature_flags.overrides.<id>=...`
  - `--uiSettings.overrides.<key>=...` / `--uiSettings.globalOverrides.<key>=...`
  - plugin `experimentalFeatures` objects (e.g. `xpack.<plugin>.experimentalFeatures`) that are read at runtime
  These belong in `apiServices.core.settings(...)` — in a **global setup hook** (`global.setup.ts`, recommended for parallel suites, with a matching teardown to revert) or in `beforeAll`/`afterAll` for sequential suites.
- **Boot-required (legitimately justifies a custom config set)** — settings that must be present at server startup, e.g. those read during a plugin `setup` lifecycle (HTTP route registration), enabling/disabling a plugin (`--xpack.<plugin>.enabled`), ES/server options (`esServerlessOptions`, ES args), or auth/IdP wiring (mock IdP, UIAM).
- **When unsure** whether a setting requires boot, say so and ask the author to confirm — do not assert it's runtime-toggleable.

**Flag (IMPORTANT) when:**

- A new/updated config set's additions are composed **only** of runtime-toggleable flags → recommend removing (or not adding) the custom config set and enabling those flags at runtime instead.
- A config set mixes boot-required and runtime-toggleable settings → recommend moving the runtime-toggleable subset out to `apiServices.core.settings(...)` and keeping the config set minimal.
- A new custom config set appears without evidence it's needed → note that the docs require **reaching out to the AppEx QA team before creating one**, and ask whether that happened.

**Recommend:** point the author to the runtime approach and, in the mixed/boot-required case, the minimal-config guidance.

**References:** `docs/extend/testing/feature-flags.md` (the runtime-vs-custom-server comparison table, the runtime approach `#scout-feature-flags-runtime`, and the custom servers section `#scout-feature-flags-custom-servers`), and `docs/extend/testing/global-setup-hook.md` for the global setup/teardown hook pattern.

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
- **[ui]** **UI scope**: UI tests should focus on user interactions and rendering; avoid “data correctness” assertions (for example exact API response shapes or exact table cell values) unless the UI behavior depends on them. Prefer Scout API tests (or unit/integration) for data correctness coverage.
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
