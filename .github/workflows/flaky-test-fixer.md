---
name: Flaky Test Fixer
description: Open a draft fix PR for a `failed-test` issue that has been labeled `ai:fix-flaky`.
on:
  issues:
    types: [labeled]
  workflow_dispatch:
    inputs:
      issue_number:
        description: Issue number in this repository to fix
        required: true
        type: string

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
  checks: read
  models: read

if: "${{ (github.event_name == 'workflow_dispatch' && github.event.inputs.issue_number != '') || (github.event_name == 'issues' && github.event.action == 'labeled' && github.event.label.name == 'ai:fix-flaky' && !github.event.issue.pull_request) }}"

concurrency:
  group: 'flaky-test-fixer-${{ github.event.issue.number || github.event.inputs.issue_number }}'
  cancel-in-progress: false

env:
  ISSUE_NUMBER: &issue_number ${{ github.event.issue.number || github.event.inputs.issue_number }}
  # Whoever triggered this run: the user who applied `ai:fix-flaky`, or the manual dispatcher.
  REQUESTED_BY: ${{ github.actor }}

engine:
  id: claude
  version: '2.1.165'
  model: opus
  max-turns: 200
  env:
    ANTHROPIC_API_KEY: ${{ secrets.LITELLM_API_KEY }}
    ANTHROPIC_BASE_URL: https://elastic.litellm-prod.ai
    ENABLE_PROMPT_CACHING_1H: '1'
    ANTHROPIC_DEFAULT_OPUS_MODEL: llm-gateway/claude-opus-4-8[1m]
    ANTHROPIC_DEFAULT_HAIKU_MODEL: llm-gateway/claude-haiku-4-5
    ANTHROPIC_DEFAULT_SONNET_MODEL: llm-gateway/claude-sonnet-4-6
    CLAUDE_CODE_EFFORT_LEVEL: high
    CLAUDE_CODE_SUBAGENT_MODEL: opus[1m]

tools:
  github:
    toolsets: [default, search]
  web-fetch:
  bash: true

# Bootstrap Kibana on the self-hosted runner, in a pre-agent step that runs on the
# host (before `awf` starts the sandboxed agent), so `node_modules` and
# `@kbn/setup-node-env` exist and the agent can lint and type check the fix.
runs-on: kibana
steps:
  - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
    with:
      node-version-file: '.nvmrc'
      cache: yarn
  - name: Bootstrap Kibana
    run: yarn kbn bootstrap

network:
  allowed:
    - defaults
    - buildkite.com
    - '*.buildkite.com'
    - ci-stats.kibana.dev
    - github.com
    - api.github.com
    - elastic.litellm-prod.ai
sandbox:
  agent: awf

