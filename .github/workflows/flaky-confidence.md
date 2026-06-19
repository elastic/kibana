---
name: Flaky Fix Confidence
description: Validate a Flaky Test Fixer PR by running the Flaky Test Runner, attributing results, iterating the fix, and reporting confidence.
on:
  pull_request_target:
    types: [opened, labeled]
  issue_comment:
    types: [created]
  workflow_dispatch:
    inputs:
      pr_number:
        description: Pull request number in this repository to validate
        required: true
        type: string
  bots:
    - github-actions[bot]
    - kibanamachine

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
  checks: read
  models: read

# Activation rules:
# - Manual runs always activate.
# - KICKOFF: a Flaky Test Fixer PR is opened with (or labeled) `flaky-test-fixer`.
# - PROCESS RESULTS: the Flaky Test Runner posts its `## Flaky Test Runner Stats`
#   comment on a PR we are actively validating (`flaky-confidence:running`), and no
#   terminal state label is set yet.
if: >-
  !github.event.repository.fork &&
  (
    (github.event_name == 'workflow_dispatch' && github.event.inputs.pr_number != '') ||
    (
      github.event_name == 'pull_request_target' &&
      (
        (github.event.action == 'labeled' && github.event.label.name == 'flaky-test-fixer') ||
        (github.event.action == 'opened' && contains(github.event.pull_request.labels.*.name, 'flaky-test-fixer'))
      )
    ) ||
    (
      github.event_name == 'issue_comment' &&
      github.event.issue.pull_request &&
      contains(github.event.comment.body, 'Flaky Test Runner Stats') &&
      contains(github.event.issue.labels.*.name, 'flaky-confidence:running') &&
      !contains(github.event.issue.labels.*.name, 'flaky-confidence:passed') &&
      !contains(github.event.issue.labels.*.name, 'flaky-confidence:needs-human') &&
      !contains(github.event.issue.labels.*.name, 'flaky-confidence:not-applicable')
    )
  )

concurrency:
  # One validation lane per PR. Never cancel an in-flight iteration: a cancelled run
  # could drop the run-count bookkeeping mid-flight.
  group: 'flaky-confidence-${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number }}'
  cancel-in-progress: false

env:
  PR_NUMBER: &pr_number ${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number }}
  # Lets the agent omit `-o elastic` on every `bk` invocation.
  BUILDKITE_ORGANIZATION_SLUG: elastic

engine:
  id: claude
  version: '2.1.165'
  model: opus
  max-turns: 120
  env:
    ANTHROPIC_API_KEY: ${{ secrets.LITELLM_API_KEY }}
    ANTHROPIC_BASE_URL: https://elastic.litellm-prod.ai
    ENABLE_PROMPT_CACHING_1H: '1'
    ANTHROPIC_DEFAULT_OPUS_MODEL: llm-gateway/claude-opus-4-8[1m]
    ANTHROPIC_DEFAULT_HAIKU_MODEL: llm-gateway/claude-haiku-4-5
    ANTHROPIC_DEFAULT_SONNET_MODEL: llm-gateway/claude-sonnet-4-6
    CLAUDE_CODE_EFFORT_LEVEL: high
    CLAUDE_CODE_SUBAGENT_MODEL: opus[1m]

tools:
  github:
    toolsets: [default, actions, search]
  web-fetch:
  bash: true

network:
  allowed:
    - defaults
    - buildkite.com
    - '*.buildkite.com'
    - buildkiteartifacts.com
    - ci-stats.kibana.dev
    - github.com
    - api.github.com
    - elastic.litellm-prod.ai
sandbox:
  agent: awf

