---
name: Codex Reviewer
on:
  pull_request_target:
    types: [synchronize, reopened, labeled]
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  workflow_dispatch:
    inputs:
      pr_number:
        description: Pull request number to review
        required: true
        type: string
resources:
  - prefetch-pr-context.yml
imports:
  - .github/agents/code-reviewer.md
timeout-minutes: 20
engine:  
  id: codex
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
# - Comment events activate only for `@codex` comments on labeled PRs.
if: >-
  !github.event.repository.fork &&
  (
    github.event_name == 'workflow_dispatch' ||
    (
      github.event.sender.type != 'Bot' &&
      !contains(github.event.pull_request.labels.*.name, 'reviewer:skip-ai') &&
      !contains(github.event.issue.labels.*.name, 'reviewer:skip-ai') &&
      (
        (
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
        ) ||
        (
          contains(github.event.comment.body, '@codex') &&
          (
            contains(github.event.pull_request.labels.*.name, 'reviewer:codex') ||
            contains(github.event.issue.labels.*.name, 'reviewer:codex')
          ) &&
          (
            github.event_name == 'pull_request_review_comment' ||
            (
              github.event_name == 'issue_comment' &&
              github.event.issue.pull_request
            )
          )
        )
      )
    )
  )
concurrency:
  # Keep one review lane per PR/comment. Unrelated label events get their own group suffix so they can skip without canceling an in-flight review.
  group: >-
    gh-aw-${{ github.workflow }}-${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number || github.run_id }}-${{
      github.event.comment.id ||
      (
        github.event.action == 'labeled' &&
        github.event.label.name != 'reviewer:codex' &&
        github.event.label.name != 'reviewer:skip-ai' &&
        github.event.label.name
      ) ||
      'pr-review'
    }}
  cancel-in-progress: true
  job-discriminator: ${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number || github.run_id }}
permissions:
  contents: read
  issues: read
  pull-requests: read
env:
  PR_NUMBER: &pr_number ${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number }}
  PR_CONTEXT_ARTIFACT_NAME: &pr_context_artifact_name prefetched-pr-context-${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number }}
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
steps:
  - name: Download prefetched PR context
    uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
    with:
      name: ${{ env.PR_CONTEXT_ARTIFACT_NAME }}
      path: /tmp/gh-aw/agent
safe-outputs:
  noop:
    report-as-issue: false
  create-pull-request-review-comment:
    max: 10
    target: ${{ env.PR_NUMBER }}
  submit-pull-request-review:
    max: 1
    target: ${{ env.PR_NUMBER }}
    allowed-events: [COMMENT]
    footer: none
  add-comment:
    max: 1
    target: ${{ env.PR_NUMBER }}
    discussions: false
    footer: false
  reply-to-pull-request-review-comment:
    max: 10
    target: ${{ env.PR_NUMBER }}
    footer: false
---

# Codex PR Reviewer

Using the imported reviewer instructions:
- Run in review mode for `pull_request_target` and `workflow_dispatch` workflow events.
- Run in follow-up response mode for `issue_comment` and `pull_request_review_comment` events that mention `@codex`.
