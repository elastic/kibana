---
name: Claude Reviewer
on:
  pull_request:
    types: [opened, synchronize, reopened]
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
engine:
  id: claude
  version: "2.1.111"
  model: llm-gateway/claude-opus-4-7
  max-turns: 30
  env:
    ANTHROPIC_API_KEY: ${{ secrets.LITELLM_API_KEY }}
    ANTHROPIC_BASE_URL: https://elastic.litellm-prod.ai
    ENABLE_PROMPT_CACHING_1H: "1"
if: >-
  !github.event.repository.fork &&
  (
    github.event_name == 'workflow_dispatch' ||
    (
      github.event.pull_request.user.type != 'Bot' &&
      !contains(github.event.pull_request.labels.*.name, 'reviewer:skip-ai') &&
      contains(github.event.pull_request.labels.*.name, 'reviewer:claude')
    )
  )
concurrency:
  group: gh-aw-${{ github.workflow }}-${{ github.event.pull_request.number || github.event.inputs.pr_number || github.run_id }}
  cancel-in-progress: true
  job-discriminator: ${{ github.event.pull_request.number || github.event.inputs.pr_number || github.run_id }}
permissions:
  contents: read
  issues: read
  pull-requests: read
env:
  PR_NUMBER: &pr_number ${{ github.event.pull_request.number || github.event.inputs.pr_number }}
  PR_CONTEXT_ARTIFACT_NAME: &pr_context_artifact_name prefetched-pr-context-${{ github.event.pull_request.number || github.event.inputs.pr_number }}
tools:
  github:
    toolsets: [default]
network:
  allowed:
    - defaults
    - github
    - elastic.litellm-prod.ai
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
---

# Claude PR Reviewer

Review the pull request identified by `GH_AW_GITHUB_EVENT_PULL_REQUEST_NUMBER` and `GH_AW_GITHUB_REPOSITORY` in the `<github-context>` block using the imported reviewer instructions.

This workflow runs automatically for eligible pull request events and can still be triggered manually for testing.

Do not handle `@claude` comments, review replies, or follow-up conversational requests in this workflow.
