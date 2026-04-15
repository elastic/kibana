title: Flaky Test Runner nudge
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
exclude:

- 'api_docs/\*\*'
- 'config/\*\*'
- 'dev_docs/\*\*'
- 'docs/\*\*'
- 'legacy_rfcs/\*\*'
- 'licenses/\*\*'
- 'node_modules/\*\*'
- 'oas_docs/\*\*'
- 'typings/\*\*'
- '.buildkite/\*\*'
  conclusion: neutral

---

Decide whether this PR needs a Flaky Test Runner nudge. If not, post nothing.

## Step 1 — Are any in-scope files changed?

- **Scout:** `**/test/scout*/**` or `**/kbn-scout*/**/test/scout/**`
- **FTR:** `src/platform/test/**`, `x-pack/platform/test/**`, `x-pack/solutions/*/test/**`

If nothing matches, stop.

## Step 2 — Do the changes affect stability?

**Nudge if:** test logic, assertions, selectors, fixtures, page objects, config files, hooks, timeouts, waits, API calls, new/removed/skipped tests.

**Skip if:** comments only, pure formatting, import reorder, trivial copy changes.

Evaluate Scout and FTR independently. Only nudge the side(s) that qualify.

## Step 3 — Resolve the config path

**Scout:** Walk up from the changed file to the nearest `playwright.config.ts` or `parallel.playwright.config.ts`. Use `parallel.playwright.config.ts` if the path contains `parallel_tests/`.

**FTR:** Walk up to the nearest leaf `config*.ts` (skip `*.base.ts` files). If none found, check which config's `testFiles`/`loadTestFile` includes the changed file.

## Output

Post exactly one PR comment:

```markdown
## Run the Flaky Test Runner (recommended)

**Recommended before merge**: run the flaky test runner against this PR to catch flakiness early.

Trigger a run with the [Flaky Test Runner UI](https://ci-stats.kibana.dev/trigger_flaky_test_runner) or post a comment in the PR:

/flaky <ftrConfig or scoutConfig here>:<resolved-path>:30
```

Include only the `/flaky` line(s) for the runner(s) that qualify. Replace each `<resolved-path>` with the actual config path from Step 3. Replace "ftrConfig or scoutConfig here" with the actual test runner.