steps:
  - name: Install Buildkite CLI and export BUILDKITE_API_TOKEN
    env:
      BK_VERSION: 3.44.0
      BK_SHA256: 88867c0b983ad2afe1efc26f0df6b46b5673577c1aea95eba76992636fb9abe9
      OPS_BUILDKITE_TOKEN: ${{ secrets.OPS_BUILDKITE_TOKEN }}
    run: |
      set -euo pipefail
      tmp="$(mktemp -d)"
      url="https://github.com/buildkite/cli/releases/download/v${BK_VERSION}/bk_${BK_VERSION}_linux_amd64.tar.gz"
      curl -fsSL --retry 3 --retry-delay 2 "${url}" -o "${tmp}/bk.tgz"
      echo "${BK_SHA256}  ${tmp}/bk.tgz" | sha256sum -c -
      tar -xzf "${tmp}/bk.tgz" -C "${tmp}" --strip-components=1 "bk_${BK_VERSION}_linux_amd64/bk"
      install -d "${RUNNER_TEMP}/gh-aw/mcp-cli/bin"
      install -m 0755 "${tmp}/bk" "${RUNNER_TEMP}/gh-aw/mcp-cli/bin/bk"
      "${RUNNER_TEMP}/gh-aw/mcp-cli/bin/bk" --version
      if [ -z "${OPS_BUILDKITE_TOKEN:-}" ]; then
        echo "::error::OPS_BUILDKITE_TOKEN secret is not set" >&2
        exit 1
      fi
      echo "BUILDKITE_API_TOKEN=${OPS_BUILDKITE_TOKEN}" >> "${GITHUB_ENV}"

safe-outputs:
  activation-comments: false
  report-failure-as-issue: false
  add-comment:
    max: 3
    target: *pr_number
  add-labels:
    allowed:
      - flaky-confidence:running
      - flaky-confidence:passed
      - flaky-confidence:needs-human
      - flaky-confidence:not-applicable
    max: 2
    target: *pr_number
  # Used only on iterations that revise the fix. The fixer always creates in-repo
  # (non-fork) branches, so pushing back to the PR branch is allowed. `am` patch
  # transport avoids the `git fetch --unshallow` that times out on a repo this size.
  push-to-pull-request-branch:
    target: '*'
    required-labels: [flaky-test-fixer]
    protected-files: fallback-to-issue
    patch-format: am
    max: 1

strict: false
timeout-minutes: 30
---

# Flaky Fix Confidence

You build confidence in a **Flaky Test Fixer** PR by running the **Flaky Test Runner** against it, attributing the results, revising the fix when needed, and reporting an honest verdict. You run in one of two modes depending on the trigger.

The PR under validation is **#${{ env.PR_NUMBER }}** in `${{ github.repository }}`.

## Modes

- **KICKOFF** — the trigger is `pull_request_target` (a `flaky-test-fixer` PR was opened or labeled) or a manual `workflow_dispatch`. Resolve configs and trigger the first Flaky Test Runner run.
- **PROCESS RESULTS** — the trigger is an `issue_comment` whose body contains `## Flaky Test Runner Stats`. Read the results, attribute them, and decide whether to finish or iterate.

Determine the mode from the triggering event. For a manual dispatch, if the PR already has a `flaky-confidence:state` comment and a fresh unprocessed results comment, behave as PROCESS RESULTS; otherwise behave as KICKOFF.

## Run budget and state

- **Hard budget: 3 Flaky Test Runner triggers total** for this PR (`runsTriggered`). Never post a `/flaky` comment that would exceed it.
- State lives in a single hidden marker embedded in a PR comment. On every run, read the **latest** comment that contains the marker below to recover state; when you act, post a new status comment that contains the **updated** marker.

````markdown
<!-- flaky-confidence:state
{
  "runsTriggered": 0,
  "maxRuns": 3,
  "configs": ["scoutConfig:<path>:30"],
  "targetedTests": ["<full test title or file::title>"],
  "history": [
    { "run": 1, "build": "<buildkite url>", "results": { "<config>": "27/30" }, "verdict": "targeted-failed" }
  ]
}
-->
````

If no marker comment exists yet, treat state as `runsTriggered: 0` with an empty history.

