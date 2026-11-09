---
name: Flaky Fix Retrospective
description: Learn from flaky-test-fixer PRs that developers revised, replaced or closed, and from merged fixes that did not hold. Records one finding per case on a monthly tracking issue.
on:
  pull_request_target:
    types: [closed]
  issues:
    types: [labeled]
  workflow_dispatch:
    inputs:
      pr_number:
        description: Closed flaky-test-fixer PR number to review (leave empty when passing an issue)
        required: false
        type: string
      issue_number:
        description: failed-test issue labeled failure:fix-did-not-hold to review
        required: false
        type: string
  bots:
    - kibanamachine
    - github-actions[bot]

permissions:
  contents: read
  issues: read
  pull-requests: read

# Activation rules:
# - a flaky-test-fixer PR by kibanamachine was closed (merged or not). The classify job below
#   decides whether there is anything to learn and skips the agent otherwise.
# - a failed-test issue was labeled `failure:fix-did-not-hold` by the investigator.
# - a manual run naming one of the two.
if: >-
  !github.event.repository.fork &&
  (
    (
      github.event_name == 'workflow_dispatch' &&
      (github.event.inputs.pr_number != '' || github.event.inputs.issue_number != '')
    ) ||
    (
      github.event_name == 'pull_request_target' &&
      github.event.action == 'closed' &&
      github.event.pull_request.user.login == 'kibanamachine' &&
      contains(github.event.pull_request.labels.*.name, 'flaky-test-fixer')
    ) ||
    (
      github.event_name == 'issues' &&
      github.event.action == 'labeled' &&
      github.event.label.name == 'failure:fix-did-not-hold' &&
      contains(github.event.issue.labels.*.name, 'failed-test')
    )
  )

concurrency:
  # One lane per fix PR or issue. Every other label event gets its own suffix so it skips
  # without evicting a pending run.
  group: >-
    flaky-fix-retrospective-${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number || github.event.inputs.issue_number }}-${{
      (
        github.event_name == 'issues' &&
        github.event.label.name != 'failure:fix-did-not-hold' &&
        format('label-{0}', github.event.label.name)
      ) || 'review'
    }}
  cancel-in-progress: false
  job-discriminator: ${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number || github.event.inputs.issue_number }}

# `pull_request_target` runs with base-repository context, so never check out the PR head:
# the agent only needs `main` to read test files, and every PR diff arrives prefetched.
checkout:
  repository: ${{ github.repository }}

env:
  TARGET_PR: &target_pr ${{ github.event.pull_request.number || github.event.inputs.pr_number }}
  TARGET_ISSUE: &target_issue ${{ github.event.issue.number || github.event.inputs.issue_number }}
  CONTEXT_ARTIFACT_NAME: &context_artifact_name flaky-fix-retrospective-context-${{ github.run_id }}

imports:
  - .github/workflows/shared/app-dex-agents-otel.md

engine:
  id: claude
  version: '2.1.165'
  model: opus
  max-turns: 80
  env:
    ANTHROPIC_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    ANTHROPIC_BASE_URL: https://openrouter.ai/api
    ANTHROPIC_DEFAULT_OPUS_MODEL: anthropic/claude-opus-5
    ANTHROPIC_DEFAULT_HAIKU_MODEL: anthropic/claude-haiku-4.5
    ANTHROPIC_DEFAULT_SONNET_MODEL: anthropic/claude-sonnet-4.6
    CLAUDE_CODE_EFFORT_LEVEL: high
    CLAUDE_CODE_SUBAGENT_MODEL: opus[1m]

tools:
  github:
    toolsets: [default, search]
  bash: true

network:
  allowed:
    - defaults
    - github.com
    - api.github.com
    - openrouter.ai
    # to properly display links to best practices docs
    - elastic.co
sandbox:
  agent: awf

