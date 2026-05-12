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
  group: failed-backport-resolver-${{ github.event.issue.number || github.event.inputs.pr_number || github.run_id }}
  cancel-in-progress: true

permissions:
  contents: read
  issues: read
  pull-requests: read

env:
  PR_NUMBER: &pr_number ${{ github.event.issue.number || github.event.inputs.pr_number }}
  PR_CONTEXT_ARTIFACT_NAME: &pr_context_artifact_name prefetched-pr-context-${{ github.event.issue.number || github.event.inputs.pr_number }}

checkout:
  - fetch-depth: 0

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
  report-failure-as-issue: false
  add-comment:
    max: 2
    target: *pr_number
    discussions: false
    footer: false
  create-pull-request:
    max: 8
    labels: [backport]
    draft: false
    auto-close-issue: false
    allowed-base-branches:
      - main
      - "[0-9]*.[0-9]*"
    fallback-as-issue: false
    protected-files: allowed

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
---

# Failed Backport Resolver

Resolve failed automatic backports for the pull request identified by the injected `GH_AW_GITHUB_EVENT_ISSUE_NUMBER` value for PR comments, or `GH_AW_GITHUB_EVENT_PULL_REQUEST_NUMBER` when present. Use the injected `GH_AW_GITHUB_REPOSITORY` and `GH_AW_GITHUB_RUN_ID` values to construct the workflow run URL as `https://github.com/<GH_AW_GITHUB_REPOSITORY>/actions/runs/<GH_AW_GITHUB_RUN_ID>`.

## Parent Workflow

1. Read `/tmp/gh-aw/agent/pr-metadata.json` and `/tmp/gh-aw/agent/pr-issue-comments.json`. Use those prefetched files as the source of truth for PR metadata and comments.
2. From `pr-issue-comments.json`, use the latest `kibanamachine` comment whose body contains `Some backports could not be created` or `All backports failed`.
3. Parse that comment for target branches that failed. A failed branch is any branch row whose result says `Backport failed because of merge conflicts`, or an equivalent failure row under the matching failure heading.
4. Read `versions.json` and build the active branch allowlist from `versions[].branch`. Drop any parsed failed branch that is not in that allowlist, and mention the skipped branch in the final comment.
5. Read `.backportrc.json` for non-branch PR conventions only. Ignore branch lists in `.backportrc.json`; active branches come from `versions.json`.
6. Before starting a target branch, inspect only source PR-local data for an existing backport: `pr-metadata.json`, `pr-issue-comments.json`, and any PRs directly linked from those comments or the source PR body. Treat a linked open PR as existing only when it has the `backport` label and targets the same branch. Do not perform broad repository PR searches.
7. For each remaining target branch, launch one parallel task with the `backport-branch-worker` sub-agent defined at the end of this workflow. Pass only the source PR number, source PR title, source PR URL, source branch, source merge commit SHA, target branch, repository from `GH_AW_GITHUB_REPOSITORY`, and the workflow run URL built from `GH_AW_GITHUB_REPOSITORY` and `GH_AW_GITHUB_RUN_ID`.
8. Wait for every branch task to finish. Do not stop after the first failure.
9. For each successful branch task, ensure it called `create_pull_request`. Do not call `create_pull_request` again for the same branch.
10. Post exactly one final `add_comment` after all branch tasks finish. Include a compact table with `Branch`, `Status`, and `Result`. Use statuses: `created`, `existing`, `skipped`, `needs manual backport`, or `failed`. Do not fabricate PR URLs; gh-aw safe outputs will attach related created PRs to the comment after processing.

## Final Comment Format

Use this shape for the final source PR comment:

```markdown
## Backport resolution attempt complete

| Branch | Status | Result |
| --- | --- | --- |
| 8.19 | created | Created a staged backport PR request. |

These backports were prepared by an agent. Please review the generated PRs carefully before merging.

Workflow run: <run URL>
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
- source branch
- source merge commit SHA
- target branch
- workflow run URL
- repository, always `elastic/kibana`

Create exactly one isolated git worktree for the target branch. Use a branch/worktree name that starts with `backport/` and includes the source PR number and target branch. Fetch the target branch before creating the worktree.

Cherry-pick the source merge commit into the target branch worktree with `git cherry-pick -x <source merge commit SHA>`. The `-x` flag preserves the original commit attribution in the backport commit message, which is useful for public release branches.

If git fetch, worktree creation, cherry-pick, bootstrap, or safe-output tooling exits with an error unrelated to a merge conflict, return `failed` with the exact command or tool error. Do not retry blindly or invent workarounds.

If the cherry-pick applies without conflicts:

1. Confirm the diff is limited to the cherry-pick.
2. Commit is already created by cherry-pick.
3. Stay in the worktree directory and run `git branch --show-current`.
4. Call `create_pull_request` from the committed worktree with:
   - `base`: the target branch
   - `branch`: exactly the output of `git branch --show-current`; do not invent a branch name
   - `title`: `[<target branch>] <source PR title> (#<source PR number>)`
   - `body`: matching the backport body rules below.
5. Return `created`.

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
6. After resolving, verify no conflict markers remain with a repository search for `<<<<<<<`, `=======`, and `>>>>>>>`.
7. Stage only the resolved cherry-pick files.
8. Continue the cherry-pick and preserve the `-x` attribution.
9. Stay in the worktree directory and run `git branch --show-current`.
10. Call `create_pull_request` from the committed worktree with:
    - `base`: the target branch
    - `branch`: exactly the output of `git branch --show-current`; do not invent a branch name
    - `title`: `[<target branch>] <source PR title> (#<source PR number>)`
    - `body`: matching the backport body rules below.
11. Return `created`.

Backport body rules. JSON-escape string values in the `BACKPORT` marker when substituting real PR metadata:

```markdown
# Backport

This will backport the following commits from `<source branch>` to `<target branch>`:
- [<source PR title> (#<source PR number>)](<source PR URL>)

> This backport was generated by the failed backport resolver agent. Please review it carefully before merging.
>
> Workflow run: <workflow run URL>

### Questions ?
Please refer to the [Backport tool documentation](https://github.com/sorenlouv/backport)

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
- Never change files that are not part of the cherry-pick resolution.
- Never run `node scripts/check_changes.ts` in a backport worktree; older target branches may not have that script.
- Never run extra tests or checks in the backport worktree unless the parent task explicitly instructed you to.
- Never suppress type, lint, or test errors.
- Never guess a conflict resolution. Return `needs manual backport` when the correct resolution cannot be verified.
- Do not run broad tests. This workflow creates backport PRs; CI validates them.
- Do not post comments. The parent task posts comments.
