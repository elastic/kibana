---
name: backport
description: Backport a merged Kibana PR to one or more release branches using `node scripts/backport`, resolve merge conflicts using Kibana-specific patterns (yarn.lock, generated files, i18n, etc.), validate the result, and push the backport PR. Use when the user says "backport PR X", "backport this", asks to retry a failed CI backport, or runs `node scripts/backport` manually.
disable-model-invocation: true
---

# Backport a Kibana PR

Drive a manual backport from end to end. The `backport` tool handles the cherry-pick and PR creation — your job is to pick the right inputs, propose conflict resolutions for the user to approve, and release the tool's interactive prompt once conflicts are fixed.

## When to use this skill

- The user asks to backport a specific PR (`backport #268335`, `node scripts/backport --pr 268335`).
- CI auto-backport failed (the source PR has a comment from the backport bot reporting a conflict) and the user wants you to do it manually.
- The user wants to backport the currently checked-out commit.

Do **not** use this skill to *decide* whether something should be backported — that's the user's call.

## Step 1 — Identify the source PR and target branches

If the user supplied a PR number, use it. Otherwise ask once.

### Finding target branches (in priority order)

**1. If the user named branches explicitly** (`backport to 9.3 and 8.19`): use those, skip the rest of this section.

**2. Check for a kibanamachine bot comment on the PR** — most reliable when CI already tried:

```bash
gh pr view <PR> --repo elastic/kibana --json comments --jq '
  .comments[]
  | select(.author.login == "kibanamachine")
  | select(.body | contains("backport"))
  | .body
' | tail -1
```

Look for a table like:

```
| Status | Branch | Result |
|:------:|:------:|:------|
|❌|8.19|Backport failed because of merge conflicts|
|❌|9.3|Backport failed because of merge conflicts|
```

Extract exactly the branches marked ❌ — those are your targets. Skip ✅ (already succeeded).

**3. Check the PR body for `ONMERGE` metadata** — this is the canonical list the author chose at merge time, and is authoritative when there is no bot comment yet (first manual attempt):

```bash
gh pr view <PR> --repo elastic/kibana --json body --jq '.body' \
  | grep -oE 'ONMERGE \{[^}]+\}' | head -1
```

If the output contains `"backportTargets":["8.19","9.3","9.4"]`, those are your targets. Confirm them with the user in one short message and proceed.

**4. If neither a bot comment nor ONMERGE metadata exists**, read the active release branches:

```bash
cat versions.json | jq -r '.versions[] | select(.branchType == "release") | .branch'
```

Show the list to the user and ask which branches to target. Wait for their answer.

Confirm the final target list in one short message before running anything.

## Step 2 — Run the backport tool (one branch at a time)

**Always backport one branch at a time** — pass a single `--branch` flag per invocation.

The backport tool is interactive: when it hits a conflict it prints `Press ENTER when the conflicts are resolved and files are staged (Y/n)` and waits. **Keep this process alive** — if you let it exit and re-run it, it restarts the cherry-pick from scratch and your conflict resolutions are lost.

### How to keep the process running while you edit

Start the tool in the background with its stdin connected to a named pipe (fifo). While the tool waits at the prompt you edit the conflicted files, then write a newline to the pipe to release the prompt:

```bash
# One-time setup per branch
INPUT=$(mktemp -u /tmp/bp-input-XXXXXX)
mkfifo "$INPUT"
exec 9>"$INPUT"   # keep the write end open so the fifo doesn't EOF
```

Run the backport tool with `run_in_background: true`, reading from the fifo:

```bash
node scripts/backport --pr <PR> --branch <X.Y> <"$INPUT" &
```

Use the `Monitor` tool to watch its output stream. When you see the `Press ENTER` prompt:

1. Resolve conflicts per Step 3 below.
2. Stage the resolved files inside `~/.backport/repositories/elastic/kibana`.
3. Release the prompt: `echo "" >&9`
4. The tool runs `git cherry-pick --continue` itself, pushes to your fork, and opens the PR. `Monitor` will surface the PR URL.
5. Clean up: `exec 9>&-; rm -f "$INPUT"`

If there are multiple commits being cherry-picked, the tool may pause again on a second conflict — repeat the resolve → stage → `echo "" >&9` loop.

Do **not** run `git cherry-pick --continue` yourself — the tool does that once the prompt is released. Running it manually will confuse the tool's state.

Useful flags (only add when needed):

| Flag | When to use |
|---|---|
| `--dry-run` | Sanity check without pushing to GitHub. |
| `--autoMerge` (default true) / `--no-autoMerge` | Disable auto-merge if the user wants to review the backport PR manually. |
| `--sha <commit>` | Backporting a specific commit rather than a full PR. |

Do **not** use `--autoResolveConflictsWithTheirs` or `--commitConflicts` — conflicts need human approval here.

**Where the tool works:** The backport tool clones the repo into `~/.backport/repositories/elastic/kibana`. All conflict resolution happens there, not in the main working tree.

## Step 3 — Resolve conflicts

When the tool pauses, navigate into `~/.backport/repositories/elastic/kibana` and check what's conflicted:

```bash
git diff --name-only --diff-filter=U
```

### The golden rule: explain first, fix after

For every conflict — even mechanical ones — **show the user what you found and what you propose before touching anything**. One short message per set of conflicts:

> Conflicts in: `yarn.lock` (I'll regenerate via bootstrap), `.github/CODEOWNERS` (I'll regenerate via script). Ready to proceed?

Only fix after the user says yes. This prevents surprises and lets them override your categorization.

