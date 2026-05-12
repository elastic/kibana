---
name: Flaky Test Fixer
description: Open a draft fix PR for a `failed-test` issue that the Failed Test Investigator marked as auto-fixable.
on:
  issues:
    types: [labeled]
  workflow_dispatch:
    inputs:
      issue_number:
        description: Issue number in this repository to fix
        required: true
        type: string

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
  checks: read
  models: read

if: "${{ (github.event_name == 'workflow_dispatch' && github.event.inputs.issue_number != '') || (github.event_name == 'issues' && github.event.action == 'labeled' && github.event.label.name == 'needs-flaky-fix' && !github.event.issue.pull_request) }}"

concurrency:
  group: "flaky-fixer-${{ github.event.issue.number || github.event.inputs.issue_number }}"
  cancel-in-progress: false

engine:
  id: claude
  version: "2.1.111"
  model: opus
  max-turns: 200
  env:
    ANTHROPIC_API_KEY: ${{ secrets.LITELLM_API_KEY }}
    ANTHROPIC_BASE_URL: https://elastic.litellm-prod.ai
    ENABLE_PROMPT_CACHING_1H: "1"
    ANTHROPIC_DEFAULT_OPUS_MODEL: llm-gateway/claude-opus-4-7[1m]
    ANTHROPIC_DEFAULT_HAIKU_MODEL: llm-gateway/claude-haiku-4-5
    ANTHROPIC_DEFAULT_SONNET_MODEL: llm-gateway/claude-sonnet-4-6
    CLAUDE_CODE_SUBAGENT_MODEL: opus[1m]

tools:
  github:
    toolsets: [default, search]
  web-fetch:
  bash: true

network:
  allowed:
    - defaults
    - buildkite.com
    - "*.buildkite.com"
    - ci-stats.kibana.dev
    - github.com
    - api.github.com
    - elastic.litellm-prod.ai
sandbox:
  agent: awf

safe-outputs:
  activation-comments: false
  report-failure-as-issue: false
  add-comment:
    max: 1
    target: "triggering"
    hide-older-comments: true
  create-pull-request:
    draft: true
    max: 1
    title-prefix: "[flaky-fix] "
    labels: [flaky-fix:running, automated]
    base-branch: main
    allowed-base-branches: [main]
    if-no-changes: "ignore"
    protected-files: fallback-to-issue
    excluded-files:
      - ".github/**"
      - ".buildkite/**"
      - "**/package.json"
      - "**/yarn.lock"
      - "**/*.lock"
      - "renovate.json5"
      - ".gitattributes"
      - ".gitignore"
      - "**/secrets/**"
      - "**/.env*"

strict: false
timeout-minutes: 90
---

# Flaky Test Fixer

You are picking up a `failed-test` issue that the Failed Test Investigator has marked as auto-fixable. Your job is to open exactly one draft pull request with the smallest credible test-side fix.

## Target issue

- If triggered by `issues`, the target is the labeled issue (`needs-flaky-fix` was just added). It is a non-PR issue.
- If triggered by `workflow_dispatch`, the target is issue number `${{ github.event.inputs.issue_number }}` in this repository.
- In `workflow_dispatch` mode, fetch the issue first with the GitHub tools before doing anything else.

## Pre-flight checks (do all of these before touching code)

If any of these fail, post a single comment on the issue explaining what happened and stop — do not open a PR.

1. **The issue still has the `needs-flaky-fix` label.** A human may have removed it after the workflow was queued.
2. **The latest Failed Test Investigator comment on the issue still says `fixability: auto-fixable`.** Parse the `Flakiness Finding` bullets. If `fixability` is anything else, stop.
3. **Pull `test.file` and `test.type` out of the same bullets.** If `test.file` is `unknown` or the file does not exist on the default branch, stop.
4. **No fix is already in flight for this test.** Search open PRs in this repository with `gh pr list --search 'in:body "Fixes #<issue-number>" is:pr is:open'` or by branch prefix `flaky-fix/issue-<issue-number>`. If a matching PR exists, post a no-op comment that says one is already open, link to it, and stop.
5. **The triggering pipeline is `kibana-on-merge`.** This is the only pipeline in scope for v1. Look at the Buildkite URLs cited in the issue body or comments — if all of them are on a different pipeline, stop.

## Investigation and patch