safe-outputs:
  activation-comments: false
  report-failure-as-issue: false
  mentions:
    allowed:
      - ${{ github.actor }}
  add-comment:
    max: 1
    target: *issue_number
    hide-older-comments: true
  # Clear the `ai:fix-flaky` trigger label once we have a result.
  remove-labels:
    allowed:
      - ai:fix-flaky
    max: 1
    target: *issue_number
  create-pull-request:
    draft: true
    max: 1
    labels: [flaky-test-fixer]
    # Request whoever triggered the fix as reviewer. A bot actor (rare) can't be a
    # reviewer, so the handler just logs a warning and the PR is still created.
    reviewers: ${{ github.actor }}
    base-branch: main
    allowed-base-branches: ['main', '9.*', '8.*', '7.*']
    if-no-changes: 'ignore'
    # Open the PR as `kibanamachine` (a user), not the default GITHUB_TOKEN bot, so
    # the PR's `opened` event can trigger the Flaky Fix Verifier (GITHUB_TOKEN events don't).
    github-token: ${{ secrets.KIBANAMACHINE_TOKEN }}
    protected-files: fallback-to-issue
    # Use git format-patch / `git am --3way` instead of a git bundle. The bundle
    # transport makes the shallow safe_outputs checkout run `git fetch --unshallow`,
    # which on a repo Kibana's size cannot finish within the 15m job timeout.
    patch-format: am
  # Fills the %%FIX_PR_URL%% / %%FIX_PR_BADGE%% placeholders the agent leaves in the
  # outcome comment. The agent can't do this itself: it doesn't know the PR number while
  # it runs (safe_outputs creates the PR afterwards), so this job runs after safe_outputs.
  jobs:
    link-fix-pr:
      description: 'Replace the %%FIX_PR_URL%% and %%FIX_PR_BADGE%% placeholders in the outcome comment with the newly-opened fix PR link and a live PR-state badge. Call this exactly once, and only after you have opened a draft PR.'
      runs-on: ubuntu-latest
      needs: safe_outputs
      if: needs.safe_outputs.outputs.created_pr_url != '' && needs.safe_outputs.outputs.comment_id != ''
      permissions:
        issues: write
      inputs:
        confirm:
          description: 'Set to true to link the outcome comment to the opened fix PR. Only call this after a PR has been opened.'
          required: true
          type: boolean
      env:
        # The URL and number of the fix PR that safe_outputs just created.
        GH_AW_PR_URL: ${{ needs.safe_outputs.outputs.created_pr_url }}
        GH_AW_PR_NUMBER: ${{ needs.safe_outputs.outputs.created_pr_number }}
        # The id of the outcome comment safe_outputs just posted (which comment to edit).
        GH_AW_COMMENT_ID: ${{ needs.safe_outputs.outputs.comment_id }}
      steps:
        - name: Append PR link to outcome comment
          uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
          with:
            github-token: ${{ secrets.KIBANAMACHINE_TOKEN }}
            script: |
              const prUrl = process.env.GH_AW_PR_URL;
              const prNumber = process.env.GH_AW_PR_NUMBER;
              const commentId = Number(process.env.GH_AW_COMMENT_ID);
              if (!prUrl || !prNumber || !Number.isInteger(commentId)) {
                core.info('Missing PR URL, PR number, or comment id; nothing to do.');
                return;
              }
              const { owner, repo } = context.repo;
              const { data: comment } = await github.rest.issues.getComment({ owner, repo, comment_id: commentId });
              const body = comment.body || '';
              // Live PR-state badge (open/draft/merged/closed) linking to the fix PR.
              const badge = `[<img src="https://img.shields.io/github/pulls/detail/state/${owner}/${repo}/${prNumber}">](${prUrl})`;
              // Fill the placeholders the agent left in the outcome comment.
              const updated = body.replaceAll('%%FIX_PR_URL%%', prUrl).replaceAll('%%FIX_PR_BADGE%%', badge);
              if (updated === body) {
                core.info('No fix-PR placeholders found; nothing to do.');
                return;
              }
              await github.rest.issues.updateComment({ owner, repo, comment_id: commentId, body: updated });
              core.info(`Filled fix-PR placeholders for #${prNumber} in comment ${commentId}.`);

strict: false
timeout-minutes: 90
---

# Flaky Test Fixer

Open a single draft PR with the smallest possible test-side fix for this flaky-test issue. Do not open a PR if either of the following is true: you find an existing open PR with an identical or similar fix (search PRs for ones that reference this issue number in their body, or check the issue timeline for PRs that reference it), or you cannot identify a credible fix. Whatever the outcome, always finish by leaving one concise comment on the issue (see "Outcome comment").

## Requester mention

`${{ env.REQUESTED_BY }}` triggered this run — the user who applied `ai:fix-flaky`, or the manual dispatcher. @-mention them (`@${{ env.REQUESTED_BY }}`) in both the outcome comment and the PR body so they get pinged to review the outcome and the fix, but **only if it is a real user account**: if `${{ env.REQUESTED_BY }}` ends with `[bot]` or is `kibanamachine`, omit the mention (and the "Requested by" line) entirely.

## Environment

Kibana is already bootstrapped for you.

## Steps

