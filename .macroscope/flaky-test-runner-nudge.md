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

**Important:**

- Never post the flaky test runner comment more than once on the same PR.
- Do not run this check on backport PRs.

## Step 1: Are any in-scope files changed?

- **Scout:** `**/test/scout*/**`
- **FTR:** `src/platform/test/**`, `x-pack/platform/test/**`, `x-pack/solutions/*/test/**`

If nothing matches, stop.

## Step 2: Do the changes affect stability?

**Nudge if:** test logic, assertions, selectors, fixtures, page objects, config files, hooks, timeouts, waits, API calls, new/removed/skipped tests.

**Skip if:** comments only, pure formatting, import reorder, trivial copy changes.

Evaluate Scout and FTR independently. Only nudge the side(s) that qualify.

## Step 3: Resolve the config path

**FTR:** Walk up from the changed file to the nearest leaf `config*.ts` (skip `*.base.ts`). If none found, use `browse_code` to find which config's `testFiles`/`loadTestFile` includes the changed file.

Example: `x-pack/platform/test/serverless/functional/configs/search/config.group7.ts`

**Scout — changed file is under `**/test/scout\*/**`:** Walk up to the nearest `playwright.config.ts` or `parallel.playwright.config.ts` (prefer `parallel` if the path contains `parallel_tests/`).

Example: `x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts`

Ensure the new or updated tests actually belong to the config.

## Output

Post one comment on the PR. Include only the `/flaky` line(s) for the runner(s) that qualify:

````markdown
## Catch flakiness early (recommended)

**Recommended before merge**: run the flaky test runner against this PR to catch flakiness early.

Trigger a run with the [Flaky Test Runner UI](https://ci-stats.kibana.dev/trigger_flaky_test_runner) or post this comment on the PR:

```
/flaky <scoutConfig or ftrConfig>:<resolved-scout-or-ftr-config-path>:30
```

This check is experimental. Share your feedback in the #appex-qa channel.
````

Replace the example paths with the resolved paths from Step 3. Drop whichever line doesn't apply.

Sample commands:

Scout:

```
/flaky scoutConfig:x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts:30
```

FTR:

```
/flaky ftrConfig:x-pack/platform/test/serverless/functional/configs/search/config.group7.ts:30
```

Always use 30: this tells the runner to execute the test config 30 times.

Always ensure the Playwright config exists in the project, otherwise don't post it.