A status label complements the marker for at-a-glance state and for gating: `flaky-confidence:running` (in progress), `flaky-confidence:passed` (confidence reached), `flaky-confidence:needs-human` (budget exhausted without confidence), `flaky-confidence:not-applicable` (no runnable FTR/Scout config). Add the terminal label **in addition to** `running` (label removal is not available); the workflow's activation rules already stop processing once a terminal label is present.

## Environment constraints

**Scratch files**: write throwaway files inside the repository checkout (the current working directory). Redirecting (`>`) outside the repository checkout may be blocked.

---

## KICKOFF

1. **Read the fixer PR.** Fetch PR #${{ env.PR_NUMBER }}: its diff (changed files), its body (it links the originating `failed-test` issue via `Fixes #<n>`), and the linked investigator comment on that issue. From these, identify:
   - the **touched test file(s)** (the files the fix changes), and
   - the **originally-flaky test title(s)** the fix is meant to stabilize. Record these as `targetedTests`.

2. **Decide whether the runner applies.** The `/flaky` runner only accepts **FTR** and **Scout** configs. Jest is not supported by the runner.
   - If the fix only touches a **Jest** unit/integration test (`*.test.ts(x)` not under a `test/scout*/` or FTR `test/` config), the runner cannot help. Add the `flaky-confidence:not-applicable` label, post a short comment noting the fixer already verifies Jest fixes by local repetition, write the state marker (`runsTriggered: 0`, empty config list), and stop.
   - Otherwise resolve the config(s) (next step).

3. **Resolve config paths** using the algorithm from the Flaky Test Runner nudge (read `.macroscope/flaky-test-runner-nudge.md` for the precise rules):
   - **FTR:** walk up from each changed test file to the nearest leaf `config*.ts` (skip `*.base.ts`); verify it actually runs the file via `testFiles` / `loadTestFile` (directly or via glob). If none is found by walking up, search for the config that includes the file.
   - **Scout:** walk up to the nearest `playwright.config.ts` or `parallel.playwright.config.ts` (prefer `parallel` when the path contains `parallel_tests/`); verify it runs the file.
   - Deduplicate; include each config once. If you cannot resolve any config, add `flaky-confidence:not-applicable`, post a comment asking a human to identify the config, and stop.

4. **Trigger the run.** Check the budget (`runsTriggered < 3`). Then post **two** comments:
   - First, a short **rationale** comment (1–3 sentences): which config(s) you are running and why (which targeted test(s) they exercise). This comment must also carry the updated state marker with `runsTriggered` incremented and the resolved `configs`.
   - Then a **separate** comment whose body is exactly the trigger command on its own (it must start with `/flaky ` so the trigger workflow picks it up):

     ```
     /flaky <type>:<path>:30 [<type>:<path>:30 ...]
     ```

     Use `:30` per config. `<type>` is `ftrConfig` or `scoutConfig`. Keep all configs on the single `/flaky` line.

5. **Mark state.** Add the `flaky-confidence:running` label. Do not wait for results — the run takes 10–30 minutes and the result comment will re-trigger this workflow in PROCESS RESULTS mode. Stop here.

---

## PROCESS RESULTS

1. **Parse the results comment.** The triggering comment looks like:

   ```
   ## Flaky Test Runner Stats
   ### 🎉 All tests passed! - [kibana-flaky-test-suite-runner#1234](<build url>)
   [✅] <config>: 30/30 tests passed.
   [❌] <config>: 27/30 tests passed.

   [see run history](<history url>)
   ```

   Record the per-config `N/M` and the Buildkite build URL.

2. **Recover state** from the latest `flaky-confidence:state` marker comment (`runsTriggered`, `configs`, `targetedTests`, `history`). Ignore any results comment you have already recorded in `history` (avoid double-processing).