**If the same pattern of conflicts appears on a subsequent branch**, you may apply the same approved resolution automatically — but first verify that the prerequisites still hold on the new branch (see "Cross-branch verification" below). If anything is missing, fall back to proposing options and waiting.

### Cross-branch verification before reapplying a resolution

The same conflict hunk can require different resolutions on different branches. Before silently reapplying:

- For each **file** referenced in the source-side hunk: `ls ~/.backport/repositories/elastic/kibana/<path>` — does it exist on this branch?
- For each **step key** referenced (e.g. `verify_rspack_build` in a pipeline YAML): `grep -r "key: <step>" ~/.backport/repositories/elastic/kibana/.buildkite/` — is this step defined?
- For each **exported symbol**: `grep -r "export.*<symbol>" ~/.backport/repositories/elastic/kibana/` — is the source file present?

If any prerequisite is absent, do not silently apply — propose the adjusted resolution and wait for approval.

### Mechanical conflicts (safe to auto-propose)

These are generated files where the right fix is always regeneration, not hand-merging:

- **`yarn.lock` / `.yarnrc.json`**: take theirs, then run `yarn kbn bootstrap` to regenerate.
- **`.github/CODEOWNERS`**: take theirs, then run `node scripts/generate codeowners` to regenerate from package owner fields.
- **Moon configs** (`.moon/`, `moon.yml`): take theirs, then run `node scripts/regenerate_moon_projects.js --update`.
- **Generated OAS / schema files** (`oas_docs/output/`, `*.bundled.json`): take theirs, re-run the relevant generation script.
- **i18n translation JSON** (`x-pack/translations/**`, `src/translations/**`): merge adjacent additions from both sides; if keys overlap, prefer the source PR's value.
- **`versions.json` / version fields in `package.json`**: take target branch's version, keep source PR's dependency additions.

### Semantic conflicts — propose options, wait for decision

If the conflict is in real source code (TS/JS, tests, types), show the user:

1. **File path** and the raw conflict hunk only — the `<<<<<<< / ======= / >>>>>>>` region, not the full file diff.
2. **One sentence** on what the source PR was changing in that region.
3. **Two or three concrete options**: "take source", "take target", "merge as: `<exact text>`".

**Do not edit the file until the user picks an option.**

### When to abort

If a conflict is too complex to propose a clear resolution — deeply intertwined logic, large refactors, files you can't confidently reason about — **abort immediately** rather than guessing:

```bash
git cherry-pick --abort
```

Then explain to the user:
- Which file(s) are the problem and why they're hard.
- What the source PR was trying to do.
- Which commit(s) or PR(s) on the target branch are causing the conflict (check `git log --oneline <conflict-file>` on the target branch).
- Suggested next steps: port the change manually, ask the original PR author, or skip this branch.

Stopping cleanly with a clear explanation is more helpful than a broken backport.

### If the backport process already exited (manual fallback)

If the backport tool exited before pushing (e.g. the agent already ran `git cherry-pick --continue` manually and the process is gone), recover by pushing and opening the PR yourself. Inside `~/.backport/repositories/elastic/kibana`:

```bash
# The fork remote is named after the GitHub username, NOT "origin"
git remote -v   # find the right remote name

git push <fork-remote> backport/<X.Y>/pr-<PR>

gh pr create \
  --repo elastic/kibana \
  --title "Backport #<PR> to <X.Y>: <original title>" \
  --base <X.Y> \
  --head <fork-user>:backport/<X.Y>/pr-<PR> \
  --label backport \
  --body "$(cat <<'EOF'
# Backport

This will backport the following commits from `main` to `<X.Y>`:
- [<original title> (#<PR>)](https://github.com/elastic/kibana/pull/<PR>)
EOF
)"
```

## Step 4 — Validate before pushing

Inside `~/.backport/repositories/elastic/kibana`, run a quick sanity check after staging the resolved files and before releasing the backport tool's prompt:

```bash
if [ -f scripts/check_changes.ts ]; then
  node scripts/check_changes.ts --ref HEAD~1
else
  # Older branches (e.g. 8.19) don't have this script — lint changed files instead
  node scripts/eslint --fix $(git diff --name-only HEAD~1 HEAD -- '*.ts' '*.tsx' '*.js')
fi
```

If validation fails due to a **Node version mismatch** (`Kibana does not support the current Node.js version`), say so explicitly rather than silently skipping — this is an environmental issue, not a code problem.

If it fails on something mechanical, fix and re-stage the files. If it fails on something non-trivial, abort and explain to the user.

## Step 5 — Report

After all branches are done, report:
- One line per branch: branch name → backport PR URL (or "aborted — see above").
- A brief note on any conflicts that were auto-resolved (so the user can sanity check them).
- Anything skipped or needing follow-up.

## Special cases

### Multiple PRs

`node scripts/backport --pr <N>` handles one PR at a time. For several PRs, do them sequentially — finish one completely before starting the next.

### Partial backport (some branches already done)

Only run for failed branches — the tool creates a duplicate PR if you re-run a branch that already succeeded. The kibanamachine comment shows which targets succeeded vs. failed.

### Author / committer identity

The tool uses the current `git config user.email`. Don't change git config without asking the user.

## What this skill does NOT do

- **Decide whether to backport** — policy call by the user.
- **Resolve semantic code conflicts unilaterally** — always propose options and wait.
- **Run the full branch-readiness suite** — that's the `branch-readiness-checks` skill. Suggest it after a non-trivial conflict resolution.
- **Merge the backport PR** — `autoMerge` is on by default; let CI handle it.
