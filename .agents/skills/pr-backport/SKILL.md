---
name: pr-backport
description: Backport Kibana PRs to previous version branches. Use when the user provides a PR URL or number and wants to backport it to one or more branches, or asks to check/fix the backport status of an existing PR.
---

# PR Backport

## Overview

Backporting copies a merged PR's commits to older version branches. The `kibanamachine` bot automates this via the `node scripts/backport` tool. The agent's role is to:

1. Assess the current backport state for the given PR.
2. Handle open backport PRs whose CI is failing.
3. When the bot failed to create the PR due to merge conflicts: resolve trivial conflicts manually, or escalate non-trivial ones with a clear list of missing dependency PRs.

---

## Step 1 - Assess the PR's backport state

Fetch labels and backport-related comments from the original PR:

```bash
gh pr view <PR_NUMBER> --repo elastic/kibana \
  --json number,title,state,labels,comments \
  --jq '{
    number,
    title,
    state,
    labels: [.labels[].name],
    backport_comments: [
      .comments[]
      | select(.body | test("backport|Backport|cherry-pick|conflict"; "i"))
      | .body
    ]
  }'
```

### Determine intent from labels

| Label | Meaning |
|---|---|
| `backport:all-open` | Backport to all active branches listed in `.backportrc.json` (`targetBranchChoices`) |
| `backport:version` | Backport only to branches corresponding to the `v<X>.<Y>.<Z>` labels on the PR (mapping: `v9.3.x` -> `9.3`) |
| `backport:skip` | No backport intended; stop here |

If no `backport:*` label is present, inform the user and stop.

If `backport:skip` is set but there is also a `backport missing` label, it means the labels were changed after some backports were already attempted. In this case, pending backports should no longer be pursued; only already-merged backport PRs remain.

### Read kibanamachine comments

The bot posts one or more comment blocks with a table like:

```
## 💔 Some backports could not be created
| Status | Branch | Result |
|:------:|:------:|:------|
|❌|8.19|Backport failed because of merge conflicts<br><br>You might need to backport the following PRs to 8.19:<br> - [Title (#256083)](https://github.com/elastic/kibana/pull/256083)|
|❌|9.2|Backport failed because of merge conflicts|
|✅|9.3|[<img ...>](https://github.com/elastic/kibana/pull/254972)|
```

Or on success:

```
## 💚 All backports created successfully
| Status | Branch | Result |
|:------:|:------:|:------|
|✅|8.19|[<img ...>](https://github.com/elastic/kibana/pull/255163)|
```

There can be **multiple** comment blocks. The most recent one per branch is authoritative. Aggregate the final state across all comments.

### Determine per-branch status

For each intended target branch, determine whether:

- **Done / auto-merged**: A ✅ backport PR exists and is merged.
- **PR created**: A ✅ backport PR exists (link in the table) but is still open (CI failing).
- **PR NOT created**: An ❌ row with "merge conflicts" - no backport PR was created. Check for dependency hints ("You might need to backport the following PRs to <branch>").
- **Not yet attempted**: No comment mentions this branch yet (bot may still be running).

Use `gh pr view <BACKPORT_PR_NUMBER> --repo elastic/kibana --json state,statusCheckRollup` to verify open PR status and CI.

---

## Step 2 - CI failures on an open backport PR

For each open backport PR with CI failures:

1. Fetch the PR and its CI status:
   ```bash
   gh pr view <BACKPORT_PR_NUMBER> --repo elastic/kibana \
     --json number,title,state,headRefName,statusCheckRollup,comments
   ```

2. Identify failing checks and their logs. Use the `kibana-ci` MCP if available, or read Buildkite links from comments to understand the failure.

3. Fix the root cause in the backport branch:
   ```bash
   git fetch origin
   git checkout backport/<branch>/pr-<original-pr>
   # ... make fixes ...
   git push origin HEAD
   ```

4. Monitor CI until it passes. The PR will auto-merge once CI is green (see `.backportrc.json`: `autoMerge: true, autoMergeMethod: squash`).

---

## Step 3 - Merge conflicts

### Check for dependency hints

