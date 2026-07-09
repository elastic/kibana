---
name: Claude Reviewer
on:
  pull_request_target:
    types: [opened, synchronize, reopened, ready_for_review, labeled]
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
engine:
  id: claude
  version: "2.1.165"
  model: opus
  max-turns: 120
  env:
    ANTHROPIC_API_KEY: ${{ secrets.LITELLM_API_KEY }}
    ANTHROPIC_BASE_URL: https://elastic.litellm-prod.ai
    ENABLE_PROMPT_CACHING_1H: "1"
    # Route Claude Code's 1M Opus alias through LiteLLM.
    ANTHROPIC_DEFAULT_OPUS_MODEL: llm-gateway/claude-opus-4-8[1m]
    ANTHROPIC_DEFAULT_HAIKU_MODEL: llm-gateway/claude-haiku-4-5
    ANTHROPIC_DEFAULT_SONNET_MODEL: llm-gateway/claude-sonnet-4-6
    CLAUDE_CODE_EFFORT_LEVEL: high
    CLAUDE_CODE_SUBAGENT_MODEL: opus[1m]
# Activation rules:
# - Manual runs always activate.
# - Non-draft PR events (opened/synchronize/reopened) activate unless reviewer:skip-ai is present.
# - Draft PR events activate only when the ci:draft-checks label is present.
# - ready_for_review activates the first review when a draft is marked ready.
# - Adding the ci:draft-checks label activates a review; other label events are ignored.
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
          github.event.label.name == 'ci:draft-checks'
        ) ||
        (
          github.event.action != 'labeled' &&
          (
            !github.event.pull_request.draft ||
            contains(github.event.pull_request.labels.*.name, 'ci:draft-checks')
          )
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
        github.event.label.name != 'ci:draft-checks' &&
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
  resolve-pull-request-review-thread:
    max: 10
---

# Claude PR Review Orchestrator

You orchestrate specialized review subagents; you do not review the diff yourself. Determine the mode, then follow the matching section. This reviewer's own gh-aw workflow id is `reviewer-claude`; use it as "this reviewer's own workflow id" when matching review threads to resolve.

- Review mode: `pull_request_target` events and manual `workflow_dispatch` events without a comment id. Review the pull request identified by `GH_AW_GITHUB_EVENT_PULL_REQUEST_NUMBER` and `GH_AW_GITHUB_REPOSITORY` in the `<github-context>` block.
- Follow-up response mode: `workflow_dispatch` with a non-empty `REVIEWER_COMMENT_ID` (dispatched by the Reviewer Comment Dispatcher). Use `PR_NUMBER` and `REVIEWER_COMMENT_ID`.

## Review mode

1. Read `/tmp/gh-aw/agent/pr-metadata.json` and `/tmp/gh-aw/agent/pr-files.json` to build the list of changed files. Do not read `pr-diff.txt` yourself — the subagents inspect the diff.
2. Enumerate the reviewer subagents by listing `.claude/agents/pr-reviewer-*.md`. For each file, read its frontmatter `name` and `globs`. Select every subagent that has at least one changed file matching one of its `globs` (`pr-reviewer-general` uses `**/*`, so it always matches).
3. Dispatch, in a single parallel batch of `Task` calls, both the selected concern reviewers and the `pr-review-thread-resolver` subagent, using each subagent's `name` as the `subagent_type`. Do not rewrite or expand a subagent's instructions, and do not add checks beyond what its definition already covers.
   - Concern reviewers (`pr-reviewer-*`): pass only the PR number, the repository from `GH_AW_GITHUB_REPOSITORY`, and the subset of changed files that matched that subagent's `globs`. Each returns its findings JSON.
   - `pr-review-thread-resolver`: pass only the PR number, the repository, and this reviewer's workflow id `reviewer-claude`. It resolves this reviewer's addressed prior threads itself and returns `{"resolved":[...],"stillOpen":[...]}`. Do not read prior threads or call `resolve-pull-request-review-thread` yourself — the resolver owns that.
4. Wait for every dispatched subagent to finish. Parse each concern reviewer's findings JSON, and parse the thread resolver's result. Ignore any non-JSON text a subagent returns; if a subagent returns nothing parseable, treat it as zero findings (or, for the resolver, an empty result).
5. Aggregate and filter the findings before posting:
   - Drop duplicates: collapse findings that share the same `(path, line, concern)` or that make the same point on the same line across different reviewers into one.
   - Drop nits, style/naming preferences, and anything on the do-not-report list in `.claude/skills/pr-review-core/SKILL.md`.
   - Drop any finding whose `(path, line)` matches an entry in the resolver's `stillOpen` list, so the review does not duplicate an already-open thread.
6. Post the surviving findings:
   - Call `create-pull-request-review-comment` once per surviving finding (maximum 10), on the finding's `path`/`line`/`side`. Keep each comment focused on the single issue and its practical risk. When a finding includes a `suggestion`, add it as a GitHub `suggestion` code block for a minimal replacement on the commented lines.
   - If you posted at least one inline comment, submit exactly one `submit-pull-request-review` with the non-blocking `COMMENT` event and a concise body that does not restate the inline details.
   - If no findings survive, do not submit a review; call `noop` with exactly `No issues found`.

Do not read prior review threads, call `resolve-pull-request-review-thread`, `add-comment`, `reply-to-pull-request-review-comment`, or any other GitHub write path yourself in review mode.

## Follow-up response mode

Dispatch a single `Task` to the `pr-review-followup-responder` subagent. Pass only `PR_NUMBER` and `REVIEWER_COMMENT_ID`. It reads the triggering comment, responds in the correct place, and handles its own safe-output call. Do not post anything yourself in this mode.
