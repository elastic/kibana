---
description: Manual and test-only Claude reviewer for pull requests using gh-aw safe review outputs.
on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: Pull request number to review
        required: true
        type: string
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
permissions: read-all
tools:
  github:
    toolsets: [default]
network:
  allowed:
    - defaults
    - github
    - elastic.litellm-prod.ai
steps:
  - name: Prefetch PR context
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      PR_NUMBER: ${{ github.event.inputs.pr_number }}
      REPO: ${{ github.repository }}
    run: |
      mkdir -p /tmp/gh-aw/agent
      gh pr view "$PR_NUMBER" --repo "$REPO" \
        --json number,title,body,url,isDraft,author,baseRefName,headRefName,labels \
        > /tmp/gh-aw/agent/pr-metadata.json
      gh api "repos/$REPO/pulls/$PR_NUMBER/files?per_page=100" --paginate \
        > /tmp/gh-aw/agent/pr-files.json
      gh api "repos/$REPO/issues/$PR_NUMBER/comments?per_page=100" --paginate \
        > /tmp/gh-aw/agent/pr-issue-comments.json
      gh api "repos/$REPO/pulls/$PR_NUMBER/comments?per_page=100" --paginate \
        > /tmp/gh-aw/agent/pr-review-comments.json
      gh api "repos/$REPO/pulls/$PR_NUMBER/reviews?per_page=100" --paginate \
        > /tmp/gh-aw/agent/pr-reviews.json
      gh pr diff "$PR_NUMBER" --repo "$REPO" \
        > /tmp/gh-aw/agent/pr-diff.txt
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

## Workflow context

- This workflow is manual and test-only for now.
- Start with the prefetched files in `/tmp/gh-aw/agent/`:
  - `pr-metadata.json`
  - `pr-files.json`
  - `pr-diff.txt`
  - `pr-issue-comments.json`
  - `pr-review-comments.json`
  - `pr-reviews.json`
- Use GitHub tools for extra repository or pull request context only when the prefetched files are not enough.

## Output rules

- Review only the changes in this pull request.
- Use `create-pull-request-review-comment` for concrete line-level findings.
- Submit exactly one final review with `submit-pull-request-review`.
- Keep the final review event as `COMMENT`.
- If there are no findings, the final review body must be exactly `No issues found.`
- Do not post any other GitHub comments.
- Do not handle `@claude` comments, review replies, or follow-up conversational requests in this workflow.