Look in the ❌ row's "Result" cell for text like:
> "You might need to backport the following PRs to `<branch>`:"
> - [PR Title (#NNNNN)](https://github.com/elastic/kibana/pull/NNNNN)

**If dependency hints exist**: Do NOT attempt to resolve the conflicts. Output a clear summary:

```
Branch `<branch>` has merge conflicts that depend on the following unbackported PRs:
- #NNNNN: <PR Title> -> must be backported to `<branch>` first
```

Tell the user they need to backport the listed dependency PRs to the target branch first, then retry this backport.

### Trivial conflicts: manual cherry-pick

Only attempt manual conflict resolution when there are **no dependency hints** AND the conflict appears trivial (few files, simple changes). Otherwise, escalate to the user.

**Assess first** - find the files changed and the commits to cherry-pick:
```bash
gh pr view <PR_NUMBER> --repo elastic/kibana --json files,commits \
  --jq '{files: [.files[].path], commits: [.commits[].oid]}'
```

If `yarn.lock` appears as the only conflict alongside `package.json`, this is almost always trivially resolvable - see the `yarn.lock` note below.

**Identify the correct remote for upstream branches:**

The local repo may have multiple remotes (personal forks, contributor forks, etc.). Always base backport branches on the canonical `elastic/kibana` remote, not on a personal fork - forks are often behind and will produce merge conflicts in the PR.

```bash
# Find the remote pointing to elastic/kibana
git remote -v | grep "elastic/kibana"
# Typically named "upstream" - confirm before proceeding
```

**Create the backport branch from the upstream remote:**
```bash
git fetch <upstream-remote> <branch>
git checkout -b backport/<branch>/pr-<PR_NUMBER> <upstream-remote>/<branch>
git cherry-pick <commit-sha>
```

Only cherry-pick the substantive commit(s), not merge commits.

**Use the correct Node.js version for the target branch:**

Each branch may require a different Node.js version (specified in `.node-version` or `.nvmrc`). After switching to a new backport branch, check and switch Node before running `yarn kbn bootstrap`:

```bash
cat .node-version   # or .nvmrc
nvm use <version>   # or: source ~/.nvm/nvm.sh && nvm use <version>
```

**Resolving `package.json` conflicts between major/minor branches:**

Different Kibana branches use different dependency version formats (ranges `^` vs exact) and divergent package sets. When conflicts span many lines but the actual change is small (e.g. a version bump), the correct resolution is:
1. Keep the HEAD (target branch) version of every conflicting line.
2. Manually apply only the intended version changes from the original PR on top.
3. Skip adding packages that don't exist in the target branch (e.g. if a dependency was added after the branch cut).
4. After checking out the target branch's `yarn.lock` and regenerating, verify which packages were already at the target version (due to other commits landing on the branch in the meantime) and apply only the remaining bumps.

Example: resolving all conflict markers by keeping HEAD, then applying targeted bumps:
```python
import re

with open('package.json', 'r') as f:
    content = f.read()

resolved = re.sub(
    r'<<<<<<< HEAD\n(.*?)=======\n.*?>>>>>>> [^\n]+\n',
    lambda m: m.group(1),
    content,
    flags=re.DOTALL
)

with open('package.json', 'w') as f:
    f.write(resolved)
```

Then apply the specific version bumps with `StrReplace`.

**Resolving `yarn.lock` conflicts:**

Never try to resolve `yarn.lock` conflict markers manually. Instead:
```bash
# Restore the target branch's yarn.lock
git checkout HEAD -- yarn.lock

# Then regenerate it (requires the correct Node.js version)
yarn kbn bootstrap
```

After resolving all conflicts:
```bash
git add package.json yarn.lock
git cherry-pick --continue --no-edit
```

**Push from a fork and create the PR:**

If the remote `origin` is a personal fork (not `elastic/kibana`), push to the fork and use `--head <fork-owner>:<branch>`:
```bash
git push origin backport/<branch>/pr-<PR_NUMBER>

gh pr create \
  --repo elastic/kibana \
  --base <branch> \
  --head <fork-owner>:backport/<branch>/pr-<PR_NUMBER> \
  --label "backport" \
  --title "[<branch>] <original title> (#<PR_NUMBER>)" \
  --body "$(cat <<'EOF'
# Backport

This will backport the following commits from `main` to `<branch>`:
 - [<original title> (#<PR_NUMBER>)](https://github.com/elastic/kibana/pull/<PR_NUMBER>)

<!--- Backport version: manual -->

### Questions ?
Please refer to the [Backport tool documentation](https://github.com/sorenlouv/backport)
EOF
)"
```

Note: do NOT use `--draft` - backport PRs are created ready-to-merge so CI can auto-merge them.

Once CI passes, the PR will auto-merge (configured in `.backportrc.json`: `autoMerge: true, autoMergeMethod: squash`).

---

## Step 4 - Summarize and report

After assessing and acting, provide a clear summary table:

| Branch | Status | Action taken / Notes |
|---|---|---|
| 9.3 | Merged | Auto-merged after CI passed |
| 9.2 | Open - CI failing | Fixed linting issue, pushed to `backport/9.2/pr-NNNNN` |
| 8.19 | Conflicts - dependency | Must backport #256083 first, then retry |

If a `backport missing` label is present and all intended backports are now resolved, inform the user that `kibanamachine` will automatically remove the label once all backport PRs are merged.

---

## Reference

### `.backportrc.json` active branches

The `targetBranchChoices` field lists all branches the backport tool knows about. Not all are necessarily "open" (actively maintained). The `branchLabelMapping` maps version labels to branches:
- `^v9.4.0$` -> `main`
- `^v(\d+).(\d+).\d+$` -> `$1.$2` (e.g. `v9.3.2` -> `9.3`)

### Manual backport command

```bash
node scripts/backport --pr <PR_NUMBER>
```

This runs interactively and lets you select target branches. The tool handles cherry-picking and PR creation automatically.

### Key labels

| Label | Set by | Meaning |
|---|---|---|
| `backport:all-open` | Developer | Backport to all active branches |
| `backport:version` | Developer | Backport only to specified `v*` branches |
| `backport:skip` | Developer | No backport wanted |
| `backport missing` | kibanamachine | One or more backports failed or are missing |
| `backport` | kibanamachine | Applied to backport PRs themselves |
