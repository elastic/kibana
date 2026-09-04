---
name: Flaky Fix Verifier
description: Verify a Flaky Test Fixer PR by running the Flaky Test Runner, attributing results, iterating the fix, and reporting confidence.
on:
  pull_request_target:
    types: [labeled]
  issue_comment:
    types: [created]
  workflow_dispatch:
    inputs:
      pr_number:
        description: Pull request number in this repository to validate
        required: true
        type: string
  bots:
    - github-actions[bot]
    - kibanamachine

resources:
  - prefetch-pr-context.yml

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
  checks: read
  models: read

# Activation rules:
# - Manual runs always activate.
# - `kickoff`: a PR is labeled `flaky-test-fixer`.
#   NOTE: not checking the author is a temporary measure for testing; tighten it
#   back (e.g. to the `kibanamachine` fixer identity) once the flow is validated.
# - `process_results`: the Flaky Test Runner posts its `## Flaky Test Runner Stats`
#   comment on a PR we are actively validating (`flaky-fix-check:started`). The
#   workflow removes `running` when it reaches a terminal verdict, so the label's
#   presence alone is enough to gate this.
if: >-
  !github.event.repository.fork &&
  (
    github.event_name == 'workflow_dispatch' ||
    (
      github.event_name == 'pull_request_target' &&
      github.event.action == 'labeled' &&
      github.event.label.name == 'flaky-test-fixer'
    ) ||
    (
      github.event_name == 'issue_comment' &&
      github.event.issue.pull_request &&
      contains(github.event.comment.body, 'Flaky Test Runner Stats') &&
      contains(github.event.issue.labels.*.name, 'flaky-fix-check:started')
    )
  )

concurrency:
  # One lane per PR, entered only by events that can verify it. Anything else gets its own
  # suffix so it skips without evicting the pending run (GitHub keeps just one per group).
  group: >-
    flaky-fix-verifier-${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number }}-${{
      (
        github.event.action == 'labeled' &&
        github.event.label.name != 'flaky-test-fixer' &&
        format('label-{0}', github.event.label.name)
      ) ||
      (
        github.event_name == 'issue_comment' &&
        !contains(github.event.comment.body, 'Flaky Test Runner Stats') &&
        format('comment-{0}', github.event.comment.id)
      ) ||
      'verify'
    }}
  # Never cancel an in-flight iteration: a cancelled run could drop the run-count
  # bookkeeping mid-flight.
  cancel-in-progress: false

env:
  PR_NUMBER: &pr_number ${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number }}
  PR_CONTEXT_ARTIFACT_NAME: &pr_context_artifact_name prefetched-pr-context-${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number }}
  # Lets the agent omit `-o elastic` on every `bk` invocation.
  BUILDKITE_ORGANIZATION_SLUG: elastic

imports:
  - .github/workflows/buildkite-cli-setup.md
  - .github/workflows/shared/app-dex-agents-otel.md

engine:
  id: claude
  version: '2.1.165'
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

tools:
  github:
    toolsets: [default, actions, search]
  web-fetch:
  bash: true

network:
  allowed:
    - defaults
    - buildkite.com
    - '*.buildkite.com'
    - buildkiteartifacts.com
    - ci-stats.kibana.dev
    - github.com
    - api.github.com
    - openrouter.ai
    # to properly display links to best practices docs
    - elastic.co
sandbox:
  agent: awf

# Check out the PR head by number (available for every trigger) so the
# `push_to_pull_request_branch` handler's own branch fetch is a fast no-op
# instead of an unbounded fetch that hangs on a repo Kibana's size.
checkout:
  ref: refs/pull/${{ github.event.pull_request.number || github.event.issue.number || github.event.inputs.pr_number }}/head
  fetch-depth: 2

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
  - name: Precompute flaky run count
    env:
      PR_CONTEXT_DIR: /tmp/gh-aw/agent
    run: |
      # Deterministic count of /flaky runs already triggered by kibanamachine so the agent
      # reads a number instead of hand-tallying comments; author filter keeps a developer's
      # manual /flaky from draining the bot's budget.
      node <<'NODE'
      const fs = require('fs');
      const path = require('path');
      const dir = process.env.PR_CONTEXT_DIR;
      const comments = JSON.parse(fs.readFileSync(path.join(dir, 'pr-issue-comments.json'), 'utf8'));
      const triggeredByBot = comments.filter(
        (comment) =>
          comment?.user?.login === 'kibanamachine' &&
          typeof comment.body === 'string' &&
          comment.body.startsWith('/flaky ')
      ).length;
      fs.writeFileSync(path.join(dir, 'flaky-run-count.json'), `${JSON.stringify({ triggeredByBot })}\n`);
      console.log(`Flaky runs already triggered by kibanamachine: ${triggeredByBot}`);
      NODE
  - name: Detect duplicate fix PRs
    # Shortlist the `flaky-test-fixer` PRs whose `failed-test` issue is owned by the same
    # team as this PR, so the agent triages a short, relevant set instead of blind-searching.
    # Non-fatal: a detection failure must not block verification — the agent treats a missing
    # file as "no candidates".
    uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
    with:
      script: |
        const { writeDuplicateCandidates } = require('./.github/scripts/find_duplicate_fix_prs.js');
        try {
          await writeDuplicateCandidates({ github, core, prNumber: Number(process.env.PR_NUMBER) });
        } catch (err) {
          core.warning(`Duplicate detection failed: ${err.message}`);
        }