jobs:
  # The agent only runs when the deterministic classification found a developer signal.
  activation:
    needs: [classify]
    if: needs.classify.outputs.needs_analysis == 'true'
  classify:
    needs: pre_activation
    if: needs.pre_activation.outputs.activated == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write
    outputs:
      needs_analysis: ${{ steps.classify.outputs.needs_analysis }}
      case: ${{ steps.classify.outputs.case }}
      tracking_issue: ${{ steps.classify.outputs.tracking_issue }}
      fix_pr: ${{ steps.classify.outputs.fix_pr }}
    steps:
      - name: Checkout workflow scripts from trusted main
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          repository: elastic/kibana
          ref: main
          sparse-checkout: .github/scripts
          persist-credentials: false
      - name: Classify the fix outcome and prefetch the evidence
        # Labels the fix PR with its `flaky-fix-outcome:*`, resolves the monthly tracking issue
        # and writes the context files the agent compares. Only writes the agent never gets.
        id: classify
        uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
        env:
          TARGET_PR: *target_pr
          TARGET_ISSUE: *target_issue
          LABELED_AT: ${{ github.event.issue.updated_at }}
        with:
          retries: 3
          script: |
            const { runFlakyFixRetrospectiveContext } = require('./.github/scripts/flaky_fix_retrospective_context.js');
            const toNumber = (value) => (/^[1-9][0-9]*$/.test(value ?? '') ? Number(value) : undefined);
            await runFlakyFixRetrospectiveContext({
              github,
              core,
              prNumber: toNumber(process.env.TARGET_PR),
              issueNumber: toNumber(process.env.TARGET_ISSUE),
              labeledAt: process.env.LABELED_AT || undefined,
            });
      - name: Upload the retrospective context
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: *context_artifact_name
          path: /tmp/flaky-fix-retrospective
          retention-days: 1

steps:
  - name: Download the retrospective context
    uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
    with:
      name: ${{ env.CONTEXT_ARTIFACT_NAME }}
      path: /tmp/gh-aw/agent

safe-outputs:
  threat-detection:
    engine:
      id: claude
      version: '2.1.165'
  activation-comments: false
  report-failure-as-issue: false
  # Findings link the Buildkite builds that showed the recurrence.
  allowed-domains: [buildkite.com]
  # The only write the agent has: one finding on the monthly tracking issue. `required-labels`
  # keeps it from commenting anywhere else.
  add-comment:
    max: 1
    target: '*'
    required-labels: [flaky-fix-retrospective]

strict: false
timeout-minutes: 25
max-ai-credits: 500
---

# Flaky Fix Retrospective

A Flaky Test Fixer PR reached an outcome that carries a signal about the automation's judgment: developers changed its patch before merging, replaced it with their own fix, closed it with a reason, or the fix merged and the same failure came back. Compare what the fixer proposed with what actually held up, say what the automation got wrong, and record exactly one finding on the retrospective tracking issue.

You are a reviewer of the automation, not of the developers. You do not fix tests, trigger CI, edit any PR, or comment anywhere other than the tracking issue.

## Prefetched context

A deterministic pre-step classified this event and fetched the evidence into `/tmp/gh-aw/agent/`. Read these files instead of refetching them; use the GitHub tools only for what is missing (a file on `main`, an extra PR the evidence points at).

- `retrospective.json`: the `case` (see below), the fix PR number(s), the tracking issue number, and the list of files present.
- Fix PR cases (`revised-before-merge`, `replaced`, `closed`):
  - `fix-pr.json`: metadata, every commit with `isBot`/`isMerge` flags, `developerCommits`, and `agentHeadSha` (the last automation commit before a developer touched the branch).
  - `fix-pr-diff.txt`: the PR's final diff. `fixer-proposal-diff.txt` (revised case): the diff as of `agentHeadSha`, i.e. the fixer's proposal before any developer change.
  - `developer-commits.json` (revised case): each developer commit with its own patch.
  - `fix-pr-comments.json`, `fix-pr-reviews.json`, `fix-pr-review-comments.json`: the conversation, trusted authors only.
  - `closure.json` (closed cases): who closed the PR and the comment they left.
  - `replacement-prs.json` (replaced case): the merged PR(s) that fixed the same issue, each with its diff, comments and reviews.
  - `linked-issues.json`: the `failed-test` issue(s) the PR closes, with the investigator's comments, the reporter's failure comments and the merged PRs tied to each issue.