1. Read the investigator's comment on the issue for the suspected root cause and proposed fix. If no action is needed, skip to step 6.
2. Read the failing test and the helpers, fixtures, and page objects it imports.
3. Apply the smallest test-side patch that addresses the root cause. Don't add explanatory code comments to the patch by default — a good test-side fix is self-explanatory. Add one only when the fix is particularly involved or non-obvious, and keep it to 1–2 sentences; a simple change like a timeout bump never warrants a comment.
4. Verify the patch: lint and type check it with `node scripts/eslint` and `node scripts/type_check` (and, for a Jest test, run it with `node scripts/jest`). FTR/Scout tests need a live Elasticsearch + Kibana and cannot be run here.
5. Open the PR (see "PR format" below).
6. Post the outcome comment on the issue (see "Outcome comment" below). Do this in every run, whether or not you opened a PR.
7. Remove the `ai:fix-flaky` label from the issue via the `remove-labels` safe output. Do this in **every** run once you have a result — whether you opened a PR, found an existing one, or opened none.
8. **Only if you opened a PR in step 5**, call the `link_fix_pr` tool with `confirm: true`. It runs after the PR and your comment exist and replaces the `%%FIX_PR_URL%%` and `%%FIX_PR_BADGE%%` placeholders in your outcome comment with the PR link and a live PR-state badge. You cannot know the PR number while running (the PR is created afterwards), so leave the placeholders in place and never write the URL, number, or badge yourself — this tool is how they get filled.

## PR format

- **Branch**: name the PR's source branch `fix/flaky-<issue-number>-<short-kebab-slug>` (e.g. `fix/flaky-275144-host-flow-ingestion-wait`) to keep fixer branches uniform.
- **Title**: `[<Plugin name>] <concise summary of the fix>`. Derive the plugin name from the test file path (e.g. `x-pack/solutions/security/plugins/security_solution/...` → `Security Solution`).
- **Body**:
  ```
  Fixes #<issue-number> (add more issue numbers here if this fix resolves multiple issues)

  ### Summary
  <a few bullet points: what was failing, and what this patch changes - keep it very concise, every bullet point must be earned>

  <if this fix matches what the failed test investigator already proposed in the issue, reference it instead of repeating it here; otherwise, explain how and why it differs>

  <details>
  <summary>Verification</summary>

  #### Verified locally

  <bullet list of what you successfully ran on this branch — e.g. `node scripts/eslint <files>`, `node scripts/type_check --project <tsconfig>`, `node scripts/jest <test>`, etc. Include the exact commands.>

  #### Not verified locally

  <bullet list of what you could not verify and why. E.g., behavior under CI parallel load, on a different stack version, against a real Elasticsearch instance, etc. Omit this section if there is nothing to mention.>

  </details>
  ```

Add the following at the very end of the PR description (and outside of the details block):

```markdown
> [!NOTE]
> Created by the Flaky Test Fixer workflow, requested by @${{ env.REQUESTED_BY }}. Share feedback or questions in #kibana-qa.
```

(Per "Requester mention", drop `requested by @${{ env.REQUESTED_BY }}` from the NOTE if the requester is a bot or `kibanamachine`.)

## Outcome comment

In **every** run, finish by posting exactly one short comment on issue #${{ env.ISSUE_NUMBER }} via the `add-comment` safe output, and removing the `ai:fix-flaky` label (see step 7). Format the comment as a short `###` heading that states the outcome (with the leading emoji shown below), followed by a single sentence of detail, then `cc @${{ env.REQUESTED_BY }}` at the very end (see "Requester mention", only append if the requester isn't a bot). No other preamble or sign-off.

Follow this format:

- **PR opened**:
  ```markdown
  ### ➡️ A fix PR is ready for review: %%FIX_PR_URL%%

  <one very concise sentence on what the PR changes>. cc @<github-handle-here>

  %%FIX_PR_BADGE%%
  ```
  Include the `%%FIX_PR_URL%%` and `%%FIX_PR_BADGE%%` placeholders verbatim — the `link_fix_pr` tool replaces them with the PR link and a live PR-state badge. Never write the PR URL, number, or badge yourself.
  
- **Existing PR already covers it**:
  ```markdown
  ### 🔁 A fix is already in flight

  #<PR number> already covers this, so no duplicate PR was opened. cc @<github-handle-here>
  ```
- **No PR opened**:
  ```markdown
  ### ⏭️ No fix PR was opened

  The failure is infrastructure-side (the CI agent lost its Elasticsearch connection mid-run), not test-side, so there's nothing to patch here. cc @<github-handle-here>
  ```
  Swap in the actual one-clause reason — e.g. the test already passes on `main`, the failure is infrastructure / not test-side, or the root cause can't be confidently identified.