safe-outputs:
  activation-comments: false
  report-failure-as-issue: false
  add-comment:
    max: 3
    target: *pr_number
    # Post as `kibanamachine` so the `/flaky` comment triggers `trigger-flaky.yml`
    # (GITHUB_TOKEN comments don't fire workflows, and that gate only accepts kibanamachine/members).
    github-token: ${{ secrets.KIBANAMACHINE_TOKEN }}
  add-labels:
    allowed:
      - flaky-fix-check:started
      - flaky-fix-check:passed
      - flaky-fix-check:failed
      - flaky-fix-check:inconclusive
      - flaky-fix-check:skipped
      - release_note:skip
      - release_note:fix
      - backport:skip
      - backport:all-open
      - backport:version
      - v9.*
      - v8.*
    # One terminal verdict, one release-note label, the backport policy, and any active-version labels.
    max: 9
    target: *pr_number
  remove-labels:
    allowed:
      - flaky-fix-check:started
    max: 1
    target: *pr_number
  # Used only on iterations that revise the fix. The fixer always creates in-repo
  # (non-fork) branches, so pushing back to the PR branch is allowed. `am` patch
  # transport avoids the `git fetch --unshallow` that times out on a repo this size.
  # Pushes with the default GITHUB_TOKEN (as github-actions[bot]); the follow-up
  # `/flaky` comment that re-runs verification is what carries the kibanamachine identity.
  push-to-pull-request-branch:
    target: '*'
    required-labels: [flaky-test-fixer]
    protected-files: fallback-to-issue
    patch-format: am
    max: 1
  # Keeps the PR title/body current after a pushed revision or adds a required release note.
  update-pull-request:
    operation: replace
    footer: false
    target: *pr_number
    max: 1
  # Custom safe-job: take the draft fix PR out of draft once verification clears it.
  jobs:
    mark-pr-ready:
      description: 'Take the draft fix PR out of draft (mark it ready for review) and enable auto-merge (squash) so it merges once required CI is green and it has an approval. Call exactly once, and only after you have applied `flaky-fix-check:passed` or `flaky-fix-check:skipped`, completed release-note and backport labeling, and added the PR-body release note required by `release_note:fix`. Never call it for a `failed` or `inconclusive` verdict, and never while still iterating.'
      runs-on: ubuntu-latest
      needs: safe_outputs
      permissions:
        pull-requests: write
      inputs:
        confirm:
          description: 'Set to true to mark the PR ready for review. Only pass true once verification has passed or been skipped.'
          required: true
          type: boolean
      env:
        GH_AW_PR_NUMBER: *pr_number
      steps:
        - name: Mark the fix PR ready for review
          uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
          with:
            github-token: ${{ secrets.KIBANAMACHINE_TOKEN }}
            script: |
              const prNumber = Number(process.env.GH_AW_PR_NUMBER);
              if (!Number.isInteger(prNumber)) {
                core.info('Missing PR number; nothing to do.');
                return;
              }
              const { owner, repo } = context.repo;
              const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
              // Only a verified or unverifiable fix goes to a human: a `failed` or `inconclusive`
              // verdict stays a draft. The labels are written by the safe_outputs job this one
              // depends on, so they are the authoritative verdict by the time we read them.
              const readyVerdicts = ['flaky-fix-check:passed', 'flaky-fix-check:skipped'];
              const labels = pr.labels.map((label) => label.name);
              if (!labels.some((label) => readyVerdicts.includes(label))) {
                core.info(
                  `PR #${prNumber} carries none of ${readyVerdicts.join(', ')} (labels: ${labels.join(', ') || 'none'}); leaving it as a draft.`
                );
                return;
              }
              if (pr.draft) {
                try {
                  // markPullRequestReadyForReview only exists on the GraphQL API and needs the PR node id.
                  await github.graphql(
                    'mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { pullRequest { isDraft } } }',
                    { id: pr.node_id }
                  );
                  core.info(`Marked PR #${prNumber} ready for review.`);
                } catch (err) {
                  // Non-fatal: a failure to mark ready must not fail the verification run.
                  core.warning(`Could not mark PR #${prNumber} ready for review: ${err.status || ''} ${err.message}`);
                }
              } else {
                core.info(`PR #${prNumber} is already out of draft.`);
              }
              if (pr.state !== 'open' || pr.merged) {
                core.info(`PR #${prNumber} is not open; skipping auto-merge.`);
                return;
              }
              try {
                await github.graphql(
                  'mutation($id: ID!) { enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH }) { pullRequest { autoMergeRequest { enabledAt } } } }',
                  { id: pr.node_id }
                );
                core.info(`Enabled auto-merge (squash) for PR #${prNumber}.`);
              } catch (err) {
                // Non-fatal: auto-merge may be rejected (e.g. all requirements already met, or a transient draft-state race); a human can still merge.
                core.warning(`Could not enable auto-merge for PR #${prNumber}: ${err.status || ''} ${err.message}`);
              }
    close-as-duplicate:
      description: 'Close THIS fix PR as a duplicate of an existing canonical fix PR and point to it. Call only in kickoff mode, only once, and only after confirming another `flaky-test-fixer` PR fixes the same root cause (same method/purpose) and is the canonical one to keep (see "Duplicate detection"). Pass the canonical PR number in `canonical_pr`. Never call it alongside `mark_pr_ready`, a `/flaky` run, or `flaky-fix-check:started`.'
      runs-on: ubuntu-latest
      needs: safe_outputs
      permissions:
        contents: read
        pull-requests: write
        issues: write
      inputs:
        canonical_pr:
          description: 'PR number (digits only) of the canonical fix this PR duplicates.'
          required: true
          type: string
      env:
        GH_AW_PR_NUMBER: *pr_number
      steps:
        - name: Close the duplicate fix PR
          uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
          with:
            script: |
              const fs = require('fs');
              const prNumber = Number(process.env.GH_AW_PR_NUMBER);
              const outputPath = process.env.GH_AW_AGENT_OUTPUT;
              if (!Number.isInteger(prNumber) || !outputPath || !fs.existsSync(outputPath)) {
                core.info('Missing PR number or agent output; nothing to do.');
                return;
              }
              // Custom safe-jobs read their inputs from the agent output file, not the job inputs context.
              const { items = [] } = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
              const entry = items.find((item) => item.type === 'close_as_duplicate');
              if (!entry) {
                core.info('No close_as_duplicate request; nothing to do.');
                return;
              }
              const canonical = String(entry.canonical_pr || '').trim().replace(/^#/, '');
              const canonicalRef = /^\d+$/.test(canonical) ? `#${canonical}` : 'another open fix PR';
              const { owner, repo } = context.repo;
              const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
              if (pr.state !== 'open') {
                core.info(`PR #${prNumber} is already ${pr.state}; nothing to do.`);
                return;
              }
              const body = [
                '### 🔁 Closing as a duplicate fix',
                '',
                `This PR fixes the same flaky test as ${canonicalRef}, which is already in flight, so it is being closed to avoid duplicate work. Reopen it if ${canonicalRef} turns out not to cover this case.`,
              ].join('\n');
              try {
                await github.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
              } catch (err) {
                core.warning(`Could not comment on #${prNumber}: ${err.status || ''} ${err.message}`);
              }
              try {
                await github.rest.pulls.update({ owner, repo, pull_number: prNumber, state: 'closed' });
                core.info(`Closed #${prNumber} as a duplicate of ${canonicalRef}.`);
              } catch (err) {
                // Non-fatal: a failure to close must not fail the verification run.
                core.warning(`Could not close #${prNumber}: ${err.status || ''} ${err.message}`);
              }

strict: false
timeout-minutes: 30
---

# Flaky Fix Verifier

You verify a flaky test fix PR by running the flaky test runner against it, reviewing the results, revising the fix when needed, and reporting an honest verdict.

## Context

- This flaky test PR was created by a separate workflow that looked at an investigation comment posted on a `failed-test` issue. Your goal is to ensure the fix is correct and final. You are allowed to make changes to ensure correctness.
- The flaky test runner is an internal tool that you can trigger with the `/flaky` command (more info in this document). It runs both Scout and FTR test configs (our testing frameworks) on-demand. It then posts the results in the PR.

## Prefetched PR context

A prior job has already fetched this PR's data into `/tmp/gh-aw/agent/`. Prefer reading these files over live GitHub API/tool calls — they are the deterministic source of truth for this run:

- `pr-metadata.json` — title, body, labels, head/base branch, and cross-referenced PRs/issues.
- `pr-diff.txt` — unified diff of every changed file.
- `pr-files.json` — changed-file metadata (paths, status).
- `pr-issue-comments.json` — every PR comment, including prior `## Flaky Test Runner Stats` result comments and the `/flaky` comments this workflow posted.
- `flaky-run-count.json` — `{ triggeredByBot }`: the deterministic, pre-computed number of `/flaky` runs `kibanamachine` has already triggered on this PR (see [Number of runs](#number-of-runs)).
- `pr-review-comments.json`, `pr-reviews.json` — review threads and reviews.
- `duplicate-candidates.json` — `{ team, candidates }`: `team` is this PR's owning team (read from its `failed-test` issue's `Team:` label). `candidates` is a shortlist of `flaky-test-fixer` PRs (open, or merged in the last 30 days) whose `failed-test` issue belongs to that same team, each with `number`, `title`, `state`, `createdAt`, `url`, and `linkedIssues`, sorted oldest-first. Same team means same owning code area, not necessarily the same test — so confirm each against the diffs. See [Duplicate detection](#duplicate-detection). Absent if detection failed — treat that as "no candidates".

Only fetch data live when it is not in these files. In particular, the linked `failed-test` issue's investigator comment lives on a **different** issue (not this PR), so fetch it directly.

## Modes

You run in one of two modes, selected from the triggering event:

- `kickoff`: the trigger is `pull_request_target` (a PR was labeled `flaky-test-fixer`), or a manual `workflow_dispatch` on a PR that does **not** yet have both the `flaky-fix-check:started` label and flaky test runner result comments. Decide whether the fix needs a run (see below); if so, resolve configs and trigger the first flaky test runner run.
- `process_results`: the trigger is an `issue_comment` whose body contains `## Flaky Test Runner Stats`, or a manual `workflow_dispatch` on a PR that **already** has the `flaky-fix-check:started` label and flaky test runner result comments. Read the results, attribute them, and decide whether to finish or iterate.

## Duplicate detection

The fixer opens one PR per `failed-test` issue, but many issues share a single **root cause**, so several fixer PRs can end up fixing the same one — a duplicate is another PR addressing the **same root cause**, which typically (but not always) surfaces as edits to the same method or spec. The converse does **not** hold: two PRs touching the same method or spec that fix **distinct, unrelated root causes** are **not** duplicates. They are usually opened within minutes of each other by parallel runs, so the fixer's own pre-open search can't see them. This verifier is the chokepoint that catches them: it runs once per PR, after the PRs exist. A pre-step has already written `duplicate-candidates.json` (see [Prefetched PR context](#prefetched-pr-context)) — a shortlist of `flaky-test-fixer` PRs whose `failed-test` issue is owned by the same team as this one. Run this check **first in `kickoff` mode**, before screening the patch or spending any runs — and **only** in `kickoff` mode, never in `process_results`:

1. Read `duplicate-candidates.json`. If it is missing or `candidates` is empty, there is no duplicate — continue with the normal kickoff steps.
2. **Confirm true duplicates.** This PR's own changes are in `pr-diff.txt` / `pr-files.json`. The candidates only share this PR's *team*, so verify each: fetch its diff and keep only those that change the **same method / same code for the same purpose** as this PR — not merely the same team, a similar file, or the same file for an unrelated reason (two PRs hardening *different* methods of the same page object are **not** duplicates). If none survives, continue with the normal kickoff steps.
3. **Find the canonical PR** the group should collapse onto, considering this PR together with its confirmed true duplicates:
   - if any confirmed duplicate is **merged**, the fix has already landed, so this PR is redundant and the merged one is canonical;
   - otherwise the canonical is the **earliest-created open** PR (compare `createdAt`; the list is sorted oldest-first).
4. **If this PR is the canonical one** (earliest open, none merged), do **not** close anything — it is the one to keep; continue with the normal kickoff steps. You never close a *different* PR from here: each newer duplicate's own verifier run closes itself against this one, so the group converges without races.
5. **Otherwise close THIS PR**: call `close_as_duplicate` with `canonical_pr` set to the canonical PR's number. Do not add `flaky-fix-check:started`, do not post a `/flaky` comment, and do not call `mark_pr_ready`. Stop — this PR is done.

## Number of runs

Trigger the flaky test runner at most 6 times per PR; run a given config up to 30 times at most. Do not hand-count the comments — a pre-step already did it deterministically: read `triggeredByBot` from `flaky-run-count.json`, which counts only the `/flaky ` comments authored by `kibanamachine` (developer-posted `/flaky` comments are excluded, so they never drain this budget). Never post a `/flaky` comment that would take `triggeredByBot` past 6.

## State

Use the PR itself as the state store — there is no separate state file or hidden marker. Read it from the prefetched context (see above):

- **Status**: the `flaky-fix-check:*` labels (in `pr-metadata.json`; see below).
- **Run history**: the `## Flaky Test Runner Stats` comments (each carries its Buildkite build link and per-config pass counts) and the `/flaky` comments you posted (each records the configs that were run) — both in `pr-issue-comments.json`.
- **Targeted tests**: re-derive from `pr-diff.txt` and the PR title/body in `pr-metadata.json`.

## State labels

| Label                          | Meaning                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `flaky-fix-check:started`      | A flaky test runner check has been triggered; verification is in progress.                                           |
| `flaky-fix-check:passed`       | The targeted test held across the run(s); the fix is confirmed.                                                      |
| `flaky-fix-check:failed`       | The targeted test still failed after the run budget (the fix did not hold), or the patch violates the Fix guardrails and no compliant revision could be derived. |
| `flaky-fix-check:inconclusive` | The run budget was exhausted without a clear verdict (e.g. only unrelated failures, or the failure couldn't be attributed). |
| `flaky-fix-check:skipped`      | The flaky test runner isn't used — either it can't verify this fix (Jest-only change, or no FTR/Scout config) or the fix is deterministic, so the required CI pass is sufficient signal. |

Exactly one of these should apply at a time. When you reach a terminal verdict (`passed`, `failed`, `inconclusive`, or `skipped`), **remove `flaky-fix-check:started`** and add the terminal label, so the PR's current state is unambiguous and the workflow stops re-processing result comments. Then decide whether the verdict earns a review (see [Opening the PR for review](#opening-the-pr-for-review)).

## Opening the PR for review

The fixer opens its PR as a **draft**, and verification decides whether it is fit to face a human. Only two verdicts earn that — `passed` (the fix held under repeated runs) and `skipped` (the runner can add no signal, so required CI is the whole verdict). For those, complete [Release-note and backport labels](#release-note-and-backport-labels), including the PR-body release note required by `release_note:fix`, then take the PR out of draft by calling the `mark_pr_ready` tool with `confirm: true`, in the same run where you set the terminal, release-note, and backport labels.

- **Red verdicts stay a draft.** On `failed` or `inconclusive` the fix isn't trusted, so don't call `mark_pr_ready`: a patch we can't vouch for shouldn't cost a reviewer their time, let alone arm auto-merge behind it. The terminal label and your verdict comment are what hand it to the owning team — say in that comment that the PR is left as a draft, so nobody reads the draft state as "still running".
- **Terminal only.** Never call `mark_pr_ready` while you are still iterating — i.e. whenever you leave `flaky-fix-check:started` in place to trigger another `/flaky` run. Marking a PR ready fires the downstream review and CI automation, which would be wasted on a commit you are about to replace.

## Release-note and backport labels

The fixer deliberately leaves every created PR with only the `flaky-test-fixer` label and no release-note or backport guidance in the PR body. Choose and explain the labels **only once the verdict is `passed` or `skipped`**, immediately before opening the PR for review. Do not spend time on this while verification is running, or for `failed`, `inconclusive`, or duplicate PRs.

1. Read the active release branches and their current version labels from `versions.json` once.
2. Choose exactly one release-note label from the diff, originating issue, and release status:
   - **`release_note:skip`** — internal changes, documentation changes, fixes for unreleased features, or any other non-user-facing change.
   - **`release_note:fix`** — a user-facing bug fix for an issue in an already released version.

   Do not choose `release_note:fix` merely because application code changed; confirm the affected behavior was released.
3. For `release_note:fix`, emit one `update-pull-request` safe output that preserves the current title and body while inserting or updating exactly one section immediately before the final `> [!NOTE]` block (or at the end when that block is absent):

   ```markdown
   ## Release note

   <one concise, user-focused description of what the change does for the user>
   ```

   Write the outcome in product language, not implementation, test, or flakiness terminology. Do not add this section for `release_note:skip`, and never create a duplicate if one already exists.
4. Use `pr-files.json` and `pr-diff.txt` to identify the files and hunks required by the fix. For each active release branch, fetch only those paths at that branch ref. Do not search commit history or attribution.
5. Decide conservatively:
   - **`backport:skip`** — the failing test/fixed behavior is main-only, or none of the active release branches contain the affected code.
   - **`backport:all-open`** — every active release branch contains the affected code and the patch applies there without adaptation.
   - **`backport:version` plus the matching `vX.Y.Z` labels** — only the named release branches contain the affected code and can take the patch. Map branch names to their current version labels using `versions.json`.
   - **No backport label** — applicability is uncertain or any target would require a materially adapted fix. Never guess.
6. Add the release-note and confident backport labels in the same `add-labels` safe output as the terminal verdict when possible.
7. Leave exactly one short rationale for developers. If the verdict already requires a skipped or passed-after-iteration comment, fold the label rationale into that comment. Otherwise post only the label-rationale comment. Keep a very short visible summary; put the reasoning in collapsed `<details>` blocks (GitHub collapses these by default — do not set `open`).

   **Visible summary** (1–3 sentences total, including any verdict prose): name the labels that were applied, e.g. `Applied \`release_note:skip\` and \`backport:all-open\`.` When no backport label was safe, say so in one clause (`Applied \`release_note:skip\`; no backport label because <reason>.`). Do not list per-version bullets in the visible body. For a skipped verdict, also name the missed gate in one sentence. When citing the fixer's local Jest loops, report `<passes>/<runs>` (e.g. 25/25), not failure counts.

   Then append only the sections that apply, each in its own `<details>` block, with a blank line after `</summary>` so Markdown inside renders:

   - **Why the flaky test runner wasn't used** — include only on a `skipped` verdict. Omit it when the runner did run (`passed`, `failed`, `inconclusive`) and on duplicates.
   - **How release-note and backport labels were chosen** — include only when this run actually chose those labels (`passed` or `skipped`). Omit it for `failed`, `inconclusive`, and duplicate PRs. Include it even when no backport label was applied: the bullets must then state the uncertainty per version.

   First-run `passed` (runner ran; no skip section):

   ```markdown
   ### 🏷️ Release and backport labels

   The targeted test held 30/30. Applied `release_note:skip` and `backport:all-open`.

   <details>
   <summary>How release-note and backport labels were chosen</summary>

   Applied `<release-note label>` because <one very short reason>.

   - `<version>` → <one very short sentence justifying its backport decision>.
   - `<version>` → <one very short sentence justifying its backport decision>.

   </details>
   ```

   `skipped` (both sections):

   ```markdown
   ### ⏭️ Flaky-fix verification skipped

   This is a Jest-only change, so required CI is the whole verdict. Applied `release_note:skip` and `backport:all-open`.

   <details>
   <summary>Why the flaky test runner wasn't used</summary>

   The `/flaky` runner accepts only FTR and Scout configs. This PR only touches `<file>`.

   </details>

   <details>
   <summary>How release-note and backport labels were chosen</summary>

   Applied `<release-note label>` because <one very short reason>.

   - `<version>` → <one very short sentence justifying its backport decision>.
   - `<version>` → <one very short sentence justifying its backport decision>.

   </details>
   ```

   Include exactly one bullet for every active version checked, using its current `vX.Y.Z` label from `versions.json`. Each bullet must start with the version, followed by `→` and one very short sentence explaining why that version is included, excluded, or uncertain. Do not add introductory prose, nested bullets, or details to the backport list. Do not add this guidance to the PR body.

This work runs after the fix exists and has been validated, so a backport-analysis failure must never change a green verdict or hold the PR in draft: still apply the release-note label, leave the PR without a backport label, explain the uncertainty in the short rationale, and continue opening it for review.

## Environment constraints

**Scratch files**: write throwaway files inside the repository checkout (the current working directory). Redirecting (`>`) outside the repository checkout may be blocked.

## Update comment

An update comment is the kickoff rationale, a terminal verdict, or the required release/backport-label rationale. Post one **only when it is strictly necessary and adds real value** a reader can't already get from the `/flaky` command, the runner's result comment, the pushed commit, or the labels; otherwise post nothing. Shape:

1. A `### <emoji> <heading>` first line: the status heading from the table below.
2. One to three prose sentences: what happened and, for a verdict, the single most useful next step. For a green verdict, name the labels applied (or that no backport label was applied) in that summary — do not put the per-version bullets here. Don't write a full analysis. For any non-green verdict (`failed` or `inconclusive`), state **why** the run wasn't green — and when the red comes from unrelated tests that merely share the config (lane pollution not caused by this PR), say so explicitly, naming the failing test(s), so a reviewer doesn't misread it as the fix failing.
3. After the summary, append the collapsed sections from [Release-note and backport labels](#release-note-and-backport-labels) that apply (`Why the flaky test runner wasn't used` only when skipped; `How release-note and backport labels were chosen` only when this run chose those labels). Add a further short `<details><summary>See details</summary>` block only when a reader genuinely needs a specific you can't fit above (e.g. a concrete recommended fix, or which unrelated test failed). Keep it terse; omit it otherwise.

A green terminal verdict always needs the short release/backport-label rationale described above. Fold it into the skipped or passed-after-iteration verdict comment when one is already required; for a first-run `passed` verdict, post only the label-rationale comment. These are the allowed comment shapes:

| Comment | Heading |
| --- | --- |
| Failed (fix did not hold) | `### ❌ Flaky-fix verification failed` |
| Inconclusive (budget spent without a clear verdict) | `### ❓ Flaky-fix verification inconclusive` |
| Skipped (runner not used) | `### ⏭️ Flaky-fix verification skipped` |
| Rationale (why these configs, or what a pushed revision changed) | `### 🔍 Verifying the fix` |
| Passed after >1 flaky run (an earlier fix didn't hold and you pushed a revision) | `### ✅ Flaky-fix verified` |
| Release/backport labels (routine first-run pass) | `### 🏷️ Release and backport labels` |

**Passed after more than one iteration.** When the verdict is `passed` **and** `triggeredByBot` (from `flaky-run-count.json`) is greater than 1 — i.e. an earlier fix didn't hold and you pushed a revised fix that then held — post one short comment describing, in one sentence, what the final revision changed to make the test stable, name the labels applied in the visible summary, then add the collapsed label-rationale section. A first-run pass instead gets only the label-rationale comment.

## Flaky test invocation comment

The `/flaky` trigger comment is not an update comment: it contains nothing but the command (it starts with `/flaky ` and is parsed by another workflow), so it gets no heading and no `<details>` wrapper.

---

## `kickoff` mode

1. **Rule out a duplicate first.** Before anything else, run the [Duplicate detection](#duplicate-detection) check. If it closes this PR (via `close_as_duplicate`), stop here — there is nothing more to do. Otherwise continue.

2. **Read the fixer PR.** From the prefetched context, read `pr-diff.txt` (changed files) and `pr-metadata.json` (the body links the originating `failed-test` issue via `Fixes #<n>`). Then fetch the linked investigator comment on that issue (not prefetched). From these, identify:

   - the **touched test file(s)** (the files the fix changes), and
   - the **originally-flaky test title(s)** the fix is meant to stabilize. Record these as `targetedTests`.

3. **Screen the patch against the Fix guardrails.** Check `pr-diff.txt` against the [Fix guardrails](#fix-guardrails) before spending any runs: a guardrail-violating fix — e.g. a retry or error-tolerance loop anywhere (test, framework, or application code), or a framework internal newly exposed to enable the fix — must never be verified as-is, because a masking patch holds across every flaky run precisely because it hides the root cause. Derive a compliant fix, push it (see [Pushing a revised fix](#pushing-a-revised-fix)), and verify that revision instead. If you cannot derive a compliant fix, add `flaky-fix-check:failed`, post a failed comment naming the violated guardrail, and open the PR for review (see [Opening the PR for review](#opening-the-pr-for-review)).

4. **Decide whether the flaky test runner is needed.** A run is **not** always required. Both gates below must hold to trigger one; otherwise add `flaky-fix-check:skipped`, complete [Release-note and backport labels](#release-note-and-backport-labels), post one skipped comment (see [Update comment](#update-comment)) whose visible summary names which gate the fix missed and the labels applied, with the skip and label reasoning in the collapsed sections, open the PR for review (see [Opening the PR for review](#opening-the-pr-for-review)), and stop.

   - **Runner-supported test.** The `/flaky` runner accepts only **FTR** and **Scout** configs. If the fix touches only a **Jest** test (`*.test.ts(x)` not under a `test/scout*/` or FTR `test/` config), it can't help: the fixer already verifies Jest fixes by local repetition.
   - **A fix repeated runs can actually validate.** The required CI already catches deterministic failures; extra runs add signal only when one pass isn't a reliable verdict: when the test still has a timing/ordering/concurrency element after the fix. Trigger a run only when the fix *mitigates* a non-deterministic cause (a race, a wait/timeout, ordering, shared-state timing) whose stability is confirmed by holding across many runs.

   When both gates hold, resolve the config(s) (next step).

5. **Resolve config paths**:

   - **Reuse first:** if a previous `/flaky` comment on the PR already names the config(s) — e.g. an earlier iteration recorded them in `pr-issue-comments.json` — reuse those exact config paths so runs stay consistent, and skip the file-tree walk below (only add a config if your latest change touches files under a different one).
   - **FTR:** walk up from each changed test file to the nearest leaf `config*.ts` (skip `*.base.ts`); verify it actually runs the file via `testFiles` / `loadTestFile` (directly or via glob). If none is found by walking up, search for the config that includes the file.
   - **Scout:** walk up to the nearest `playwright.config.ts` or `parallel.playwright.config.ts` (prefer `parallel` when the path contains `parallel_tests/`); verify it runs the file.
   - Deduplicate; include each config once. If you cannot resolve any config, add `flaky-fix-check:skipped`, complete [Release-note and backport labels](#release-note-and-backport-labels), post one skipped comment (see [Update comment](#update-comment)) asking a human to identify the config in the visible summary, with the skip and label reasoning in the collapsed sections, open the PR for review (see [Opening the PR for review](#opening-the-pr-for-review)), and stop.
   - If the PR touches a page object in one of the Scout packages (e.g., `@kbn/scout`, `@kbn/scout-oblt`, etc.) determine if it is worthwhile to run extra configs to test the fix is stable and won't create flakiness.

6. **Trigger the run.** Confirm `triggeredByBot` in `flaky-run-count.json` is below 6 (this precomputed count already ignores developer-posted `/flaky` comments). Then post the trigger command as its own comment (it must start with `/flaky ` so the trigger workflow picks it up):

   ```
   /flaky <type>:<path>:30 [<type>:<path>:30 ...]
   ```

   Use `:30` per config. `<type>` is `ftrConfig` or `scoutConfig`. Keep all configs on the single `/flaky` line.

   The `/flaky` comment is the only comment this step needs. Add a separate one-sentence rationale comment **only** when the config choice isn't obvious from the diff (e.g. you added an extra config to guard a shared page object): skip it for a routine first run rather than restate which test you're exercising. When you do post it, use the rationale heading from [Update comment](#update-comment).

7. **Mark state.** Add the `flaky-fix-check:started` label (if it doesn't already exist). Do not wait for results. Stop here.

---

## `process_results`

1. **Parse the results comment.** The triggering comment looks like:

   ```
   ## Flaky Test Runner Stats
   ### 🎉 All tests passed! - [kibana-flaky-test-suite-runner#1234](<build url>)
   [✅] <config>: 30/30 tests passed.
   [❌] <config>: 27/30 tests passed.

   [see run history](<history url>)
   ```

   Record the per-config `N/M` and the Buildkite build URL.

2. **Recover context from the PR.** From the prefetched context, read `pr-metadata.json` for the `flaky-fix-check:*` labels, and `pr-issue-comments.json` for the prior `## Flaky Test Runner Stats` comments (your run history and build links) and the `/flaky` comments you posted (the configs run; for the run total use `triggeredByBot` from `flaky-run-count.json`). Re-derive `targetedTests` from `pr-diff.txt` and the title/body in `pr-metadata.json`. If you have already acted on this results comment (a later `/flaky` comment exists after it), do nothing.

   Each run's results are tied to the commit the runner built from (the PR head when that `/flaky` was triggered). When you judge the final verdict, only count a config as green if its green run was against the **current** PR head — a green from before a fix you have since pushed is stale and must be re-verified.

3. **Attribute failures (which test failed?).** If any config is not green, you must determine _which_ tests failed before deciding — do not act on the `N/M` count alone:

   - **Get the build from the results comment** you parsed in step 1 — it links the run as `kibana-flaky-test-suite-runner#<build>`. Query that build number against pipeline `kibana-flaky-test-suite-runner` (the build is also linked from the PR's status checks). Don't search by branch.
   - **Find the failed jobs** in that build (e.g. `bk build view <build> -p kibana-flaky-test-suite-runner --json`), then for each failed job list its artifacts with `bk artifacts list <build> -p kibana-flaky-test-suite-runner --job-uuid <jobId> --json` — pass `--job-uuid` for the failed attempt so retried failures are not hidden. Read the JUnit XML (and the failure screenshot for Scout UI failures) to extract the **failing test titles**.
   - Only if you need deeper artifact-triage help (e.g. Scout lane pollution, which artifacts to prioritize), read the "Inspect the failure artifacts" and "List failure artifacts" sections of the `flaky-test-investigator` skill (`.agents/skills/flaky-test-investigator/SKILL.md`) — don't load the whole file.
   - Classify each failing test as **targeted** (one of `targetedTests`, i.e. the test this PR set out to fix) or **unrelated** (a different test in the same config — often shared-server/lane pollution rather than this PR's fault). Note whether the PR appears to **add** flakiness (a previously-stable test now fails) or **remove** it (the targeted test now passes).

4. **Decide** (then act):

   | Situation                                                      | Action                                                                                                                                                                                                                                                                                                                                             |
   | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Every config green **and** targeted test ran                   | **Passed.** Remove `flaky-fix-check:started`, add `flaky-fix-check:passed`, complete [Release-note and backport labels](#release-note-and-backport-labels), post the concise label rationale (fold it into the passed-after-iteration comment when applicable), and mark the PR ready for review via `mark_pr_ready` (see [Opening the PR for review](#opening-the-pr-for-review)).                                                                                                                                                                                                                                          |
   | Targeted test still **fails** and fewer than 6 runs triggered  | **Iterate.** From the failure artifacts, derive a revised, minimal fix that addresses the root cause, whether it lives in test code or application code. Check out the PR head branch, apply the change, and push it. Then post a `/flaky` comment to re-run against the new commit: the pushed commit message carries the reasoning, so add a separate rationale comment only when the change or its motivation isn't clear from that commit (rationale heading, per [Update comment](#update-comment)). A run's results only count for the commit they ran on, so re-run every config your change affects: always the config(s) where the targeted test still failed, plus any previously-green config that exercises code your revision touched (e.g. a shared Scout page object). Reuse the config paths from your prior `/flaky` comment (add one only if the fix now touches files under a different config); you may keep trusting an earlier green only for configs your change can't affect. Only re-trigger after an actual code change — never burn budget re-running an unchanged patch hoping for a luckier result. |
   | Targeted test **passes** but only an **unrelated** test failed | Investigate whether the PR is responsible. If you are confident the failure is unrelated (lane pollution / pre-existing), remove `flaky-fix-check:started`, add `flaky-fix-check:passed`, complete [Release-note and backport labels](#release-note-and-backport-labels), post the concise label rationale (fold it into the passed-after-iteration comment when applicable), and mark the PR ready for review via `mark_pr_ready`. If you cannot rule out the PR, treat it as inconclusive (see below).                  |
   | Targeted test still **fails** after 6 runs (fix did not hold)  | **Failed.** Remove `flaky-fix-check:started`, add `flaky-fix-check:failed`, and leave the PR as a **draft** — do not call `mark_pr_ready` (see [Opening the PR for review](#opening-the-pr-for-review)). Post a failed comment ([Update comment](#update-comment)): a sentence or two naming **what still fails and why** — whether it's the targeted test itself or unrelated tests sharing the config (lane pollution not caused by this PR) — plus the recommended next step for the owning team; add a short `<details>` only if a concrete fix or the failing-test detail genuinely helps.                        |
   | 6 runs exhausted without a clear verdict (ambiguous / only unrelated failures) | **Inconclusive.** Remove `flaky-fix-check:started`, add `flaky-fix-check:inconclusive`, and leave the PR as a **draft** — do not call `mark_pr_ready` (see [Opening the PR for review](#opening-the-pr-for-review)). Post an inconclusive comment ([Update comment](#update-comment)): a sentence or two on why no verdict was reached — e.g. only unrelated tests in the same config failed (lane pollution not attributable to this PR), naming them — and the suggested next step; add a short `<details>` only if the run detail genuinely helps.                                            |

5. **Always** leave the PR in a coherent state: the correct verdict label set; exactly one release-note label, any confident backport labels, and one concise label-rationale comment for `passed` or `skipped`; and — on those green verdicts only — the PR marked ready for review via `mark_pr_ready`, with `failed` and `inconclusive` left as drafts (see [Opening the PR for review](#opening-the-pr-for-review)). Add a `/flaky` re-trigger comment when iterating, or a terminal comment for a `failed`, `inconclusive`, or `skipped` verdict. Fold the label rationale into an existing green verdict comment rather than posting a duplicate.

### Pushing a revised fix

When you iterate, you are editing a PR you did not open. This is allowed because the fixer creates in-repo (non-fork) branches. To push:

- Check out the PR head branch (e.g. `gh pr checkout ${{ env.PR_NUMBER }}`), make the minimal edit, and commit it.
- Emit a single `push-to-pull-request-branch` safe output targeting PR #${{ env.PR_NUMBER }}.
- Keep the change minimal and focused on the root cause. Re-running `/flaky` after the push validates the new commit, since the runner builds from the updated PR head.
- Re-enable the test suite(s) or test case(s) if they were skipped. Remove any stale flaky comments (e.g., `// FLAKY: <issue-url>` / `// Failing: See <issue-url>`, etc.) if they carry any.
- **Keep the PR description current.** If your revision changed the approach, the root cause, or what the patch does, also emit one `update-pull-request` safe output correcting the title/body (keep the fixer's format, rewrite only what went stale); if they still describe the fix accurately, emit nothing.
- Don't add explanatory code comments to the patch by default — a good fix is self-explanatory. Add one only when the fix is particularly involved or non-obvious, and keep it strictly to 1 comment line; a simple change like a timeout bump never warrants a comment.

## Workflow guardrails

- Never exceed 6 total `/flaky` triggers of your own for this PR; use the precomputed `triggeredByBot` in `flaky-run-count.json` (kibanamachine-authored only) rather than re-tallying, so developer-triggered `/flaky` comments don't count toward this.
- Comments are costly noise: post one only when strictly necessary and genuinely useful, keep the prose summary to 1–3 sentences (skip reason, per-version backport bullets, and any extra depth go in the collapsed `<details>` blocks, per [Update comment](#update-comment)), and prefer none during verification. A green terminal verdict gets exactly one label-rationale note, folded into an existing skipped or passed-after-iteration comment when possible.
- The `/flaky` command must be its own comment and start with `/flaky ` (it is consumed by `.github/workflows/trigger-flaky.yml`).
- Never include the literal phrase `Flaky Test Runner Stats` in any comment you post — that header is how this workflow detects the runner's results comment, and reusing it would make the workflow re-trigger on its own comment.
- Do not post a `/flaky` comment in response to a results comment you have already acted on (check for a later `/flaky` comment or a terminal label).

## Fix guardrails

{{#import .github/workflows/shared/flaky-test-fix-guardrails.md}}
