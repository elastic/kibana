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

- Do not run this check on backport PRs.
- The check may run multiple times as the PR author pushes new commits. What must never happen is a **duplicate** comment — same runner types and same config list as one already posted. Before posting, read the existing flaky-nudge comments on the PR:
  - If the new changes resolve to a set of `(runner type, config path)` tokens that is a **subset of, or equal to**, what any prior comment already covers → post nothing.
  - If the new changes add **new tokens** not previously covered (a new config, or a runner type — Scout or FTR — that wasn't covered before), post a new comment that lists **only the newly-added tokens**, and briefly note it's a follow-up covering additions since the previous comment.
  - Never re-list tokens that a prior comment already covered.

## Step 1: Are any in-scope files changed?

- **Scout:** `**/test/scout*/**`
- **FTR:** `src/platform/test/**`, `x-pack/**/test/**`

If nothing matches, stop.

## Step 2: Does the change introduce non-determinism?

The required CI pass already catches deterministic failures. The flaky test runner only adds signal when the _same_ change could fail _non-deterministically_ — i.e., when a single pass isn't a reliable signal. Ask one question:

> _Does this change introduce a new source of non-determinism that one CI pass wouldn't reliably catch?_

If no, skip — regardless of how many test files are touched.

**Nudge (new non-determinism introduced):**

- **New tests** (`test(...)`, `it(...)`, new `describe` blocks) — unknown stability.
- **Unskipped tests** (`test.skip` → `test`, `.only` removed on a previously-skipped suite) — often skipped originally because they were flaky.
- **New or changed waits/timing:** `waitFor`, `expect.toPass`, `retry`, polling intervals, `setTimeout`, increased/decreased timeouts, new `await` on async operations whose ordering matters.
- **New fixtures/hooks with timing components:** index creation, data ingestion waits, server startup, role/space provisioning, `beforeEach`/`afterEach` that mutate shared state.
- **New async interactions:** new API calls, new ES queries, new network requests, new WebSocket/SSE subscriptions in tests.
- **New tags** added to the test suite

**Skip (deterministic — one pass is sufficient):**

- Renames (identifiers, tool IDs, symbols) applied uniformly across the diff.
- File moves / directory reorganizations (e.g., for CODEOWNERS), even with mechanical import path updates.
- Pure assertion _value_ changes where the value is deterministic (`expect(x).toBe(1)` → `expect(x).toBe(2)` to match a code change).
- Snapshot updates.
- Type-only changes, comments, formatting, import reorders.
- Mechanical refactors preserving semantics (extracting a helper, splitting a file).
- Config field renames / ownership tags / metadata that don't affect runtime behavior (tags, descriptions, CODEOWNERS annotations).

### Sanity check before nudging

If you can describe the change as "rename X to Y", "move A to B", or "update expected value from X to Y", and nothing else is going on, **skip**. A 30-run matrix cannot reveal anything a single run wouldn't.

Evaluate Scout and FTR independently. Only nudge the side(s) that qualify.

## Step 3: Resolve the config paths

**FTR:** Walk up from the changed file and collect all leaf `config*.ts` files (skip `*.base.ts`). For each candidate, use `browse_code` to verify it actually references the changed file via `testFiles` or `loadTestFile` (directly or via glob). Only include configs that pass this check. If no candidate is found walking up, use `browse_code` to search for which config includes the changed file.

Example: `x-pack/platform/test/serverless/functional/configs/search/config.group7.ts`

**Scout:** Walk up from the changed file to the nearest `playwright.config.ts` or `parallel.playwright.config.ts` (prefer `parallel` if the path contains `parallel_tests/`). Verify the config actually runs the changed file.

Example: `x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts`

If multiple changed files resolve to the same config, include it only once.

### Shared fixtures

A **shared fixture** is a non-test file (XML, JSON archive, ES/Kibana snapshot, role definition, etc.) that is not referenced by `testFiles` / `loadTestFile`, is pulled in only by `*.base.ts` configs (typically via `require.resolve` or `import`), and is consumed identically by every leaf config that extends the base (e.g. loaded once at server startup).

When the changed file is a shared fixture:

1. Pick **one** canonical leaf config that extends the base — prefer the plainest "vanilla" config for the affected area (no feature flags, no extra server args). For example, for a change to `@kbn/security-api-integration-helpers/saml/idp_metadata_mock_idp.xml`, prefer `x-pack/platform/test/api_integration_deployment_agnostic/configs/stateful/platform.stateful.config.ts` over siblings that layer on feature flags or solution-specific services.
2. In the comment body, list 2–3 other leaf configs that inherit the same fixture and tell the author they can run those manually via the [Flaky Test Runner UI](https://ci-stats.kibana.dev/trigger_flaky_test_runner) for broader coverage.
3. Do **not** add a second leaf just to "cover both base configs" when the bases exercise the same runtime path through the fixture. One run of the canonical leaf validates the shared code path; a second leaf doubles CI cost without adding signal.

## Output

Post one comment on the PR with a single `/flaky` command. Include tokens only for runner types that qualify. All configs — any number, any mix of Scout and FTR — go space-separated on the same line. Format:

````markdown
## Catch flakiness early (recommended)

**Recommended before merge**: run the flaky test runner against this PR to catch flakiness early.

<!-- optional: one-sentence rationale, see "Rationale line" below -->

Trigger a run with the [Flaky Test Runner UI](https://ci-stats.kibana.dev/trigger_flaky_test_runner) or post this comment on the PR:

```
/flaky <type>:<path>:30 [<type>:<path>:30 ...]
```

<sup>Share feedback in the [#appex-qa](https://elastic.slack.com/archives/C04HT4P1YS3) channel.</sup>
````

### Rationale line

Include a one-sentence rationale immediately below the recommendation line whenever the mapping from changed files → config(s) is not self-evident. Keep it to a single sentence; do not list every file.

**Include a rationale when any of these hold:**

- More than one config is listed.
- The changed file is a shared fixture and the comment picks a canonical leaf.
- The non-determinism signal is subtle (e.g., a new timing-sensitive fixture shared across many specs, an `unskip`, a parallelism/config change).
- The changed file lives outside a `test/**` path (prod code that a specific config exercises).

**Skip the rationale when** a single changed spec file maps to a single obvious config under the same directory — the path already tells the story.

Rationale examples (pick the shape that fits):

- `Covers the new Scout spec at <path> added in this PR.`
- `<path> is a shared fixture loaded by <base config>; this leaf is the canonical vanilla config exercising the same runtime path.`
- `<path> is referenced by both configs below via loadTestFile.`
- `This PR unskips a previously-flaky test in <config>, so re-running it 30× validates stability.`

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
