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
  status-comment: true

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
  checks: read
  models: read

if: "${{ (github.event_name == 'workflow_dispatch' && github.event.inputs.issue_number != '') || (github.event_name == 'issues' && github.event.action == 'labeled' && github.event.label.name == 'ai:fix-flaky' && !github.event.issue.pull_request) }}"

concurrency:
  # Keep one fixer lane per issue for the real trigger. Every other label event (e.g. the
  # sibling `failure:*` labels the investigator applies in the same batch as `ai:fix-flaky`)
  # gets its own group suffix, so it can skip without canceling a pending or in-flight fix run.
  group: >-
    flaky-test-fixer-${{ github.event.issue.number || github.event.inputs.issue_number }}-${{
      (
        github.event.action == 'labeled' &&
        github.event.label.name != 'ai:fix-flaky' &&
        github.event.label.name
      ) ||
      'fix'
    }}
  cancel-in-progress: false
  job-discriminator: ${{ github.event.issue.number || github.event.inputs.issue_number }}

env:
  ISSUE_NUMBER: &issue_number ${{ github.event.issue.number || github.event.inputs.issue_number }}
  # Whoever triggered this run: the user who applied `ai:fix-flaky`, or the manual dispatcher.
  REQUESTED_BY: ${{ github.actor }}
  # Lets the agent omit `-o elastic` on every `bk` invocation when re-investigating.
  BUILDKITE_ORGANIZATION_SLUG: elastic

imports:
  - .github/workflows/buildkite-cli-setup.md
  - .github/workflows/shared/app-dex-agents-otel.md

engine:
  id: claude
  version: '2.1.165'
  model: opus
  max-turns: 200
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
    toolsets: [default, search]
  web-fetch:
  bash: true

# Bootstrap Kibana on the self-hosted runner, in a pre-agent step that runs on the
# host (before `awf` starts the sandboxed agent), so `node_modules` and
# `@kbn/setup-node-env` exist so the agent can lint the fix and run any Jest tests.
runs-on: kibana
steps:
  - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
    with:
      node-version-file: '.nvmrc'
      cache: yarn
  - name: Bootstrap Kibana
    run: yarn kbn bootstrap
  - name: Expose Kibana's Node.js path to the agent
    # the sandbox rebuilds PATH from every `bin` dir under RUNNER_TOOL_CACHE, so the agent's
    # `node` is whichever version the runner cached first, not the one setup-node just
    # picked, and `node scripts/*` then trips Kibana's version guard. Pass the resolved path
    # through so the agent can fix PATH itself instead of via `nvm` (mirrors are firewalled).
    run: |
      KBN_NODE_BIN="$(dirname "$(command -v node)")"
      echo "KBN_NODE_BIN=$KBN_NODE_BIN" >> "$GITHUB_ENV"
      echo "Pinned Node for the agent: $KBN_NODE_BIN ($("$KBN_NODE_BIN/node" --version))"
  - name: Detect duplicate fix PRs
    # Shortlist the `flaky-test-fixer` PRs whose `failed-test` issue is owned by the same
    # team as this issue, so the agent can spot an already-in-flight fix and bail out before
    # spending a full run. Non-fatal: a detection failure must not block the fix — the agent
    # treats a missing file as "no duplicate".
    uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
    with:
      script: |
        const { writeDuplicateCandidates } = require('./.github/scripts/find_duplicate_fix_prs.js');
        try {
          await writeDuplicateCandidates({ github, core, issueNumber: Number(process.env.ISSUE_NUMBER) });
        } catch (err) {
          core.warning(`Duplicate detection failed: ${err.message}`);
        }

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

