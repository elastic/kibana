---
name: Flaky Test Fixer
description: Open a draft fix PR for a `failed-test` issue that the Failed Test Investigator labeled `needs-flaky-fix`.
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
  group: "flaky-test-fixer-${{ github.event.issue.number || github.event.inputs.issue_number }}"
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
    labels: [auto:flaky-fix]
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

You are picking up a `failed-test` issue that the Failed Test Investigator has marked as auto-fixable. Your job is to produce the right outcome for this issue. Most of the time that means opening one draft pull request with the smallest credible test-side fix. Sometimes it means posting a single comment explaining why a fix is not appropriate or not yet possible, and opening no PR at all. Both outcomes are correct. What is not acceptable is opening a PR you are not reasonably confident in.

## Target issue

- If triggered by `issues`, the target is the labeled issue (`needs-flaky-fix` was just added). It is a non-PR issue.
- If triggered by `workflow_dispatch`, the target is issue number `${{ github.event.inputs.issue_number }}` in this repository.
- In `workflow_dispatch` mode, fetch the issue first with the GitHub tools before doing anything else.

## Where to post comments

The `add_comment` safe output is configured with `target: "triggering"`. That means:

- On the `issues: [labeled]` trigger, a comment lands on the failed-test issue that just received the `needs-flaky-fix` label. This is the normal path. Whenever this prompt tells you to "post a comment and stop", emit a single `add_comment` safe output — it goes there automatically.
- On the `workflow_dispatch` trigger there is no triggering issue, so `add_comment` has nowhere to land. In that case, **do not emit an `add_comment`** for any of the "post a comment and stop" exits. Just stop. The workflow run logs are the only audit trail for manual dispatches; that is acceptable because `workflow_dispatch` is an operator escape hatch, not a normal user-facing path.

Comments are never posted on the PR you would have opened — the PR does not exist when these exits fire.

## Pre-flight checks (do all of these before touching code)

If any of these fail, post a single comment on the issue explaining what happened and stop — do not open a PR.

1. **The issue still has the `needs-flaky-fix` label.** A human may have removed it after the workflow was queued.
2. **The latest Failed Test Investigator comment on the issue still says `fixability: auto-fixable`.** Parse the `Flakiness Finding` bullets. If `fixability` is anything else, stop.
3. **Pull `test.file` and `test.type` out of the same bullets.** If `test.file` is `unknown` or the file does not exist on the default branch, stop.
4. **No fix is already in flight for this issue.** Search open PRs in this repository with the canonical label this workflow applies: `gh pr list --search 'is:pr is:open label:auto:flaky-fix' --json number,body --jq '.[] | select(.body | contains("Fixes #<issue-number>"))'`. If a matching PR exists, post a comment that links to it and stop.

## Investigation and patch

Once pre-flight passes:

1. Read the failing test file and the helpers, fixtures, and page objects it imports.
2. Re-read the investigator's `Suspected Root Cause` and `Proposed Fix` from the latest investigator comment on the issue.
3. Sanity-check the test before patching. If any of the following is true, **stop** and post a comment explaining what you found; do not open a fix PR. The investigator should have caught these, but verify.
   - The test no longer exercises a meaningful behavior (asserts on something trivially true, or covers behavior that has been removed).
   - The behavior under test is already covered at a lower layer (an existing API or unit test asserts the same thing), making this test redundant.
   - The test is at the wrong layer for the failure mode (a UI test asserting on a pure server-side concern, or vice versa).
4. Identify the smallest test-side patch that addresses the root cause. Test-side only — no product code, no CI configuration, no `package.json` or lockfile edits. The `excluded-files` policy will drop those from the patch anyway, but do not write them in the first place.
5. Apply the patch by editing the file(s) in the workspace.

## Local smoke gate

After every patch attempt, run three checks in this order. The patch is acceptable only when all three pass.

