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
      comment_type:
        description: Triggering comment event type for dispatched follow-up runs
        required: false
        type: string
  bots:
    - github-actions[bot]
    - kibanamachine
  needs: [libra_routing]
resources:
  - prefetch-pr-context.yml
imports:
  - .github/agents/code-reviewer.md
  - .github/workflows/shared/app-dex-agents-otel.md
engine:
  id: claude
  version: "2.1.206"
  model: opus
  max-turns: 120
  env:
    ANTHROPIC_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    ANTHROPIC_BASE_URL: https://openrouter.ai/api
    ANTHROPIC_DEFAULT_OPUS_MODEL: anthropic/claude-opus-4.8[1m]
    ANTHROPIC_DEFAULT_HAIKU_MODEL: anthropic/claude-haiku-4.5
    ANTHROPIC_DEFAULT_SONNET_MODEL: anthropic/claude-sonnet-4.6
    CLAUDE_CODE_EFFORT_LEVEL: high
    CLAUDE_CODE_SUBAGENT_MODEL: opus[1m]
# Activation rules:
# - Manual runs always activate.
# - Non-draft PR events (opened/synchronize/reopened) activate unless reviewer:skip-ai or reviewer:libra is present.
# - The libra_routing job labels the 10% Libra trial cohort when a PR opens, including drafts; those PRs skip Claude.
# - Draft PR events activate only when the ci:draft-checks label is present.
# - ready_for_review activates the first review when a draft is marked ready.
# - Adding the ci:draft-checks label activates a review; other label events are ignored.
# - Synchronize events for merge commits are ignored; only code pushes activate a new review.
# - Comment follow-up runs are dispatched by Reviewer Comment Dispatcher after fork-safe validation.
if: >-
  !github.event.repository.fork &&
  (
    github.event_name == 'workflow_dispatch' ||
    (
      needs.libra_routing.outputs.diverted != 'true' &&
      github.event.sender.type != 'Bot' &&
      !contains(github.event.pull_request.labels.*.name, 'reviewer:skip-ai') &&
      !contains(github.event.pull_request.labels.*.name, 'reviewer:libra') &&
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
  REVIEWER_COMMENT_TYPE: ${{ github.event.inputs.comment_type }}
tools:
  bash: true
  github:
    toolsets: [default]
    min-integrity: none
network:
  allowed:
    - defaults
    - github
    - openrouter.ai
jobs:
  # Temporary trial: divert every tenth PR to Libra when it opens. A removed
  # reviewer:libra label is a permanent opt-out, and failures fall back to Claude.
  libra_routing:
    runs-on: ubuntu-slim
    continue-on-error: true
    outputs:
      diverted: ${{ steps.route.outputs.diverted }}
    steps:
      - name: Route cohort PRs to Libra
        id: route
        uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
        continue-on-error: true
        with:
          github-token: ${{ secrets.KIBANAMACHINE_TOKEN }}
          script: |
            core.setOutput('diverted', 'false');
            core.info('Automatic Libra cohort routing is disabled.');
            return;

            const pullRequest = context.payload.pull_request;
            const payloadLabels = (pullRequest?.labels || []).map((label) => label.name);
            const prNumber = Number(pullRequest?.number);
            if (
              context.eventName !== 'pull_request_target' ||
              context.payload.action !== 'opened' ||
              payloadLabels.includes('reviewer:skip-ai') ||
              !Number.isInteger(prNumber) ||
              prNumber % 10 !== 0
            ) {
              return;
            }

            try {
              const { owner, repo } = context.repo;
              const selectionCommentMarker = '<!-- libra-review-selection -->';
              const selectionCommentBody = [
                '### Selected for Libra review',
                '',
                `This PR was selected for [Libra](https://github.com/elastic/libra) review as part of the temporary 10% trial because PR #${prNumber} is divisible by 10.`,
                '',
                'To opt out permanently, remove the `reviewer:libra` label. It will not be added again to this PR.',
                '',
                selectionCommentMarker,
              ].join('\n');
              const ensureSelectionComment = async () => {
                try {
                  const comments = await github.paginate(github.rest.issues.listComments, {
                    owner,
                    repo,
                    issue_number: prNumber,
                    per_page: 100,
                  });
                  const commentAlreadyExists = comments.some(
                    (comment) =>
                      comment.user?.login?.toLowerCase() === 'kibanamachine' &&
                      comment.body?.includes(selectionCommentMarker)
                  );
                  if (commentAlreadyExists) {
                    core.info('The Libra selection comment is already present.');
                    return;
                  }

                  await github.rest.issues.createComment({
                    owner,
                    repo,
                    issue_number: prNumber,
                    body: selectionCommentBody,
                  });
                  core.info('Posted the Libra selection comment.');
                } catch (commentError) {
                  core.warning(
                    `PR #${prNumber} was routed to Libra, but the selection comment could not be posted: ${commentError.message}`
                  );
                }
              };

              const { data: currentPullRequest } = await github.rest.pulls.get({
                owner,
                repo,
                pull_number: prNumber,
              });
              const currentLabels = currentPullRequest.labels.map((label) =>
                typeof label === 'string' ? label : label.name
              );
              if (currentLabels.includes('reviewer:libra')) {
                core.info('reviewer:libra is already present; keeping the PR routed to Libra.');
                core.setOutput('diverted', 'true');
                await ensureSelectionComment();
                return;
              }

              const events = await github.paginate(github.rest.issues.listEventsForTimeline, {
                owner,
                repo,
                issue_number: prNumber,
                per_page: 100,
              });
              const wasPreviouslyLabeled = events.some(
                (event) =>
                  event.event === 'labeled' && event.label?.name === 'reviewer:libra'
              );
              if (wasPreviouslyLabeled) {
                core.info('reviewer:libra was removed previously; honoring the permanent opt-out.');
                return;
              }

              await github.rest.issues.addLabels({
                owner,
                repo,
                issue_number: prNumber,
                labels: ['reviewer:libra'],
              });
              core.info('Added reviewer:libra; PR routed to Libra.');
              core.setOutput('diverted', 'true');
              await ensureSelectionComment();
            } catch (error) {
              core.warning(`Unable to route PR #${prNumber} to Libra: ${error.message}`);
            }

  check_reviewable_commit:
    permissions:
      contents: read
    uses: ./.github/workflows/check-reviewable-commit.yml

  prefetch_pr_context:
    needs: check_reviewable_commit
    if: needs.check_reviewable_commit.outputs.should_review == 'true'
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
    github-token: ${{ secrets.KIBANAMACHINE_TOKEN }}
---

# Claude PR Reviewer

Using the imported reviewer instructions:
- Run in review mode for `pull_request_target` and manual `workflow_dispatch` events without a comment id.
- Run in follow-up response mode when `workflow_dispatch` includes a comment id and event type from the Reviewer Comment Dispatcher.
- This reviewer's own gh-aw workflow id is `reviewer-claude`. Use it as "this reviewer's own workflow id" when matching review threads to resolve.
