---
name: resolve-failed-backports
description: >-
  Resolve failed backports for elastic/kibana PRs due to merge conflicts.
  Use when the user shares a PR number and asks to fix failed backports,
  resolve backport merge conflicts, or mentions a backport failure.
---

# Resolve Failed Backports

Resolve merge conflicts that caused automatic backports to fail for a merged
elastic/kibana PR. The [on-merge GitHub Action](https://github.com/elastic/kibana-github-actions/tree/main/on-merge)
runs backports automatically via the [backport tool](https://github.com/sorenlouv/backport).
When cherry-picks fail due to conflicts, `kibanamachine` posts a failure
comment on the source PR. This skill handles re-running those backports
locally and resolving the conflicts.

## Prerequisites

- `~/.backport/config.json` must contain a valid `accessToken`. If missing,
  ask the user to create the file with `{ "accessToken": "<GitHub PAT>" }`.
- `gh` CLI must be authenticated with access to `elastic/kibana`. If not
  authenticated, ask the user to run `gh auth login`.

## Workflow

### Step 1: Identify failed branches

Fetch the source PR merge SHA and the most recent backport failure comment from
the source PR:

```bash
SOURCE_SHA=$(gh api repos/elastic/kibana/pulls/<PR> --jq '.merge_commit_sha')

gh api --paginate --slurp repos/elastic/kibana/issues/<PR>/comments \
  --jq 'add
    | map(
        select(.user.login == "kibanamachine")
        | select(.body | test("Some backports could not be created|All backports failed"))
      )
    | sort_by(.created_at)
    | last
    | .body'
```

Parse the markdown table in the latest matching `kibanamachine` comment to
extract branches with status "failed because of merge conflicts". These are the
target branches for the local backport.

If there is no matching failure comment, stop and tell the user the PR does not
have a current backport failure comment to use.

### Step 2: Run the backport tool

Run the backport from the **Kibana repo root**:

```bash
node scripts/backport --pr <SOURCE_PR> -b <branch1> <branch2> ... --editor true
```

- `--editor true` is a no-op editor so the tool falls through immediately to
  its interactive confirm prompt on conflict.
- Run this in a **foreground** terminal. The tool will halt when it encounters
  a conflict and print the confirm prompt.

The backport tool operates in its own clone at `~/.backport/repositories/elastic/kibana`.
All conflict resolution work happens in that directory.

If the backport tool exits with an error (network failure, auth error, unknown
flag, etc.), report the full error output to the user and stop. Do not attempt
to retry or work around tool failures.

### Step 3: Resolve conflicts

When the tool halts with "Press ENTER when the conflicts are resolved and
files are staged", work in the backport working directory:

```bash
cd ~/.backport/repositories/elastic/kibana
git status
```

For each conflicting file:

1. **Read the file** to see the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
2. **Consult context** from both the source PR merge SHA and the target branch
   to understand what the correct resolution is. Read the file on each side:
   ```bash
   git show "${SOURCE_SHA}:<filepath>"
   git show <target-branch>:<filepath>
   ```
3. **Resolve the conflict** by editing the file to remove conflict markers with
   the correct content.

#### Lock file conflicts (yarn.lock, package-lock.json)

**NEVER resolve lock files manually.** Follow this order:

1. Resolve `package.json` conflicts first (manually fix the conflict markers)
2. Run `yarn kbn bootstrap` in `~/.backport/repositories/elastic/kibana`
   to regenerate `yarn.lock` from the resolved `package.json` and solve the conflicts automatically
3. Stage both files:
   ```bash
   git add package.json yarn.lock
   ```

#### Other file conflicts

- Resolve using standard conflict resolution: read both sides, pick the
  correct content, remove the markers.
- Stage resolved files with `git add <file>` or `git rm <file>` for deletions.

### Step 4: Continue the backport

After all conflicting files are resolved and staged, press ENTER in the
backport tool terminal to continue. The tool will verify all conflicts are
resolved (it loops if any remain) and then proceed to create the backport PR.

### Step 5: Repeat for additional branches

The backport tool processes branches sequentially. If multiple branches
failed, it will halt again for each branch that has conflicts. Repeat
steps 3-4 for each one.

### Step 6: Report results

After all branches complete, the backport tool creates PRs automatically.
Report the created backport PR URLs to the user.

## Rules

- **NEVER guess.** If you are not confident in a conflict resolution, stop
  and tell the user to handle it manually.
- **NEVER resolve lock files manually.** Always use `yarn kbn bootstrap`
  after resolving `package.json`.
- **NEVER run `node scripts/check_changes.ts` in the backport clone.** That
  script exists on `main` and does NOT exist on older backport branches.
- **NEVER run extra tests or checks** in the backport clone unless the user
  explicitly asks for them.
- **NEVER deviate from this workflow.** The backport tool handles
  cherry-picking, branch creation, and PR creation. Your job is only to
  resolve the merge conflicts.
- **Always consult the source SHA and target branch files** before resolving a
  conflict. Do not rely on the conflict markers alone.

## Common patterns

### Renovate PRs (dependency updates)

These almost always fail due to `package.json` + `yarn.lock` conflicts.
The resolution is typically straightforward:
- The source PR bumps a dependency version in `package.json`
- The target branch has a different set of dependencies
- Resolve by applying the version bump from the source commit to the
  target branch's `package.json`, then regenerate `yarn.lock` with
  `yarn kbn bootstrap`

### Non-trivial conflicts

For conflicts in application code, business logic, or configuration that
spans multiple interrelated files, carefully read the surrounding context
on both branches. If the conflict involves structural changes (renamed
files, moved code, refactored APIs), tell the user you cannot confidently
resolve it and they should handle it manually.