Once pre-flight passes, follow the Flaky Test Doctor playbook (in this repo at `x-pack/solutions/security/test/security_solution_cypress/.cursor/rules/flaky_test_doctor.mdc` — read it before starting). The short version:

1. Read the failing test file and the helpers/fixtures it imports.
2. Apply Steps 0–2 of the playbook quickly — verify the test is still meaningful, look for duplicate coverage, sanity-check that the test is at the right layer. If any of those checks indicate the right action is "delete" or "migrate" or "move to API/unit", **stop** and post a comment explaining why; do not open a fix PR. The investigator should have caught this, but verify.
3. Identify the smallest test-side patch that addresses the root cause from the investigator's `Suspected Root Cause`. Test-side only. Do not change product code, do not change CI configuration, do not change `package.json` or any lockfile. The `excluded-files` policy will strip those from the patch anyway, but you should not try to write them in the first place.
4. Apply the patch by editing the file(s) in the workspace.

## Local smoke gate

After every patch attempt, run all three of these in this order. The patch is acceptable only when all three pass.

```bash
# 1. Make sure node_modules are linked. This is required by everything else.
yarn kbn bootstrap

# 2. Lint and type-check just the agent profile (fast, scoped to changed code).
node scripts/check --profile agent

# 3. Run the targeted test once, the way it will run on CI.
# Pick ONE of these based on test.type from the investigator metadata:

# Scout UI (when path is .../test/scout*/ui/tests/...):
node scripts/scout.js run-tests \
  --location local --arch stateful --domain classic \
  --testFiles <test.file>

# Scout API (when path is .../test/scout*/api/tests/...):
node scripts/scout.js run-tests \
  --location local --arch stateful --domain classic \
  --testFiles <test.file>

# Scout parallel (when path is .../parallel_tests/...): same command as above; the
# CLI auto-resolves parallel.playwright.config.ts based on the path segment.

# FTR: identify the FTR config that owns this test (look at sibling `configs/*.config.ts`
# files in the test's suite folder), then:
node scripts/functional_tests --config <ftr-config.ts>

# Jest:
node scripts/jest --runTestsByPath <test.file>
```

If the smoke gate fails:

- Read the failure output, refine the patch, run the gate again.
- Stop after **5 failed attempts** within this single workflow run. If you hit that limit, **do not open a PR**. Post one comment on the issue explaining what you tried and what failed (include the relevant error excerpts), then stop.

If the smoke gate passes on attempt N (N ≤ 5):

- Proceed to "Output" below. Do not run further attempts.

## Output

Emit exactly one safe-output `create_pull_request` with:

- **Branch name**: `flaky-fix/issue-<issue-number>`. The safe-output handler will sanitize and salt as needed.
- **Title**: a short, human-readable summary of what the patch does. The `[flaky-fix] ` prefix is added automatically. Example: `Fix flaky Scout test "alerts histogram legend" by waiting for alerts to populate`.
- **Body**: use exactly this template, with placeholders replaced. Keep it short.

  ```
  Fixes #<issue-number>.

  <one sentence: what was failing, what this patch does>

  This PR was opened automatically by the Flaky Test Fixer. The Flaky Test Runner will validate that the fix holds across many runs once this PR is ready — until then, treat as a candidate.

  <!-- flaky-fix:state
  {
    "issue": <issue-number>,
    "attempt": <N>,
    "smokeGate": "passed",
    "investigatorComment": "<url-to-investigator-comment>"
  }
  -->
  ```

  The trailing HTML comment is the machine-readable state block for downstream automation. Keep the JSON valid. Do not add anything after the closing `-->`.

- **Commit message**: same as the PR title.

## Constraints

- One PR per run. The `max: 1` policy enforces this.
- Test-side patches only. The patch must touch only test files, test helpers, fixtures, page objects, or test-only utilities. No product source.
- No CI / lockfile / package.json edits. The `excluded-files` policy will silently drop these from the patch, but you should not try to write them in the first place.
- Do not skip or `.only` the test. Do not delete the test. The investigator already considered those actions and chose not to recommend them.
- Do not edit the investigator's comment, and do not add labels — that's not in your safe-output allowlist anyway.
- Be specific in the PR body sentence: name the file, the wait condition, the selector, or whatever the substantive change is.
- If you cannot identify a credible patch after reading the test and the investigator's suspected root cause, do not write a "let's just try increasing the timeout" patch. Post a comment explaining what's missing and stop.