- Did-not-hold case:
  - `issue.json`: the `failed-test` issue with its comments (the latest investigator comment explains why the fix is judged not to have held), timeline, and `ciData` (test identity, fail count, type).
  - `prior-fix-prs.json`: the fixer PR(s) that merged for this failure, newest first, each with its diff, the verifier's comments and its `flaky-fix-check:*` label.

The case is `${{ needs.classify.outputs.case }}`, the fix PR is #${{ needs.classify.outputs.fix_pr }}, and the tracking issue is #${{ needs.classify.outputs.tracking_issue }}. If `retrospective.json` disagrees, trust the file.

## What to establish, per case

Work from the evidence to one dominant answer. Do not re-investigate the flake from CI artifacts: the question is whether the fixer's reasoning held up, not what the root cause is today.

### `revised-before-merge`

Developers merged the PR after changing it. Diff `fixer-proposal-diff.txt` against `fix-pr-diff.txt`, and read `developer-commits.json`, the review threads and the comments for the reason.

- Classify the divergence (see [Divergence](#divergence)). Branch updates, lint, naming and comment edits are `cosmetic`, and `cosmetic` findings get `lesson_type: none`.
- When the developer changed the mechanism or the diagnosis, state in one sentence what they knew that the fixer did not use (the test setup, product behavior, a neighboring helper, the investigator's own evidence).

### `replaced`

The PR was closed and another merged PR fixed the same `failed-test` issue. Compare the fixer's diff with the replacement's and read the closing comment.

- If the replacement is the same fix in a different PR (a developer re-opened it under their name, or a backport), the divergence is `none`: record it with `lesson_type: none`.
- Otherwise classify the divergence exactly as for a revised PR, using the replacement as the final approach.

### `closed`

A developer closed the PR and left a reason but no replacement merged. The closing comment is the finding. Decide whether the reason is about the fix (wrong diagnosis, a patch that only masks, wrong file or branch, test already migrated or deleted) or about process (duplicate work, not worth shipping, they want to own it). Only a reason about the fix can produce a `reinforce` or `new` lesson; a process reason is `process` or `none`.

### `did-not-hold`

The fixer's PR merged and the investigator later found the same failure in a build that contained the fix. Read the prior fix's PR body (what it assumed the cause was and how it verified it), its diff, its `flaky-fix-check:*` verdict, and the latest investigator comment on the issue.

- Name the assumption the fix rested on and the evidence in the recurrence that contradicts it.
- Say whether the verifier could have caught it: a `skipped` verdict on a timing fix, a local-only runner for a Cloud-only failure, or a green run that only proves the patch masks the failure.
- If the recurrence is a different root cause in the same test (the investigator comment usually says), the fix did hold for what it targeted: record `divergence: none`, `lesson_type: none`, and say so.

## Divergence

Pick the single highest level that applies:

| Level | Meaning |
| --- | --- |
| `none` | The shipped fix is the fixer's fix (or the recurrence is unrelated to it). |
| `cosmetic` | Same change; naming, comments, lint, formatting, a branch update. |
| `scope` | Same mechanism, applied to more or fewer places (another test, a shared helper, a second config). |
| `approach` | Same diagnosis, different mechanism (a readiness signal instead of a retry, an API setup instead of a UI flow, a product change instead of a test wait). |
| `diagnosis` | A different root cause. The fixer fixed the wrong thing. |

## Approach taxonomy

Name the fixer's approach and the final approach with one of: `add wait/retry`, `raise timeout`, `swap test helper/API`, `event/timer handling`, `test isolation/cleanup`, `production code fix`, `mock/stub dependency`, `relax/fix assertion`, `restructure test`, `scope selector`, `make test data deterministic`, `shrink test workload`, `skip coverage`, `un-skip`, `auth/role change`, `test config change`, `drop flaky assertion`, `other`. Name the framework with one of `jest-unit`, `jest-integration`, `ftr-ui`, `ftr-api`, `scout`, `cypress`, `other`.

## Guideline check

Every fix is held to the shared fix guidelines reproduced below. Find the guideline that the divergence or the recurrence is about and quote its bullet's leading bold phrase (for example `Wait on the signal the failing assertion reads, not an earlier step.`). Then decide:

- `guideline_followed: no`: the guideline covers this and the fixer did not apply it. The lesson is `reinforce` (the instruction exists, the prompts or the verifier gate did not make it bite), and your lesson sentence names where it failed to bite (fixer, verifier, investigator).
- `guideline_followed: yes`: the fixer applied the guideline and developers still diverged. The lesson is `new` only when you can state a condition that generalizes beyond this test, in one sentence a future run could act on. Otherwise `none`.
- `guideline: none`: nothing covers it. `new` under the same condition, else `none`.
- `process`: the lesson is about workflow mechanics, not fix quality (duplicate detection, version-branch targeting, backport labels, the verifier's run budget).

A lesson must be something the automation can do differently next time. "Be more careful" is not a lesson. Do not propose a lesson that only restates the guideline you quoted.

### Fix guidelines

{{#runtime-import .github/workflows/shared/flaky-fix-guidelines.md}}

## The finding

Post exactly one comment on the tracking issue with the `add_comment` tool, passing `item_number: ${{ needs.classify.outputs.tracking_issue }}`. Never comment on the fix PR, the replacement PR, or the `failed-test` issue. Never `@`-mention anyone, and refer to developers by role ("the reviewer", "the owning team"), not by name.

Write for a reader skimming the month's findings in two minutes: plain sentences, no jargon or taxonomy codes in the prose. Follow this format exactly:

```markdown
### {emoji} {Case}: {one-line lesson or "nothing to learn"}

{One or two short sentences: what the fixer proposed and what developers did instead, or what the recurrence showed. Link the fix PR and, when there is one, the replacement PR or the recurrence.}

<details>
<summary>Why it diverged</summary>

- {One or two sentences on why, anchored to evidence, with a link to the decisive commit, comment or failure.}
- **Guideline:** {quoted bullet phrase, or "none covers this"} ({followed / not followed}).
- **Could the verifier have caught it:** {one sentence; did-not-hold only, omit the bullet otherwise.}

</details>

<details>
<summary>Machine-readable finding</summary>

```yaml flaky-fix-finding
case: {revised-before-merge | replaced | closed | did-not-hold}
fix_pr: {number}
issues: [{issue numbers}]
replacement_pr: {number or null}
framework: {taxonomy value}
fixer_approach: {taxonomy value}
final_approach: {taxonomy value or null}
divergence: {none | cosmetic | scope | approach | diagnosis}
guideline: {quoted bullet phrase, or none}
guideline_followed: {yes | no | n/a}
lesson_type: {none | reinforce | new | process}
lesson: {one sentence, at most 40 words, or null}
lesson_target: {guidelines | fixer | verifier | investigator | null}
confidence: {high | medium | low}
```

</details>
```

`{Case}` is written in words: `Revised before merge`, `Replaced`, `Closed`, `Did not hold`. Emoji: `🔧` for revised, `🔁` for replaced, `🚫` for closed, `🔙` for did not hold. The framework, approach taxonomy and divergence level go only in the machine-readable block, never in the prose. Each bullet earns its place: drop one rather than pad it. Keep the `flaky-fix-finding` block machine-readable: the keys and allowed values above, nothing else, `null` where there is no value. The weekly curator parses it.

## When to call `noop` instead

Call the `noop` tool with a one-sentence reason, and post nothing, when the evidence cannot support a finding: the context files are missing, the prior fix for a did-not-hold issue cannot be identified from `prior-fix-prs.json` and the investigator's comment, or the fix PR turns out not to be a Flaky Test Fixer PR. A low-confidence finding is still a finding; an unsupported one is a noop.

## Working efficiently

Read each context file once and only the parts you need: for a diff, the hunks in the files the developers touched; for comments, the ones by humans and the investigator. Do not read CI logs or Buildkite artifacts. Finish well inside the budget: the comment is the deliverable, and an analysis that never posts has no value.