safe-outputs:
  activation-comments: true
  report-failure-as-issue: false
  messages:
    run-started: 'The flaky test fixer is investigating this issue. Follow progress in [{workflow_name}]({run_url}).'
    run-failure: 'The flaky test fixer failed before it could report an outcome. Review [{workflow_name}]({run_url}), then remove and reapply `ai:fix-flaky` to retry.'
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
    # `main` only: any other base makes the handler run an unbounded `git fetch` that
    # can't finish on a repo Kibana's size. Version-branch fixes are handed over in the
    # outcome comment instead — see "Fixes that must target a version branch".
    allowed-base-branches: ['main']
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
max-ai-credits: 1200
---

# Flaky Test Fixer

Open a single draft PR with the smallest possible fix for this flaky-test issue. Fix the root cause where it lives — test code or application code; don't mask a product bug with a test-side workaround. Do not open a PR if any of the following is true:

- a PR already addresses this root cause (open or merged) — see [Duplicate detection](#duplicate-detection), which runs first as step 1;
- you cannot identify a credible fix within the [Fix guardrails](#fix-guardrails) — a patch that only works by violating them (e.g. by retrying or tolerating the failure instead of fixing it) is not a credible fix; or
- the fix has to target a version branch (see "Fixes that must target a version branch").

Whatever the outcome, always finish by leaving one concise comment on the issue (see "Outcome comment").

## Requester mention

`${{ env.REQUESTED_BY }}` triggered this run — the user who applied `ai:fix-flaky`, or the manual dispatcher. @-mention them (`@${{ env.REQUESTED_BY }}`) in both the outcome comment and the PR body so they get pinged to review the outcome and the fix, but **only if it is a real user account**: if `${{ env.REQUESTED_BY }}` ends with `[bot]` or is `kibanamachine`, omit the mention (and the "Requested by" line) entirely.

## Duplicate detection

Many `failed-test` issues share a single **root cause**, so the fixer can open several PRs that all fix it — usually within minutes of each other, by parallel runs. A duplicate is another PR addressing the **same root cause**, which typically (but not always) surfaces as edits to the same method or spec. The converse does **not** hold: two PRs touching the same method or spec are **not** duplicates when they fix **distinct, unrelated root causes**. Before doing any work, rule out that a fix for *this* root cause is already in flight:

- A pre-step wrote `/tmp/gh-aw/agent/duplicate-candidates.json` (`{ team, candidates }`): `team` is this issue's owning team (from its `Team:` label). `candidates` is a shortlist of `flaky-test-fixer` PRs (open, or merged in the last 30 days) whose `failed-test` issue belongs to that same team, each with `number`, `title`, `state`, `createdAt`, `url`, and `linkedIssues`, sorted oldest-first. Read it first.
- Same team means same owning code area, not the same test — so **open each candidate's diff** and treat it as a real match only when it addresses the **same root cause / same method for the same purpose** as this issue's failing test — not merely the same team, a similar file, or the same file for an unrelated reason (a different method of the same page object is not a duplicate).
- If this issue has no `Team:` label, `candidates` falls back to only the PRs already closing this exact issue.
- If a real match exists (open, or already merged), **do not open a PR**: post the "Existing PR already covers it" outcome comment naming that PR, remove the `ai:fix-flaky` label (step 9), and stop. If you **cannot confirm** a true duplicate, proceed and open the PR — the downstream Flaky Fix Verifier is the backstop that closes any real duplicate that slips through, whereas a flake you wrongly skip here just goes unfixed.

## Environment

Kibana is already bootstrapped for you. Kibana's pinned Node is in `$KBN_NODE_BIN` — put it on PATH in every Bash call that runs `node` or `yarn`, since each call starts a fresh shell:

```bash
export PATH="$KBN_NODE_BIN:$PATH"
```

Don't use `nvm`; it can't reach the Node mirrors from here.

The `bk` (Buildkite) CLI is installed and authenticated and `BUILDKITE_ORGANIZATION_SLUG` is `elastic`, so you can inspect CI builds and download failure artifacts (JUnit XML, screenshots, server logs) when you need to re-investigate. Use the exact `bk artifacts list` / `bk artifacts download` recipes in the [`flaky-test-investigator` skill](#validate-the-investigation-is-current) — don't rediscover the CLI syntax by trial and error.

## Working efficiently

This run has a fixed AI-credit budget, and every tool result you read stays in the context that is re-sent on every subsequent turn — so a bloated context makes the whole run more expensive and can exhaust the budget before you finish. Keep the working set small:

- **Read each file once, in the smallest useful slice.** Prefer a ranged read or a targeted `grep` over dumping a whole file, and never re-read or re-download a file you already have — after you edit a file, trust the returned state instead of reading it back.
- **Don't pull large or binary artifacts into context.** Describe a failure screenshot from its metadata rather than loading the image, and `grep`/`sed` a big log for the failure timestamp instead of reading it end to end. Fetch only the specific artifacts you will actually use.
- **Don't repeat a check whose inputs haven't changed.** A lint or search returns the same result until you edit the code it inspects, so re-running it just burns budget — reuse the result you already have, and never loop a command hoping for a different outcome. (The repeated runs in [Verifying a Jest fix](#verifying-a-jest-fix) are the deliberate exception: they measure flakiness, not a fixed result.)

## Steps

1. **Rule out a duplicate.** Before any investigation, run [Duplicate detection](#duplicate-detection). If a fix for this root cause is already in flight (or already merged), **do not open a PR** — skip straight to step 8 (outcome comment) and step 9 (remove label).
2. **Establish a current root-cause analysis.** Read the failed-test investigator's comment(s) on the issue for the suspected root cause and proposed fix, and note the most recent one's permalink, timestamp, any relevant PR/commit history and its precise causal role, and where the failures happened, so you can cite them in the PR's Context section. **Do not treat that comment as ground truth**: a prior analysis can be based on stale data or superseded guidance, and building on a stale diagnosis is a top cause of fixes that don't hold. Assess whether it is still current and, when it is not, re-investigate from scratch before proposing anything — see [Validate the investigation is current](#validate-the-investigation-is-current). If, after that, no action is needed, skip to step 8.
3. Read the failing test and the helpers, fixtures, and page objects it imports — and the application code the failing assertions exercise, so a product-side root cause isn't missed.
4. Decide where the fix should land. The default target is `main`. But if the failure is on a **version branch** (check the issue's CI data / investigator comment) and `main` already carries the fix, don't target `main` — follow "Fix already on `main`", which decides between recommending a backport of the existing PR and handing over a best-effort fix for the version branch. Neither path opens a PR.
5. Apply the smallest patch that addresses the root cause on the target branch, whether that's in test code or application code, staying within the [Fix guardrails](#fix-guardrails). Re-enable the test suite(s) or test case(s) if they were skipped. Remove any stale flaky comments (e.g., `// FLAKY: <issue-url>` / `// Failing: See <issue-url>`, etc.) if they carry any. Don't add explanatory code comments to the patch by default — a good fix is self-explanatory. Add one only when the fix is particularly involved or non-obvious, and keep it strictly to 1 comment line; a simple change like a timeout bump never warrants a comment.
6. Verify the patch. Lint with `node scripts/eslint <changed files>`, after the PATH export from [Environment](#environment). **Don't type check** — `node scripts/type_check` builds a large project graph and is slow and memory-heavy on this runner (an unscoped run is even OOM-killed with `SIGKILL`), and the PR's CI type-checks the change anyway, so leave that to CI. For a Jest test, repeat it as described in [Verifying a Jest fix](#verifying-a-jest-fix). For an application-side fix, also run the Jest tests nearest the changed code. FTR/Scout tests need a live Elasticsearch + Kibana and cannot be run here.
7. Open the PR (see "PR format" below) without release-note or backport labels. The Flaky Fix Verifier applies both after it validates the PR. If the fix has to land on a version branch rather than `main`, don't open a PR at all — hand it over in the outcome comment instead (see "Fixes that must target a version branch").
8. Post the outcome comment on the issue (see "Outcome comment" below). Do this in every run, whether or not you opened a PR.
9. Remove the `ai:fix-flaky` label from the issue via the `remove-labels` safe output. Do this in **every** run once you have a result — whether you opened a PR, found an existing one, or opened none.
10. **Only if you opened a PR in step 7**, call the `link_fix_pr` tool with `confirm: true`. It runs after the PR and your comment exist and replaces the `%%FIX_PR_URL%%` and `%%FIX_PR_BADGE%%` placeholders in your outcome comment with the PR link and a live PR-state badge. You cannot know the PR number while running (the PR is created afterwards), so leave the placeholders in place and never write the URL, number, or badge yourself — this tool is how they get filled.

## Fix guardrails

{{#import .github/workflows/shared/flaky-test-fix-guardrails.md}}

## Validate the investigation is current

The investigator's comment is a starting hint, not a verdict you can trust blindly — it is a snapshot from when it was written, and both the code and the failure pattern move on. Before you build a fix on it, confirm it still reflects reality. Treat the analysis as **stale** and re-run a complete investigation yourself when **any** of these hold:

- it was posted **more than 1 day ago** (older analyses have drifted from the current code and failure signature more often than not);
- **new failures arrived after it** — e.g. `kibanamachine` "New failure for …" notification comments, or CI-data updates, timestamped later than the analysis. A later failure can mean the symptom has shifted, so the prior root cause may no longer be the operative one; or
- the comment is **absent**, or offers no actionable root cause.

To re-investigate, follow the `flaky-test-investigator` skill at `.agents/skills/flaky-test-investigator/SKILL.md` end to end (read the files in that folder directly; do not invoke the skill).

- Where your fresh conclusion **departs** from the prior comment, say so and why in the PR's Context section.

## Verifying a Jest fix

Run this loop twice: once on the unpatched test, once with the fix applied.

```bash
export PATH="$KBN_NODE_BIN:$PATH"
: > /tmp/gh-aw/agent/jest-durations
fails=0
for i in $(seq 1 25); do
  node scripts/jest <path-to-test-file> --json --outputFile=/tmp/gh-aw/agent/jest-run.json >/dev/null 2>&1 || fails=$((fails + 1))
  node -e 'const a = require("/tmp/gh-aw/agent/jest-run.json").testResults[0]?.assertionResults.find((t) => t.fullName.includes(process.argv[1])); console.log(a ? a.duration : 0)' '<distinctive substring of the test name>' >> /tmp/gh-aw/agent/jest-durations
done
echo "$((25 - fails))/25 passed ($fails failed)"
awk '{total += $1; if ($1 > max) max = $1} END {printf "avg %dms, max %dms\n", total / NR, max}' /tmp/gh-aw/agent/jest-durations
```

- **Run it on the unpatched test first** (`git stash` the patch if you already wrote it). If it never fails there, the flake doesn't reproduce here and a clean post-fix loop proves nothing: say so under "Not verified locally".
- **Report both loops** as pass counts, not failure counts: `<passes>/<runs>` before the fix (avg, max), then the same after — e.g. `21/25` then `25/25`, never `4/25 failed` / `0/25 failed`. Use that on the Jest line of "Verified locally" and in the runtime table. Add under "Not verified locally" that neither loop ran under CI's parallel load.
- **Read the timings, not only the counts.** A patch meant to make the test cheaper — an async step removed, a smaller unit under test, heavy children mocked — must show a clearly lower average, not a few percent. An average that barely moves means the expensive work is still there and the patch only changed how the test waits; that is the shape of Jest fix that comes back. An average that jumps after the patch means it bought reliability by waiting longer, which the body has to justify. A max far above the average means something is still racing. A deliberate timeout bump is the exception: it is not meant to lower the average. Two traps in the durations file — a `0` line means the test name did not match, not a fast run, and a run that crashed adds no line at all, so check you have one line per run.
- **25 runs is the floor**, 50 when a run takes only seconds. A loop this size catches a test that fails every few runs, not one that fails weekly.
- **Any failure in the post-fix loop means the fix did not hold.** Revise the patch and run both loops again.

## PR format

Write the body so a developer can grasp the fix and its root cause at a glance, from the PR alone — without needing to open links or leave the page (links are still welcome for anyone who wants to dig deeper).

- **Branch**: name the PR's source branch `fix/flaky-<issue-number>-<short-kebab-slug>` (e.g. `fix/flaky-275144-host-flow-ingestion-wait`) to keep fixer branches uniform.
- **Title**: `[<Feature>] <concise summary of the fix>`. Prefix by the user-facing area or named project this serves (the `Feature:` / `Project:` a maintainer would triage it under), not the plugin/package folder you edited — e.g. `[Fleet]`, `[Alerting v2]`, `[Chrome Next]`.
- **Body**:
  ```
  Fixes #<issue-number>

  ### Summary
  <a few bullet points: what was failing, and what this patch changes - keep it very concise, every bullet point must be earned>

  <only when the test failed by running past its time budget, add this table right below the Summary, so the numbers are visible without opening Verification. Fill it from the two loops in "Verifying a Jest fix", and name the budget the test failed against (5s unless the file raises it with `jest.setTimeout`):

  | Runtime vs. 5s budget | Passed | Avg | Max |
  | --- | --- | --- | --- |
  | Before fix | 21/25 | 4.6s | 5.0s |
  | After fix | 25/25 | 0.9s | 1.1s |

  Omit the table for every other kind of flake.>

  <when relevant causal history is strongly supported, include this section after the Summary and its runtime table, if present; otherwise omit it entirely>
  ### Relevant history
  - #<relevant-pr>: <one sentence naming the relevant file or symbol changes and their precise causal role>
  <repeat the bullet only for each additional relevant PR>

  ### Context
  <a few bullets of additional context around this flake, in the same concise, high-value style as the Summary — every bullet earned, and omit any you cannot back with real evidence. Cover, where known:
  - a link to the failed test investigator's comment on the issue, flagging whether this patch follows or departs from their proposed fix — and, if you re-investigated because that comment was stale (see "Validate the investigation is current"), say so and summarize what your fresh analysis concluded
  - a one-line recount of where the failures happened — e.g. the CI pipeline/lane and how often/recently — from the issue's CI data and the investigator's comment>

  <details>
  <summary>Verification</summary>

  #### Verified locally

  <one bullet per check you ran on this branch, each prefixed with its status — `✅ Passed:` when it succeeded, `⚠️` when it failed — followed by the exact command in backticks, with any note left outside them, e.g.
  - ✅ Passed: `node scripts/eslint <files>`
  - ✅ Passed: `node scripts/jest <test>`: 21/25 passed before the fix (avg 820ms, max 4.9s), 25/25 after (avg 890ms, max 1.0s)
  - ⚠️ `node scripts/jest <test>`: 1 assertion still failing (<one-line reason>)>

  #### Not verified locally

  <bullet list of what you could not verify and why. E.g., behavior under CI parallel load, on a different stack version, against a real Elasticsearch instance, etc. Omit this section if there is nothing to mention.>

  </details>
  ```

The first line links only the failed-test issue. When supported, the **Relevant history** section follows the Summary (and its runtime table, when present) and precedes Context; it links the one PR, or small set of PRs, needed to understand how the flake became possible or observable:
- Write exactly one bullet and one sentence per PR. Name the relevant file(s), component, helper, assertion, or API that changed and state the PR's precise causal role — e.g. introduced the faulty behavior, exposed a pre-existing issue, or supplied a prerequisite change.
- Use `git log` / `git blame` only as evidence to investigate, never as proof that the author or last person to touch the file caused the flake. Omit the entire section when the causal link is ambiguous or no PR materially helps explain it.
- Never name, `@`-mention, or request review from the linked PR authors. Describe each PR's precise causal role in the Relevant history section without assigning personal responsibility.
- Add more `Fixes #<issue-number>` references if this fix resolves multiple issues.

Add the following at the very end of the PR description (and outside of the details block):

```markdown
> [!NOTE]
> Requested by @${{ env.REQUESTED_BY }}. Share feedback in #kibana-qa. Mention `@copilot` to make quick changes.
```

(Per "Requester mention", drop `Requested by @${{ env.REQUESTED_BY }}.` from the NOTE if the requester is a bot or `kibanamachine`, leaving the rest of the NOTE.)

## Release-note and backport labels

Do not research, choose, or apply release-note or backport labels for a PR opened by this workflow. The Flaky Fix Verifier handles both after verification, adds a user-focused `## Release note` section for `release_note:fix`, and leaves its label rationale in a collapsed PR comment section; label guidance does not belong in the PR body.

The only exception is a failure that must be fixed directly on a version branch and therefore cannot produce a `main` PR for the verifier. In that no-PR hand-off, use `release_note:skip` for internal changes, documentation changes, fixes for unreleased features, or other non-user-facing changes; use `release_note:fix` for user-facing bug fixes to already released versions. For `release_note:fix`, include a `## Release note` section with one concise, user-focused description of what the change does for the user. Also include any confident version-branch labels described below.

## Fix already on `main`

Sometimes the failure is on a **version branch** (e.g. `9.3`) while `main` already carries the fix — it was fixed on `main` and never backported. The tell: the root cause the investigator flagged is already resolved on `main` (the anti-pattern the fix would remove is already gone), so there's nothing to change on `main`. This only applies to a version-branch failure — determine the failing branch from the issue's CI data or the investigator's comment; a `main` failure is the normal flow above.

When it happens, do **not** open a normal `main` PR. Find the `main` PR that already fixed it (`git log` / `git blame`, or the PR the investigator implicated), then:

- **Contained `main` PR** (small and single-purpose — essentially just the fix and its test, no unrelated refactors, so it backports cleanly): do **not** open a PR. Post the "Backport the existing fix" outcome comment naming that PR and the release branch(es) that still need it. When unsure whether it backports cleanly, prefer this — a recommendation beats an unverified PR.
- **Not-contained `main` PR** (bundles unrelated changes, so a whole-PR backport isn't safe): prepare a **best-effort fix for the failing version branch** with just the extracted change, and hand it over in the outcome comment — see "Fixes that must target a version branch". If other release branches still need the fix too, list `backport:version` plus the current `vX.Y.Z` label for each affected branch from `versions.json` (leave out `main` and any branch already fixed) so whoever opens the PR applies them.

## Fixes that must target a version branch

This workflow can only open PRs against `main`: the PR-opening job fetches the base branch into a shallow, `main`-only checkout, and on a repo Kibana's size that fetch cannot finish within the job timeout for any other branch.

So when the fix has to land on a version branch, don't call `create_pull_request` — prepare the fix exactly as if you were opening the PR, then hand it over in the outcome comment (see "Proposed fix for a version branch") so a human can open it in one copy-paste:

- Read the version branch's copy of every file you touch through the GitHub API (`get_file_contents` with `ref: <version-branch>`), not with git: you are on a shallow `main` clone, and fetching a version branch is exactly the operation this path exists to avoid.
- Write those copies to a scratch directory under `/tmp`, edit them there, and generate the diff with `diff -u --label a/<path> --label b/<path> <original> <edited>`, so the hunk headers are real and the result applies onto that branch with `git apply`. Never hand-count line numbers.
- Nothing here can be verified from a `main` checkout — no lint, type check, or test run against the version branch — so leave the PR description's "Verification" block out entirely rather than filling it with everything you couldn't check. That branch's CI covers the fix once the PR is open.

## Outcome comment

In **every** run, finish by posting exactly one short comment on issue #${{ env.ISSUE_NUMBER }} via the `add-comment` safe output, and removing the `ai:fix-flaky` label (see step 9). Format the comment as a short `###` heading that states the outcome (with the leading emoji shown below), followed by a single sentence of detail, then `cc @${{ env.REQUESTED_BY }}` at the very end (see "Requester mention", only append if the requester isn't a bot). No other preamble or sign-off. The only variant that carries more than that sentence is the version-branch hand-off, which appends the proposed PR in collapsed sections.

Follow this format:

- **PR opened**:
  ```markdown
  ### ➡️ A fix PR is ready for review: %%FIX_PR_URL%%

  <one very concise sentence on what the PR changes>. cc @<requester-github-handle-here-if-not-a-bot>

  %%FIX_PR_BADGE%%
  ```
  Include the `%%FIX_PR_URL%%` and `%%FIX_PR_BADGE%%` placeholders verbatim — the `link_fix_pr` tool replaces them with the PR link and a live PR-state badge. Never write the PR URL, number, or badge yourself.

- **Proposed fix for a version branch** (no PR opened — see "Fixes that must target a version branch"). Hand over the whole PR — title, labels, description, backporting guidance, and diff — so a human can open it from the comment alone, keeping the long parts collapsed.

  ````markdown
  ### 🔧 Manual PR needed: apply this fix to <version-branch>

  Open this PR against <version-branch> manually — this workflow can only target `main`. Everything you need is below. cc @<requester-github-handle-here-if-not-a-bot>

  - **Title:** `<PR title, per "PR format">`
  - **Labels:** `flaky-test-fixer`, `<release_note:skip or release_note:fix, per "Release-note and backport labels">`, `<backport:version plus the current vX.Y.Z label(s) for the affected branch(es) from versions.json — write "no backport label" if you weren't sure>`

  <details>
  <summary>PR description</summary>

  <the PR body per "PR format", without its "Verification" block; for `release_note:fix`, insert `## Release note` with one concise, user-focused description immediately before the final NOTE>

  </details>

  <details>
  <summary>Backporting guidance</summary>

  - `<vX.Y.Z>` → <one very short sentence justifying this version's backport decision>.
  <repeat once for every active version checked>

  </details>

  <details>
  <summary>Diff</summary>

  Apply onto <version-branch> with `git apply`.

  ```diff
  <the unified diff>
  ```

  </details>
  ````

- **Existing PR already covers it**:
  ```markdown
  ### 🔁 A fix is already in flight

  #<PR number> already covers this, so no duplicate PR was opened. cc @<requester-github-handle-here-if-not-a-bot>
  ```
- **No PR opened**:
  ```markdown
  ### ⏭️ No fix PR was opened

  The failure is infrastructure-side (the CI agent lost its Elasticsearch connection mid-run), so there's nothing to patch in this repo. cc @<requester-github-handle-here-if-not-a-bot>
  ```
  Swap in the actual one-clause reason — e.g. the test already passes on `main`, the failure is infrastructure-side, or the root cause can't be confidently identified.
- **Pre-fix CI lag** (the reported failure ran a Cloud image that predates the fix — confirm via the `flaky-test-investigator` skill's pipelines reference — so no PR was opened):
  ```markdown
  ### 🕒 Pre-fix CI lag, not a regression

  This failure ran on Kibana `<short-sha>`, which doesn't yet include the fix; it should clear once the Cloud image catches up with `main`. cc @<requester-github-handle-here-if-not-a-bot>
  ```
  Fill `<short-sha>` with the failing run's `Build hash` (the commit you compared against the fix — see the pipelines reference), abbreviated to 12 chars.
- **Backport the existing fix** (fix already on `main`, contained PR — no PR opened):
  ```markdown
  ### The fix is already on `main` — it needs backporting

  #<main-PR> already fixed this on `main`; add the `backport:version` + `<vX.Y.Z>` label(s) to it to backport to <branch(es)>. cc @<requester-github-handle-here-if-not-a-bot>
  ```
  Fill `<vX.Y.Z>` from the branch → version mapping in `versions.json` (only the branches that still need the fix).
