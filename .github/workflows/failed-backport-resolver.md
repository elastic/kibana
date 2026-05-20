---
name: Failed Backport Resolver
description: Resolve failed automatic backports by cherry-picking the merged PR into active version branches and creating backport PRs.
on:
  issue_comment:
    types: [created]
  workflow_dispatch:
    inputs:
      pr_number:
        description: Pull request number with failed backports
        required: true
        type: string
  bots:
    - kibanamachine
resources:
  - prefetch-pr-context.yml

if: >-
  !github.event.repository.fork &&
  (
    github.event_name == 'workflow_dispatch' ||
    (
      github.event_name == 'issue_comment' &&
      github.event.issue.pull_request &&
      github.event.comment.user.login == 'kibanamachine' &&
      (
        contains(github.event.comment.body, 'Some backports could not be created') ||
        contains(github.event.comment.body, 'All backports failed')
      )
    )
  )

concurrency:
  group: >-
    ${{
      (
        github.event_name == 'workflow_dispatch' ||
        (
          github.event_name == 'issue_comment' &&
          github.event.issue.pull_request &&
          github.event.comment.user.login == 'kibanamachine' &&
          (
            contains(github.event.comment.body, 'Some backports could not be created') ||
            contains(github.event.comment.body, 'All backports failed')
          )
        )
      ) &&
      format('failed-backport-resolver-{0}', github.event.issue.number || github.event.inputs.pr_number) ||
      format('failed-backport-resolver-{0}', github.run_id)
    }}
  cancel-in-progress: false

permissions:
  contents: read
  issues: read
  pull-requests: read

env:
  PR_NUMBER: &pr_number ${{ github.event.issue.number || github.event.inputs.pr_number }}
  PR_CONTEXT_ARTIFACT_NAME: &pr_context_artifact_name prefetched-pr-context-${{ github.event.issue.number || github.event.inputs.pr_number }}

runs-on: kibana
timeout-minutes: 120

engine:
  id: claude
  version: "2.1.111"
  model: opus
  max-turns: 120
  env:
    ANTHROPIC_API_KEY: ${{ secrets.LITELLM_API_KEY }}
    ANTHROPIC_BASE_URL: https://elastic.litellm-prod.ai
    ENABLE_PROMPT_CACHING_1H: "1"
    ANTHROPIC_DEFAULT_OPUS_MODEL: llm-gateway/claude-opus-4-7[1m]
    ANTHROPIC_DEFAULT_HAIKU_MODEL: llm-gateway/claude-haiku-4-5
    ANTHROPIC_DEFAULT_SONNET_MODEL: llm-gateway/claude-sonnet-4-6
    CLAUDE_CODE_SUBAGENT_MODEL: opus[1m]

tools:
  github:
    toolsets: [default, search]
    min-integrity: none
  bash: true

network:
  allowed:
    - defaults
    - github
    - registry.npmjs.org
    - kibana-bazel-remote-h5qd3jkxkq-uc.a.run.app
    - elastic.litellm-prod.ai

sandbox:
  agent: awf

safe-outputs:
  activation-comments: true
  footer: true
  report-failure-as-issue: false
  add-comment:
    max: 2
    target: *pr_number
    discussions: false
  create-pull-request:
    max: 8
    labels: [backport]
    draft: false
    auto-close-issue: false
    allowed-base-branches:
      - "8.19"
      - "9.*"
    fallback-as-issue: false
    protected-files: allowed
  assign-to-user:
    max: 8
    target: "*"

strict: false
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
  - name: Fetch backport refs
    run: |
      set -euo pipefail

      source_sha="$(jq -r '.mergeCommit.oid // empty' /tmp/gh-aw/agent/pr-metadata.json)"
      if [ -z "${source_sha}" ]; then
        echo "No mergeCommit.oid found for PR ${PR_NUMBER} in prefetched metadata" >&2
        exit 1
      fi
      git fetch --no-tags --depth=2 origin "${source_sha}"

      jq -r '.versions[].branch' versions.json | while read -r branch; do
        git fetch --no-tags --depth=1 origin "+refs/heads/${branch}:refs/remotes/origin/${branch}"
      done
---

# Failed Backport Resolver

Resolve failed automatic backports for the pull request identified by the injected `GH_AW_GITHUB_EVENT_ISSUE_NUMBER` value for PR comments, or `GH_AW_GITHUB_EVENT_PULL_REQUEST_NUMBER` when present. Use the injected `GH_AW_GITHUB_REPOSITORY` and `GH_AW_GITHUB_RUN_ID` values to construct the workflow run URL as `https://github.com/<GH_AW_GITHUB_REPOSITORY>/actions/runs/<GH_AW_GITHUB_RUN_ID>`.

## Parent Workflow

