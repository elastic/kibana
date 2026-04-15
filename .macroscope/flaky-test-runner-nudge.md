---
title: Flaky Test Runner nudge
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
exclude:
  - 'api_docs/**'
  - 'config/**'
  - 'dev_docs/**'
  - 'docs/**'
  - 'legacy_rfcs/**'
  - 'licenses/**'
  - 'node_modules/**'
  - 'oas_docs/**'
  - 'typings/**'
  - '.buildkite/**'
conclusion: neutral
---

Decide whether this PR needs a Flaky Test Runner nudge. If not, post nothing.

## Step 1: Are any in-scope files changed?

- **Scout**
  - **`**/test/scout\*/**`:** specs, fixtures, and plugin-local Scout test code (each tree usually has a Playwright config next to it).
  - **`**/kbn-scout*/**`:** shared Scout packages (for example `@kbn/scout`, `@kbn/scout-oblt`, `@kbn/scout-search`, `@kbn/scout-security`): page objects, framework code, and helpers that tests import. This layout is **not** covered by `\*\*/test/scout*/\*\*`alone; changes here can still affect many suites even when there is no`playwright.config.ts` beside the file.
- **FTR:** `src/platform/test/**`, `x-pack/platform/test/**`, `x-pack/solutions/*/test/**`

If nothing matches, stop.

## Step 2: Do the changes affect stability?

**Nudge if:** test logic, assertions, selectors, fixtures, page objects, config files, hooks, timeouts, waits, API calls, new/removed/skipped tests.

**Skip if:** comments only, pure formatting, import reorder, trivial copy changes.

Evaluate Scout and FTR independently. Only nudge the side(s) that qualify.

## Step 3: Resolve the config path

**FTR:** Walk up from the changed file to the nearest leaf `config*.ts` (skip `*.base.ts` files). If none is found, use `browse_code` to find which config’s `testFiles` / `loadTestFile` includes the changed file.

Sample FTR config path: `x-pack/platform/test/serverless/functional/configs/search/config.group7.ts`

**Scout (two cases)**

1. **Change is under `**/test/scout*/**`:** Walk up to the nearest `playwright.config.ts` or `parallel.playwright.config.ts`. Prefer `parallel.playwright.config.ts` when the changed path contains `parallel_tests/`. You can emit `/flaky scoutConfig:<that-path>:30`.

   Sample: `x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts`

2. **Change is under `**/kbn-scout*/**` (or other shared Scout package code) with no Playwright config in an ancestor directory:** Do **not** guess a path from the package file path alone. **First, derive a config from the changed code:**
   - Search the repo for **imports of the changed module(s)** (the file you edited, its barrel `index.ts`, or the package subpath that changed). Prioritize hits under `**/test/scout*/**` (specs, fixtures, page objects in plugin trees that re-export or wrap the package).
   - From each relevant hit, **walk up** to the nearest `playwright.config.ts` or `parallel.playwright.config.ts` (same rules as case 1). That is the `scoutConfig` for suites that actually exercise this change.
   - If **one** clear config covers the change, use **Output B** with that path. If **several** configs are justified (widely shared symbol), pick the **most representative** config from the search, or emit **B** for the narrowest scope first; mention in a short line that other suites may also import this code if needed.
   - Use **`browse_code`** and **`grep`** freely to follow imports and fixture wiring.

   **Only if** no `playwright.config.ts` can be tied to the change after that search, use **Output C** (author picks a suite in the UI or manually).

## Output

Pick **A**, **B**, or **C** depending on Step 3. Prefer **B** for Scout whenever you can resolve a Playwright config (including case 2 after import tracing). Use **C** only when shared package code changes and **no** config can be linked to the change after searching imports from that code into `**/test/scout*/**`.

**A. FTR only (resolved `ftrConfig`)**

````markdown
## Catch flakiness early (recommended)

**Recommended before merge**: run the flaky test runner against this PR to catch flakiness early.

Trigger a run with the [Flaky Test Runner UI](https://ci-stats.kibana.dev/trigger_flaky_test_runner) or post this comment on the PR:

```
/flaky ftrConfig:<resolved-ftr-config-path>:30
```
````

**B. Scout with a resolved Playwright config**

````markdown
## Catch flakiness early (recommended)

**Recommended before merge**: run the flaky test runner against this PR to catch flakiness early.

Trigger a run with the [Flaky Test Runner UI](https://ci-stats.kibana.dev/trigger_flaky_test_runner) or post this comment on the PR:

```
/flaky scoutConfig:<resolved-playwright-config-path>:30
```
````

**C. Scout shared package (import tracing did not resolve a config)**

Use only when Step 3 case **2** still has **no** Playwright config after searching imports from the changed code into `**/test/scout*/**`. Do not paste a guessed `scoutConfig` path.

````markdown
## Catch flakiness early (recommended)

**Recommended before merge**: run the flaky test runner for suites that **cover this change**.

This PR touches **shared Scout package** code (for example under `kbn-scout*`). No Playwright config could be tied to this diff by following imports from the changed files into plugin `test/scout/` trees, so pick the right run yourself:

1. Use the [Flaky Test Runner UI](https://ci-stats.kibana.dev/trigger_flaky_test_runner) and select a suite whose tests exercise the code you changed, **or**
2. Manually find a plugin `test/scout/**/playwright.config.ts` or `parallel.playwright.config.ts` for a suite that uses this package, then post:

```
/flaky scoutConfig:<path-to-that-playwright-config>:30
```
````

**Both Scout and FTR:** Post **two** comments (one FTR from **A**, one Scout from **B** or **C** as appropriate).

**Samples (for A and B only)**

Scout:

```
/flaky scoutConfig:x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts:30
```

FTR:

```
/flaky ftrConfig:x-pack/platform/test/serverless/functional/configs/search/config.group7.ts:30
```
