# Setup — context-engine-team skill

One-time prerequisites for the workflows in this skill (creating issues/PRs, deriving issue briefs, and running the verification gates). Do these once per machine; verify with the checks at the bottom.

## 1. GitHub CLI (`gh`)

Used for every issue/PR operation and the native sub-issue GraphQL calls.

**Install:**
```bash
# macOS
brew install gh
# Debian/Ubuntu
sudo apt install gh
# other: https://github.com/cli/cli#installation
```

**Authenticate** (SSH is the team default for git operations):
```bash
gh auth login          # choose GitHub.com, SSH, and authenticate in the browser
gh auth status         # confirm you're logged in
```

**Required token scopes:** `repo`, `read:org`, and — for the Agent Builder project board (`elastic/1847`) — `read:project`. The default login usually lacks `read:project`; add it once:
```bash
gh auth refresh -s read:project
```
Symptoms of the missing scope: `INSUFFICIENT_SCOPES ... 'projectV2' field requires ... 'read:project'`. Without it, issue creation/linking still works — only `gh project item-add` fails.

**Repo access:** you must be able to see `elastic/search-team` (issues live here) and `elastic/kibana` (code + PRs). Check:
```bash
gh repo view elastic/search-team --json name -q .name
gh repo view elastic/kibana --json name -q .name
```

## 2. `claude` CLI on PATH

Required only by `scripts/derive_issue_from_conversation.sh` (the "analyze full conversation transcript" option), which spawns a separate `claude -p` so the transcript stays out of the calling agent's context.
```bash
claude --version       # must resolve on PATH
```
The script uses `claude --dangerously-skip-permissions -p` (this environment's headless convention) so the child can read the extract file without prompting. If your `claude` version rejects a flag, adjust it in the script.

## 3. `python3`

The transcript extractor embedded in `derive_issue_from_conversation.sh` is Python 3.
```bash
python3 --version
```

## 4. Conversation transcripts location

The derive script defaults to the newest transcript in:
```
~/.claude/projects/<project-slug>/
```
where `<project-slug>` is the project's absolute cwd with every `/` replaced by `-` (e.g. `/path/to/repo` → `-path-to-repo`). The script computes this from `pwd` automatically. If you run Claude from a different working directory than the one holding your session, override with the `CE_TRANSCRIPT_DIR` env var or pass the `.jsonl` path explicitly as arg 1.

## 5. Node 24 + nvm (for the PR verification gates)

`creating-prs.md` / `conventions.md` require **Node 24** for `scripts/type_check`, `scripts/eslint`, and `scripts/i18n_check` in the kibana repo.
```bash
nvm install 24.18.0     # once
nvm use 24.18.0         # before running the gates
```
Kibana also expects `yarn kbn bootstrap` after switching branches or on dependency errors (run from the kibana repo root).

## 6. Repo layout assumptions

- Code + PRs: the kibana checkout (this repo). The Context Engine plugin is at `x-pack/platform/plugins/shared/context_engine/`.
- Issues: `elastic/search-team`, driven entirely through `gh` (no local checkout needed).
- Feedback-loop source of truth (not yet merged): draft PR `elastic/kibana#282241` and the rebuild-handover gist. Fetch the PR with `gh pr diff 282241 --repo elastic/kibana` when you need loop specifics.

## 7. Make the helper script executable

Tracked with the executable bit, but if it was copied without it:
```bash
chmod +x .agents/skills/context-engine-team/scripts/derive_issue_from_conversation.sh
```

---

## Verify setup

```bash
gh auth status                                   # logged in
gh auth status 2>&1 | grep -q "read:project" && echo "project scope OK" || echo "run: gh auth refresh -s read:project"
gh repo view elastic/search-team --json name -q .name   # repo access
claude --version                                 # claude CLI present
python3 --version                                # python3 present
node --version                                   # v24.x for the gates
```
