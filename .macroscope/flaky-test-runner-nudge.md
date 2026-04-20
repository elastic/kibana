---
title: Flaky Test Runner nudge
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
include:
  - '**/test/scout*/**'
  - 'src/platform/test/**'
  - 'x-pack/**/test/**'
conclusion: neutral
---

Decide whether this PR needs a Flaky Test Runner nudge. If not, post nothing.

**Important:**

- Never post the flaky test runner comment more than once on the same PR.
- Do not run this check on backport PRs.

## Step 1: Are any in-scope files changed?

- **Scout:** `**/test/scout*/**`
- **FTR:** `src/platform/test/**`, `x-pack/**/test/**`

If nothing matches, stop.

## Step 2: Do the changes affect stability?

**Nudge if:** test logic, assertions, selectors, fixtures, page objects, test config files, hooks, timeouts, waits, API calls, new/updated/unskipped tests.

**Skip if:** comments only, pure formatting, import reorder, trivial copy changes.

Evaluate Scout and FTR independently. Only nudge the side(s) that qualify.

## Step 3: Resolve the config paths

**FTR:** Walk up from the changed file and collect all leaf `config*.ts` files (skip `*.base.ts`). For each candidate, use `browse_code` to verify it actually references the changed file via `testFiles` or `loadTestFile` (directly or via glob). Only include configs that pass this check. If no candidate is found walking up, use `browse_code` to search for which config includes the changed file.

Example: `x-pack/platform/test/serverless/functional/configs/search/config.group7.ts`

**Scout:** Walk up from the changed file to the nearest `playwright.config.ts` or `parallel.playwright.config.ts` (prefer `parallel` if the path contains `parallel_tests/`). Verify the config actually runs the changed file.

Example: `x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts`

If multiple changed files resolve to the same config, include it only once.

## Output

Post one comment on the PR with a single `/flaky` command. Include tokens only for runner types that qualify. All configs — any number, any mix of Scout and FTR — go space-separated on the same line. Format:

````markdown
## Catch flakiness early (recommended)

**Recommended before merge**: run the flaky test runner against this PR to catch flakiness early.

Trigger a run with the [Flaky Test Runner UI](https://ci-stats.kibana.dev/trigger_flaky_test_runner) or post this comment on the PR:

```
/flaky <type>:<path>:30 [<type>:<path>:30 ...]
```

This check is experimental. Share your feedback in the #appex-qa channel.
````

Examples:

Scout-only:

```
/flaky scoutConfig:x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts:30
```

FTR-only (multiple configs):

```
/flaky ftrConfig:x-pack/platform/test/serverless/functional/configs/search/config.group7.ts:30 ftrConfig:x-pack/platform/test/serverless/functional/configs/search/config.group8.ts:30
```

Mixed Scout + FTR:

```
/flaky scoutConfig:x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts:30 ftrConfig:x-pack/platform/test/serverless/functional/configs/search/config.group7.ts:30 ftrConfig:x-pack/platform/test/serverless/functional/configs/search/config.group8.ts:30
```

**Rules:**

- Always use `:30` on every token.
- Only include config paths that are verified to exist and run the changed tests.
- Always post a single `/flaky` line — never multiple.
- Deduplicate: include each config path only once.
- If no valid config can be resolved for a runner after walking up and searching, include a note in the comment asking the author to identify the correct config path manually, rather than omitting the runner entirely:

```
> ⚠️ Could not resolve a config for [Scout/FTR] — please identify the correct config path and run manually via the [Flaky Test Runner UI](https://ci-stats.kibana.dev/trigger_flaky_test_runner).
```
