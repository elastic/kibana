---
name: Failed Test Investigator
description: Investigate failed-test issues, classify whether the flakiness is in the test or underlying code, and propose the most likely fix.
on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: Issue number in this repository to investigate
        required: true
        type: string
  issues:
    types: [opened, labeled, reopened]

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
  checks: read
  models: read

if: "${{ (github.event_name == 'workflow_dispatch' && github.event.inputs.issue_number != '') || (github.event_name == 'issues' && !github.event.issue.pull_request && contains(github.event.issue.labels.*.name, 'failed-test')) }}"

concurrency:
  group: "failed-test-investigator-${{ github.event.issue.number || github.event.inputs.issue_number }}"
  cancel-in-progress: true

engine:
  id: claude
  version: "2.1.111"
  model: opus[1m]
  max-turns: 120
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
    toolsets: [default, actions, search]
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
    - chatgpt.com
    - elastic.litellm-prod.ai
sandbox:
  agent: awf  # Migrated from deprecated network setting
safe-outputs:
  activation-comments: false
  report-failure-as-issue: false
  add-comment:
    max: 1
    target: "*"
    hide-older-comments: true

strict: false
timeout-minutes: 20
---

# Failed Test Investigator

Investigate a failed-test issue selected by the trigger.

## Target Issue Selection

- If triggered by `issues`, use the triggering issue. This path should only run for non-PR issues labeled `failed-test`.
- If triggered by `workflow_dispatch`, use issue number `${{ github.event.inputs.issue_number }}` in the current repository as the target issue.
- In manual mode, fetch that issue explicitly with GitHub tools before doing any analysis.
- In manual mode, post the final comment back to that selected issue, not to the workflow run or any other issue.

Your job is to determine:

- the most likely root cause
- whether the flakiness is more likely in the test, in the underlying product code, due to an external cause, or inconclusive
- the smallest credible fix to try next

## What to inspect

1. Read the target issue title, body, labels, and all comments.
2. Parse any hidden failed-test metadata from the issue body when present:
   `test.class`, `test.name`, `test.type`, and `test.failCount`.
3. Extract CI evidence from the issue body and comments, especially:
   - Buildkite build and job URLs
   - `ci-stats.kibana.dev` links
   - Scout config paths, module IDs, locations, owners, targets, and attachments
   - stack traces, failure snippets, and "New error message" blocks
4. Inspect the relevant repository files.
   - For Scout failures, start from the reported location, config path, module, and nearby fixtures or helpers.
   - For FTR and other failures, infer the test file from the issue title and repository search results.
5. Check recent git history and blame for the likely test file and any closely related product code that could explain the failure.


## Classification rules

- Classify as `test` when the evidence points to timing, waits, selectors, fixtures, retries, setup or teardown, test data coupling, cleanup, or isolation problems in the test harness.
- Classify as `code` when the evidence is more consistent with a real product bug, broken contract, regression, or race in app, server, or shared code outside the test harness.
- Classify as `external` when the failure appears to be caused by something outside the specific test and product code under investigation, such as CI instability, a downed dependency or service, environment provisioning failures, credentials, networking, storage, or other unrelated platform incidents.
- Classify as `inconclusive` only when the available evidence does not support a defensible call.
- Do not guess. Every classification must be tied to specific evidence.

## Fix proposal rules

- Propose a fix only when you can point to the likely file or code area.
- Prefer the smallest plausible change.
- If the likely fix is in the test, say which assertion, wait condition, fixture, setup, teardown, or helper should change.
- If the likely fix is in product code, say which module, API, or behavior looks wrong and why.
- If you cannot justify a concrete fix, say what additional evidence would change the conclusion.

## Attribution rules

- If the evidence strongly points to a commit or small set of commits from the past 3 months, mention that explicitly in the comment.
- When possible, identify the author using their GitHub handle and mention them with `@username`.
- Only mention a person when the attribution is evidence-based, such as blame, commit history, or a directly implicated change.
- Do not mention people speculatively or as a fallback when the evidence is weak.

## Reference formatting rules

- When referencing a repository file, use a Markdown link to the file on GitHub, not a bare path.
- Prefer blob links with line anchors, for example: `[x-pack/.../file.ts](https://github.com/${{ github.repository }}/blob/${{ github.event.repository.default_branch }}/x-pack/.../file.ts#L123-L140)`.
- If the evidence depends on a specific historical revision, use a commit link instead of the default branch blob link.
- When referencing a commit, use a GitHub commit link, not just a short SHA.
- Bare paths like `file.ts:123` are allowed only as a supplement to a GitHub link, never as the only reference.

## Comment format

Post exactly one concise comment on the target issue with this structure:

### Investigation Summary

One short paragraph with the current best explanation.

### Flakiness Finding

- `classification`: `test` | `code` | `external` | `inconclusive`
- `confidence`: `high` | `medium` | `low`

### Suspected Root Cause

Use 2 to 5 bullets tied to evidence.
- If a recent commit appears causal, include the commit link and mention the author when justified.

### Proposed Fix

- Provide one focused fix proposal when justified.
- Include the exact file, function, assertion, wait condition, fixture, selector, API, or behavior that should change.
- Include GitHub links to the most relevant files or commits.
- State the exact change or investigation a human should make next.
- Be specific enough that an engineer could begin implementing it without re-deriving the plan.
- If you can justify a likely code change, include a small diff-style snippet showing the suggested edit.
- Only include a diff when it is grounded in the evidence you collected.
- If no credible fix is available, say that clearly and explain what evidence is missing.

### Evidence Used

List the key issue comments, file paths, commits, or links that drove the conclusion.

## Constraints

- Keep the comment actionable and specific.
- Be explicit when evidence is missing or inaccessible.
- Do not speculate beyond the evidence you collected.
- Use GitHub links for repository files and commits wherever you cite concrete code evidence.
- If manually dispatched, ensure the final safe-output comment targets issue `${{ github.event.inputs.issue_number }}` in the current repository.
