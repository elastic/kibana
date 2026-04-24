---
name: Claude Reviewer
on:
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
secrets:
  ANTHROPIC_API_KEY: ${{ secrets.LITELLM_API_KEY }}
engine:
  id: claude
  model: llm-gateway/claude-opus-4-7
  max-turns: 30
  env:
    ANTHROPIC_BASE_URL: https://elastic.litellm-prod.ai
if: ${{ !github.event.repository.fork }}
concurrency:
  group: gh-aw-${{ github.workflow }}-${{ github.event.inputs.pr_number || github.run_id }}
  cancel-in-progress: true
  job-discriminator: ${{ github.event.inputs.pr_number || github.run_id }}
permissions: read-all
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
    uses: ./.github/workflows/prefetch-pr-context.yml
    with:
      pr_number: ${{ github.event.inputs.pr_number }}
      repo: ${{ github.repository }}
      artifact_name: prefetched-pr-context-${{ github.event.inputs.pr_number }}
    secrets:
      github_token: ${{ secrets.GITHUB_TOKEN }}
steps:
  - name: Download prefetched PR context
    uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
    with:
      name: prefetched-pr-context-${{ github.event.inputs.pr_number }}
      path: /tmp/gh-aw/agent
safe-outputs:
  create-pull-request-review-comment:
    max: 10
    target: ${{ github.event.inputs.pr_number }}
  submit-pull-request-review:
    max: 1
    target: ${{ github.event.inputs.pr_number }}
    allowed-events: [COMMENT]
    footer: none
---

# Claude PR Reviewer

Review pull request #${{ github.event.inputs.pr_number }} in `${{ github.repository }}` using the imported reviewer instructions.

This workflow is manual and test-only for now.

Do not handle `@claude` comments, review replies, or follow-up conversational requests in this workflow.