1. Read `/tmp/gh-aw/agent/pr-metadata.json` and `/tmp/gh-aw/agent/pr-issue-comments.json`. Use those prefetched files as the source of truth for PR metadata and comments, and capture `author.login` from `pr-metadata.json` as the source PR author login. Also read `crossReferencedPulls` from `pr-metadata.json`; it contains compact metadata for pull requests that GitHub cross-referenced from the source PR timeline.
2. From `pr-issue-comments.json`, use the latest `kibanamachine` comment whose body contains `Some backports could not be created` or `All backports failed`.
3. Parse that comment for target branches that failed. A failed branch is any branch row whose result says `Backport failed because of merge conflicts`, or an equivalent failure row under the matching failure heading.
4. Read `versions.json` and build the active branch allowlist from `versions[].branch`. Drop any parsed failed branch that is not in that allowlist, and mention the skipped branch in the final comment.
5. Read `.backportrc.json` for non-branch PR conventions only. Ignore branch lists in `.backportrc.json`; active branches come from `versions.json`.
6. Before starting a target branch, inspect only source PR-local data for an existing backport: `pr-metadata.json`, `crossReferencedPulls`, `pr-issue-comments.json`, and any PRs directly linked from those comments or the source PR body. Treat an open PR as existing only when it has the `backport` label and targets the same branch. Do not perform broad repository PR searches.
7. If every remaining failed branch already has an existing open backport PR, call `add_comment` exactly once with the final comment table, use status `existing` for those branches, and do not launch branch workers.
8. Create the shared parent directory for worker worktrees by running `mkdir -p /tmp/gh-aw-worktrees`.
9. For each remaining target branch, launch one parallel task with the `backport-branch-worker` sub-agent defined at the end of this workflow. Pass only the source PR number, source PR title, source PR URL, source PR author login, source branch, source merge commit SHA, target branch, repository from `GH_AW_GITHUB_REPOSITORY`, and the workflow run URL built from `GH_AW_GITHUB_REPOSITORY` and `GH_AW_GITHUB_RUN_ID`.
   - Do not rewrite or expand the worker instructions when launching the task. Do not add branch naming, PR body, safe-output tool, git push, draft PR, fallback, retry, test, or validation instructions beyond the input values listed above.
   - Branch workers are the only tasks that may call `create_pull_request`, and only for a branch whose worker result is `created`.
   - The parent workflow must never call `create_pull_request` for a branch, including to retry, repair, or replace a worker output.
10. Wait for every branch task to finish. Do not stop after the first failure.
11. Validate every branch task result before writing the final comment:
   - A `created` result requires that branch worker to call `create_pull_request` exactly once and then call `assign_to_user` for the temporary PR reference returned by that `create_pull_request` call.
   - A `needs manual backport` or `failed` result must not have a `create_pull_request` call for that branch. If a branch worker reports either status after requesting a PR, treat the branch as `failed` and explain the contract violation in the final comment.
   - If a branch worker returns `created` without a matching `assign_to_user` call, keep the branch status as `created` and explain the missing assignment in the final comment result.
12. Post exactly one final `add_comment` following the exact template below after all branch tasks finish. Include a compact table with `Branch`, `Status`, and `Result`. Use statuses: `created`, `existing`, `skipped`, `needs manual backport`, or `failed`. The status for each worker branch must match the validated status from step 11. Do not fabricate PR URLs; gh-aw safe outputs will attach related created PRs to the comment after processing.
   - Keep every `Result` cell to one concise sentence that is under 80 characters.
   - For conflicts or manual-backport cases, summarize the blocker category. Do not include long conflict explanations, implementation analysis, or full file lists in the table.
   - For created PR requests, use a short phrase such as `Created a staged backport PR request.` If assignment was missing, append `Assignment request missing.`
   - Do not add diagnostic paragraphs after the table; workflow logs and the agent summary contain detailed run information.

## Final Comment Template

Use this shape for the final source PR comment:

```markdown
## Backport resolution attempt complete

| Branch | Status | Result |
| --- | --- | --- |
| 8.19 | created | Created a staged backport PR request. |
| 9.4 | needs manual backport | Structural OAS conflicts need manual resolution; see workflow logs. |

These backports were prepared by an agent. Please review the generated PRs carefully before merging.

```

## agent: `backport-branch-worker`
---
description: Resolve one failed Kibana backport branch in an isolated worktree and request a backport PR.
---

You are resolving one failed Kibana backport branch.

The parent task will provide:

- source PR number
- source PR title
- source PR URL
- source PR author login
- source branch
- source merge commit SHA
- target branch
- workflow run URL
- repository, always `elastic/kibana`

Create exactly one isolated git worktree for the target branch from the already-fetched target branch ref. Use a branch/worktree name that starts with `backport/` and includes the source PR number and target branch. Place the worktree under `/tmp/gh-aw-worktrees`, using a path like `/tmp/gh-aw-worktrees/wt-<source PR number>-<target branch>`.

Never create a worktree, full repository copy, or package install output under `/tmp/gh-aw`. That directory is uploaded as workflow artifacts.