1. **Bootstrap**. Run `yarn kbn bootstrap` so dependencies and project references are linked. Required by everything that follows.
2. **Lint and type-check.** Run `node scripts/check --profile agent` (scoped lint + type-check tuned for AI-driven changes).
3. **Run the targeted test.** Use the documented mechanism for the test's framework:
   - **Scout** — follow [`docs/extend/scout/run-tests.md`](../../docs/extend/scout/run-tests.md). For iterating on a single test, prefer starting servers once and then running Playwright against them, rather than `node scripts/scout.js run-tests` (which boots and tears down servers every invocation). The efficient loop is:
     1. `node scripts/scout.js start-server --location local --arch stateful --domain classic` (leave running in one shell)
     2. `npx playwright test --config <playwright.config.ts> <test.file>` (re-run after each patch tweak)
     The config to pass to `--config` is the `playwright.config.ts` in the test's `test/scout*/{ui,api}/` directory; if the test path contains `parallel_tests/`, use the sibling `parallel.playwright.config.ts` instead.
   - **FTR** — identify the config that owns this test (the `configs/*.config.ts` in the same suite folder whose `testFiles` resolves to your test), then run `node scripts/functional_tests --config <ftr-config.ts>`.
   - **Jest** — `node scripts/jest --runTestsByPath <test.file>`.

If the smoke gate fails:

- Read the failure output, refine the patch, run the gate again.
- Stop after **5 failed attempts** within this single workflow run. If you hit that limit, **do not open a PR**. Post one comment on the issue explaining what you tried and what failed (include the relevant error excerpts), then stop.

If the smoke gate passes on attempt N (N ≤ 5):

- Proceed to the Confidence gate below. Do not run further attempts.

## Confidence gate (before opening the PR)

A green smoke gate is necessary but not sufficient. Before you emit the `create_pull_request` output, answer both of these honestly:

1. **Does the patch plausibly address the root cause from the investigator's `Suspected Root Cause`, not just make the symptom go away?** If you cannot explain in one sentence why this patch fixes the underlying race / ordering / state issue, your confidence is too low — post a comment describing what you tried and what you are unsure about, and stop without opening a PR.
2. **Did the local smoke gate exercise the failure mode?** A Scout or FTR test that passed once locally on an unloaded machine is weak evidence against a flake that only shows up under CI parallel load. If the patch is a guess that "feels right" and you have no independent signal that it addresses the actual failure mode (e.g. the investigator's evidence, a clearly missing wait/assertion, a well-known anti-pattern in the failing test), post a comment and stop.

The Flaky Test Runner exists to validate that the fix holds across many runs once the PR is open, but it cannot rescue a patch that is wrong by construction. When in doubt, comment and let a human take it from there — that is a successful outcome of this workflow, not a failure.

## Output

Emit exactly one safe-output `create_pull_request` with:

- **Branch name**: `flaky-fix/issue-<issue-number>`. The safe-output handler will sanitize and salt as needed.
- **Title**: must be of the form `[<Plugin name>] <concise summary of what the patch does>`. The `[flaky-fix] ` prefix is added automatically by the workflow, so do **not** include it yourself; the final title that lands on the PR will read `[flaky-fix] [<Plugin name>] <summary>`. Identify the plugin name from the test file path (e.g. `x-pack/solutions/security/plugins/security_solution/...` → `Security Solution`, `x-pack/solutions/observability/plugins/infra/...` → `Infra`); CODEOWNERS and the `package.json` `name` field next to the test are reliable sources. Examples:
  - `[Security Solution] Wait for alerts to populate before asserting on histogram legend`
  - `[Infra] Replace .within() with .find() to avoid stale element reference`
- **Body**: keep it to two short paragraphs. Use this template, with placeholders replaced:

  ```
  Fixes #<issue-number>.

  <one sentence: what was failing, what this patch does>

  This PR was opened automatically by the Flaky Test Fixer. The Flaky Test Runner will validate that the fix holds across many runs once this PR is ready — until then, treat as a candidate.
  ```

- **Commit message**: same as the PR title.

## Constraints

- One PR per run. The `max: 1` policy enforces this.
- Test-side patches only. The patch must touch only test files, test helpers, fixtures, page objects, or test-only utilities. No product source.
- No CI / lockfile / package.json edits. The `excluded-files` policy will silently drop these from the patch, but you should not try to write them in the first place.
- Do not skip or `.only` the test. Do not delete the test. The investigator already considered those actions and chose not to recommend them.
- Do not edit the investigator's comment, and do not add labels — that's not in your safe-output allowlist anyway.
- Be specific in the PR body sentence: name the file, the wait condition, the selector, or whatever the substantive change is.
- If you cannot identify a credible patch after reading the test and the investigator's suspected root cause, do not write a "let's just try increasing the timeout" patch. Post a comment explaining what's missing and stop.