3. **Attribute failures (which test failed?).** If any config is not green, you must determine *which* tests failed before deciding — do not act on the `N/M` count alone:
   - Find the failing `kibana-flaky` build (use the build URL in the comment, or the build for branch `refs/pull/${{ env.PR_NUMBER }}/head`).
   - For each failed job, list artifacts with `bk artifacts list <build> -p <pipeline> --job-uuid <jobId> --json` (pass `--job-uuid` for the failed attempt so retried failures are not hidden), then read the JUnit XML / logs to extract the **failing test titles**. Follow the artifact-retrieval guidance in the `flaky-test-investigator` skill (`.agents/skills/flaky-test-investigator`); read the files there directly.
   - Classify each failing test as **targeted** (one of `targetedTests`, i.e. the test this PR set out to fix) or **unrelated** (a different test in the same config — often shared-server/lane pollution rather than this PR's fault). Note whether the PR appears to **add** flakiness (a previously-stable test now fails) or **remove** it (the targeted test now passes).

4. **Decide** (update `history` with this run's build, results, and verdict, then act):

   | Situation | Action |
   |---|---|
   | Every config green **and** targeted test ran | **Confidence reached.** Add `flaky-confidence:passed`. Post a summary comment (with the updated marker) noting which configs ran green N/N across how many runs. Be explicit that a green NxN run is strong but not absolute proof — the runner runs configs in isolation, and Scout configs share test servers, so isolation differs from real CI. Mark the PR ready for review (remove draft) only if you are confident. |
   | Targeted test still **fails** and `runsTriggered < 3` | **Iterate.** From the failure artifacts, derive a revised, minimal test-side fix. Check out the PR head branch, apply the change, and push it with `push-to-pull-request-branch` (pull_request_number = ${{ env.PR_NUMBER }}). Then post a rationale comment (with updated marker, `runsTriggered` incremented) and a separate `/flaky` comment to re-run. Only re-trigger after an actual code change — never burn budget re-running an unchanged patch hoping for a luckier result. |
   | Targeted test **passes** but only an **unrelated** test failed | Treat the targeted fix as holding. Record the unrelated failure as a caveat (likely lane pollution / pre-existing flakiness; cite the evidence). Add `flaky-confidence:passed` and post a summary that calls out the unrelated failure so a human is aware. Do not block on it unless the PR plausibly introduced it. |
   | Budget exhausted (`runsTriggered >= 3`) without confidence | **Stop.** Add `flaky-confidence:needs-human`. Post a summary of every run (configs, pass rates, which tests failed, what you changed each time) and a recommendation for the owning team. |

5. **Always** update the state marker in your final comment for this run.

### Pushing a revised fix

When you iterate, you are editing a PR you did not open. This is allowed because the fixer creates in-repo (non-fork) branches. To push:

- Check out the PR head branch (e.g. `gh pr checkout ${{ env.PR_NUMBER }}`), make the minimal edit, and commit it.
- Emit a single `push-to-pull-request-branch` safe output targeting PR #${{ env.PR_NUMBER }}.
- Keep the change test-side and minimal. Do **not** modify protected files (CI config, `.github/`, manifests). Re-running `/flaky` after the push validates the new commit, since the runner builds from the updated PR head.

## Guardrails

- Never exceed 3 total `/flaky` triggers for this PR.
- The `/flaky` command must be its own comment and start with `/flaky ` (it is consumed by `.github/workflows/trigger-flaky.yml`).
- Never include the literal phrase `Flaky Test Runner Stats` in any comment you post — that header is how this workflow detects the runner's results comment, and reusing it would make the workflow re-trigger on its own comment.
- Do not weaken assertions, wrap assertions in `retry()`, bump timeouts as the primary fix, or strip tags to skip the test (see the `flaky-test-investigator` skill's pitfalls). A revised fix must address a root cause.
- Do not post duplicate `/flaky` comments for a run already reflected in `history`.

## References

- Link repository files with Markdown GitHub links — prefer blob links with line anchors: `[path/to/file.ts](https://github.com/${{ github.repository }}/blob/${{ github.event.repository.default_branch }}/path/to/file.ts#L1-L10)`.
- Link Buildkite builds and jobs rather than pasting raw IDs.