Cherry-pick the source merge commit into the target branch worktree with `git cherry-pick -x <source merge commit SHA>`.

If git fetch, worktree creation, cherry-pick, bootstrap, or safe-output tooling exits with an error unrelated to a merge conflict, return `failed` with the exact command or tool error. Do not retry blindly or invent workarounds.

If the cherry-pick applies without conflicts:

1. Confirm the diff is limited to the cherry-pick.
2. Commit is already created by cherry-pick.
3. Follow the Backport PR creation steps.

If the cherry-pick has conflicts:

1. Run `git status --short` and identify only conflicted files. Read each conflicted file to inspect conflict markers before editing it.
2. For every conflicted file, inspect:
   - the conflicted worktree file,
   - `git show <source merge commit SHA>:<path>` when that path exists in the source merge commit,
   - the target branch version of the file.
3. Resolve only files involved in the conflict. Do not edit unrelated files. If a conflict represents a deletion, use `git rm <file>` instead of leaving an empty file behind.
4. For package or lockfile conflicts:
   - Apply the source PR dependency/version intent to the target branch's package manifest.
   - Never manually resolve lockfile conflicts.
   - Run `yarn kbn bootstrap` when a lockfile conflict exists or package conflict resolution requires dependency regeneration.
   - Do not edit lockfiles that were not part of the conflict unless `yarn kbn bootstrap` updates them as part of dependency regeneration.
5. If a conflict is structural, semantic, or requires product judgment that cannot be verified from the source and target branch context, abort the cherry-pick, leave the worktree for logs, and return `needs manual backport` with the conflicted files and reason.
6. After resolving, verify no conflict markers remain with a worktree search for `<<<<<<<`, `=======`, and `>>>>>>>`.
7. Stage only the resolved cherry-pick files.
8. Continue the cherry-pick and preserve the `-x` attribution.
9. Follow the Backport PR creation steps.

Backport PR creation steps:

1. Confirm the worktree is ready for PR creation:
   - `git status --short` shows no unresolved conflicts or in-progress cherry-pick state.
   - A worktree search for `<<<<<<<`, `=======`, and `>>>>>>>` finds no conflict markers.
   - `git log -1` is the completed cherry-pick commit with the `-x` attribution.
   - `git diff origin/<target branch>...HEAD` is limited to the intended cherry-pick resolution.
2. If any PR creation precondition fails, abort any in-progress cherry-pick, leave the worktree for logs, return `needs manual backport`, and do not call `create_pull_request`.
3. Stay in the worktree directory and run `git branch --show-current`.
4. Call `create_pull_request` from the committed worktree with:
   - `base`: the target branch
   - `branch`: exactly the output of `git branch --show-current`; do not invent a branch name
   - `title`: `[<target branch>] <source PR title> (#<source PR number>)`
   - `body`: matching the backport body rules below.
5. Call `assign_to_user` for the PR created by that `create_pull_request` call with `issue_number` set to the temporary PR reference returned by `create_pull_request` and `assignees`: `["<source PR author login>"]`.
6. Return `created`.

Backport body must match this template EXACTLY. JSON-escape string values in the `BACKPORT` marker when substituting real PR metadata:

```markdown
# Backport

This will backport the following commits from `<source branch>` to `<target branch>`:
- [<source PR title> (#<source PR number>)](<source PR URL>)

> This backport was generated by the failed backport resolver agent. Please review it carefully before merging.

<!--BACKPORT [{"sourcePullRequest":{"number":<source PR number>,"url":"<source PR URL>","title":"<source PR title>"},"sourceBranch":"<source branch>","suggestedTargetBranches":["<target branch>"],"sourceCommit":{"sha":"<source merge commit SHA>"}}] BACKPORT-->
```

Return a short structured result:

```json
{
  "branch": "<target branch>",
  "status": "created | needs manual backport | failed",
  "summary": "one sentence",
  "conflicted_files": [],
  "pr_title": "[<target branch>] <source PR title> (#<source PR number>)"
}
```

Rules:

- Never run `node scripts/backport`.
- Never run `git push`; `create_pull_request` handles the staged PR request.
- Never use the `safeoutputs` CLI. Use the safe-output tools directly.
- Never call `create_pull_request` without the `base` field or retry with a different base.
- Never create draft PRs, placeholder PRs, manual-resolution PRs, or PRs that preserve conflict markers.
- Never use a custom PR body. The body must match the Backport body template above exactly.
- Never change files that are not part of the cherry-pick resolution.
- Never run `node scripts/check_changes.ts` in a backport worktree; older target branches may not have that script.
- Never run extra tests or checks in the backport worktree unless the parent task explicitly instructed you to.
- Never suppress type, lint, or test errors.
- Never guess a conflict resolution. Return `needs manual backport` when the correct resolution cannot be verified.
- Do not run broad tests. This workflow creates backport PRs; CI validates them.
- Do not post comments. The parent task posts comments.
