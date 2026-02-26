---
name: scout-best-practices-reviewer
description: Review Scout UI/API tests (including Scout test migrations) for best practices, reuse, and parity.
---

# Scout Best Practices Reviewer

## Overview

Perform a static PR review of Scout UI and API test files (`*.spec.ts`) against Scout best practices and existing Scout abstractions (fixtures, page objects, API helpers). Produce actionable, PR-review-ready feedback that pushes for reuse over one-off implementations.

Important: Do not post GitHub comments unless explicitly stated.

### Inputs

1. Changed `*.spec.ts` files (and imported helpers/fixtures).
   - UI Tests: Use `test` / `spaceTest` (usually in `**/test/scout/ui/**`).
   - API Tests: Use `apiTest` (usually in `**/test/scout/api/**`).
2. Neighboring Scout code in the same plugin/solution (existing specs + `test/scout/**/fixtures/**`) to spot reuse opportunities and avoid duplicating helpers.
3. Removed/previous tests (if this is a migration) to verify behavior parity.
4. Scout docs (open only what you need):
   - Best practices: `docs/extend/scout/best-practices.md`
   - Core concepts & fixtures: `docs/extend/scout/core-concepts.md`, `docs/extend/scout/fixtures.md`
   - Reuse surfaces: `docs/extend/scout/page-objects.md`, `docs/extend/scout/api-services.md`
   - Type-specific guides: `docs/extend/scout/write-ui-tests.md`, `docs/extend/scout/write-api-tests.md`
   - As needed: `docs/extend/scout/api-auth.md`, `docs/extend/scout/browser-auth.md`, `docs/extend/scout/parallelism.md`, `docs/extend/scout/deployment-tags.md`, `docs/extend/scout/a11y-checks.md`, `docs/extend/scout/debugging.md`, `docs/extend/scout/run-tests.md`

## Scope (be comprehensive)

- Don’t limit the review to the diff. Look for duplication and missed reuse by scanning:
  - existing Scout specs in the same area (and similar suites elsewhere in the repo)
  - available fixtures (`docs/extend/scout/fixtures.md` + local `test/scout/**/fixtures`)
  - existing page objects, API services, and fixtures (in `@kbn/scout`, solution Scout packages, and plugin-local `test/scout/**`) before suggesting brand-new helpers

### Quick checklist (details live in `docs/extend/scout/best-practices.md`)

- **Reuse-first**: prefer existing `pageObjects`, fixtures, and `apiServices`; if adding helpers/page objects, place them in the right scope (plugin vs solution vs `@kbn/scout`) and register via fixtures.
- **Fixture boundaries**: `apiClient` for the endpoint under test; `apiServices`/`kbnClient` for setup/teardown only; correct auth + common headers.
- **Correctness**: guardrail assertions before dereferencing response fields; validate contract + side effects; stable error assertions.
- **UI scope**: UI tests should focus on user interactions and rendering; avoid “data correctness” assertions (for example exact API response shapes or exact table cell values) unless the UI behavior depends on them. Prefer Scout API tests (or unit/integration) for data correctness coverage.
- **Isolation**: parallel-safe data and resilient cleanup in hooks; no reliance on file ordering or shared mutable state.
- **RBAC / realism**: minimal permissions (avoid `admin` unless required); space-aware behavior covered or explicitly out of scope.
- **Flake traps**: avoid `waitForTimeout()` and time-based assertions/retries; rely on auto-waiting + explicit readiness signals.
- **Cost**: avoid repeating expensive setup; consider a global setup hook for shared one-time operations.
- **Tags / environment**: validate deployment tags and avoid assumptions that only hold in specific environments.

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

## Output format

Output **only** the applicable sections below. Use headings and lists (**no tables**). Group issues by priority: `blocker` → `major` → `minor` → `nit`. Omit empty priorities.

### 1. Findings

#### Blocker

- **<Concern (use exact checklist heading)> — <short summary>**
  - **Explanation**: <1-3 concise, actionable sentences>
  - **Evidence**: `<file:line>` (add multiple as needed)
  - **Suggested change**: <Specific code edit; include a small snippet if helpful>

#### Major

- **<Concern (use exact checklist heading)> — <short summary>**
  - **Explanation**: <...>
  - **Evidence**: `<file:line>`
  - **Suggested change**: <...>

#### Minor

- **<Concern (use exact checklist heading)> — <short summary>**
  - **Explanation**: <...>
  - **Evidence**: `<file:line>`
  - **Suggested change**: <...>

#### Nit

- **<Concern (use exact checklist heading)> — <short summary>**
  - **Explanation**: <...>
  - **Evidence**: `<file:line>`
  - **Suggested change**: <...>

### 2. Migration parity (only if a test migration is detected and action is required)

Include this section only when the PR removes/changes FTR tests alongside new/changed Scout specs **and** you found at least one parity issue that requires someone to step in (code change or an explicit de-scope/sign-off decision).
Do **not** output an FYI parity map. If everything is equivalent (or differences are clearly benign), omit this section.

#### Blocker / Major / Minor / Nit

- **<Concern (use exact checklist heading)> — <scenario name>**
  - **Issue**: <Coverage gap or behavior delta that needs action>
  - **Old behavior**: <...>
  - **New behavior**: <...>
  - **Why it matters**: <1-2 sentences on risk/coverage impact>
  - **Suggested fix / decision**: <Required. Either a code change or an explicit de-scope/sign-off the reviewer must confirm.>
  - **Evidence**: `<file:line>`

## Follow-up

Offer to generate the updated code, fully incorporating the suggested improvements and resolving any parity gaps.
