---
name: Codex Reviewer
on:
  pull_request_target:
    types: [synchronize, reopened, labeled]
  workflow_dispatch:
    inputs:
      pr_number:
        description: Pull request number to review
        required: true
        type: string
      comment_id:
        description: Triggering comment id for dispatched follow-up runs
        required: false
        type: string
  bots:
    - github-actions[bot]
    - kibanamachine
resources:
  - prefetch-pr-context.yml
timeout-minutes: 20
engine:
  id: codex
  version: "0.142.2"
  model: gpt-5.5
  args:
    - -c
    - model_context_window=1050000
    - -c
    - model_reasoning_summary=auto
  env:
    CODEX_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    OPENAI_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    OPENAI_BASE_URL: https://openrouter.ai/api/v1
# Activation rules:
# - Manual runs always activate.
# - Reviewer label events activate, including labels added while creating a PR.
# - Synchronize/reopened PR events activate when the reviewer label is already present.
# - Comment follow-up runs are dispatched by Reviewer Comment Dispatcher after fork-safe validation.
if: >-
  !github.event.repository.fork &&
  (
    github.event_name == 'workflow_dispatch' ||
    (
      github.event.sender.type != 'Bot' &&
      !contains(github.event.pull_request.labels.*.name, 'reviewer:skip-ai') &&
      github.event_name == 'pull_request_target' &&
      (
        (
          github.event.action == 'labeled' &&
          github.event.label.name == 'reviewer:codex'
        ) ||
        (
          github.event.action != 'labeled' &&
          contains(github.event.pull_request.labels.*.name, 'reviewer:codex')
        )
      )
    )
  )
concurrency:
  # Keep one review lane per PR/comment. Unrelated label events get their own group suffix so they can skip without canceling an in-flight review.
  group: >-
    gh-aw-${{ github.workflow }}-${{ github.event.pull_request.number || github.event.inputs.pr_number || github.run_id }}-${{
      github.event.inputs.comment_id ||
      (
        github.event.action == 'labeled' &&
        github.event.label.name != 'reviewer:codex' &&
        github.event.label.name != 'reviewer:skip-ai' &&
        github.event.label.name
      ) ||
      'pr-review'
    }}
  cancel-in-progress: true
  job-discriminator: ${{ github.event.pull_request.number || github.event.inputs.pr_number || github.run_id }}
permissions:
  contents: read
  issues: read
  pull-requests: read
env:
  PR_NUMBER: &pr_number ${{ github.event.pull_request.number || github.event.inputs.pr_number }}
  PR_CONTEXT_ARTIFACT_NAME: &pr_context_artifact_name prefetched-pr-context-${{ github.event.pull_request.number || github.event.inputs.pr_number }}
  REVIEWER_COMMENT_ID: ${{ github.event.inputs.comment_id }}
tools:
  github:
    toolsets: [default]
    min-integrity: none
network:
  allowed:
    - defaults
    - github
    - chatgpt.com
    - openrouter.ai
jobs:
  prefetch_pr_context:
    permissions:
      contents: read
      issues: read
      pull-requests: read
    uses: ./.github/workflows/prefetch-pr-context.yml
    with:
      pr_number: *pr_number
      repo: ${{ github.repository }}
      artifact_name: *pr_context_artifact_name
pre-agent-steps:
  - name: Download prefetched PR context
    uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
    with:
      name: ${{ env.PR_CONTEXT_ARTIFACT_NAME }}
      path: /tmp/gh-aw/agent
  - name: Discover active reviewers
    run: node .github/scripts/discover-reviewers.js
safe-outputs:
  footer: true
  report-failure-as-issue: false
  noop:
    report-as-issue: false
  create-pull-request-review-comment:
    max: 10
    target: ${{ env.PR_NUMBER }}
  submit-pull-request-review:
    max: 1
    target: ${{ env.PR_NUMBER }}
    allowed-events: [COMMENT]
    footer: if-body
  add-comment:
    max: 1
    target: ${{ env.PR_NUMBER }}
    discussions: false
  reply-to-pull-request-review-comment:
    max: 10
    target: ${{ env.PR_NUMBER }}
# Codex engine does not expose workflow env vars like PR_NUMBER and REVIEWER_COMMENT_ID to shell tools through -c `include_only [...]`, so render this follow-up context directly in the prompt.
---

# Kibana PR Review Coordinator

## Review mode

This reviewer's own gh-aw workflow id is `reviewer-codex`.

Read `/tmp/gh-aw/reviewers.csv`, trim it, split it on commas, and ignore empty entries. If there are no reviewer names, call `noop "No reviewers configured"`.

Otherwise, spawn one sub-agent per reviewer name using the reviewer name as the configured agent type. Ask each sub-agent to run review mode for this PR, follow its configured instructions, and record findings with `node .github/scripts/report-finding.js`; sub-agents must not call safe-output tools directly. Wait for all spawned sub-agents to finish, then close completed sub-agent threads if the close tool is available.

After all sub-agents finish, run `node .github/scripts/post-review.js`. Post each returned finding with `create-pull-request-review-comment`, and submit one `COMMENT` review with a concise non-empty body if any findings were posted so the workflow footer can identify this review on future reruns. If there are no findings, call `noop "No issues found"`.

## Follow-up response mode

When a comment id is present (`${{ github.event.inputs.comment_id }}`), do not run the review flow. Find the triggering comment by id in `pr-issue-comments.json` or `pr-review-comments.json`. Reply with `reply-to-pull-request-review-comment` for review comments or `add-comment` for timeline comments. Call `noop` if not actionable.
