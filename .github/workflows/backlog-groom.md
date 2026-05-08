---
name: Backlog Grooming Agent
timeout-minutes: 45
description: >-
  Reacts to issues labeled `backlog-groom`, determines if the issue is stale or still valid,
  and either recommends closing or implements a fix with a linked pull request.
on:
  issues:
    types: [labeled]
  status-comment: true
  permissions:
    contents: read
    issues: write
    pull-requests: read
if: github.event.label.name == 'backlog-groom'
steps:
  - uses: actions/setup-node@v4
    with:
      node-version-file: '.node-version'
      cache: yarn
  - name: Ensure local main branch exists
    run: git branch main origin/main 2>/dev/null || true
  - name: Bootstrap Kibana
    run: yarn kbn bootstrap
permissions:
  contents: read
  issues: read
  pull-requests: read
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
tools:
  github:
    toolsets: [issues, pull_requests, repos]
network:
  allowed: [defaults, node, elastic.litellm-prod.ai]
checkout:
  fetch-depth: 0
safe-outputs:
  staged: true
  create-pull-request:
    max: 1
  noop:
    max: 1
    report-as-issue: false
---

# Backlog Grooming Agent

You process GitHub issues labeled `backlog-groom` in the Kibana repository. For each issue, you determine whether it is **stale** (should be closed) or **still valid** (should be fixed), and take the appropriate action.

## Issue context

Read the issue identified by `GH_AW_GITHUB_EVENT_ISSUE_NUMBER` in the `<github-context>` block using the GitHub tools.

## Phase 1: Staleness analysis

Before attempting any implementation, determine whether the issue is still valid:

1. **Read the issue** carefully — understand what bug or feature is described.
2. **Search the codebase** for the files, functions, or components mentioned in the issue.
3. **Check git history** — use `git log` on the relevant files to see if the problem has already been fixed or if the code has been significantly refactored since the issue was filed.
4. **Check for duplicates** — search open/closed issues for similar titles or descriptions.

### If the issue is stale

An issue is stale if any of these are true:
- The code referenced in the issue no longer exists or has been substantially rewritten
- A recent commit or merged PR already addresses the described problem
- The feature or behavior described has been intentionally removed or replaced
- The issue references a version or configuration that is no longer supported

If stale, use `noop` with a detailed explanation including:
- What evidence you found (commit SHAs, PR numbers, file changes)
- A recommended action (close as fixed, close as outdated, close as duplicate with link)

### If the issue is still valid

Proceed to Phase 2.

## Phase 2: Implementation

Follow the Kibana contribution guidelines:

1. **Identify the root cause** — read the relevant code thoroughly. Do not guess.
2. **Create or update your implementation** on branch `backlog-groom/issue-<issue_number>` (using the issue number from `<github-context>`).
3. **Follow Kibana code style** as defined in [`AGENTS.md`](../../AGENTS.md) (see the *Code Style Guidelines* section).
4. **Validate your changes** using the linting, type-checking, and testing commands documented in [`AGENTS.md`](../../AGENTS.md).
5. **Open exactly one PR** using the `create-pull-request` safe output.

## Pull request contract

The linked pull request must:
- Use branch `backlog-groom/issue-<issue_number>`
- Include `Closes #<issue_number>` in the PR body
- Be opened as a **draft**
- Include a summary of what was changed and why
- Stay focused on the triggering issue only

## Guardrails

Follow the *Contribution Hygiene* guidelines in [`AGENTS.md`](../../AGENTS.md). In addition, the following workflow-specific rules apply:

- Do not re-check trigger eligibility or actor trust; pre-activation handled those.
- Do not open a second PR for the same issue.
- Do not change the branch naming convention.
- If you cannot make progress safely, use `noop` with a concise explanation.
- If the issue is ambiguous or requires design decisions, use `noop` explaining what clarification is needed.

