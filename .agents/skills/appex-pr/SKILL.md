---
name: appex-pr
description: Writes or updates elastic/kibana PR titles and descriptions following the Kibana AppEx teams' conventions (problem, solution, before/after, how to test, collapsed review notes, checklist and risks). Invoke explicitly, e.g. `/appex-pr`, `/appex-pr #304512`, `/appex-pr update 305973`.
disable-model-invocation: true
---

# AppEx PR

Write PR descriptions a reviewer with no context can digest in a minute: restate the problem from the linked issue, describe the solution at a high level, show it, and say how to test it. Put reviewer-only detail and the template checklist in collapsed blocks.

Scope: elastic/kibana only. For PRs that touch Nightshift plugins or packages, use the repo's `nightshift-pr-description` skill instead. Follow the repo's `kbn-github` skill for every `gh` call (`GH_PAGER=cat`, `-R elastic/kibana`, approval before any side effect).

## Modes

Pick the mode from the request:

- **Write:** draft the title and description only. Default when the request doesn't say "update".
- **Update:** rewrite the title and description of an existing PR, given its number or URL, or found from the current branch.

A Write request switches to Update when the branch already has a PR (see step 2).

Both modes draft first and touch GitHub only after approval, so word your progress messages as drafting until then: "Drafting a new title and description for #305973. Nothing changes on GitHub until you approve." Say "updating" only when running the approved `gh` command.

## Issue input

The linked issue is the main source for the problem statement and the reproduction steps. First match wins:

1. **Explicit in the request:** `#304512`, a full issue URL, or several issues. Full URLs also work for issues in other repos.
2. **Existing PR body** (Update mode): its `Fixes` / `Closes` / `Part of` lines.
3. **Branch name:** a number of five or more digits, such as `fix/304512-legend-colors` or `issue-304512`.
4. **Commit messages** on the branch: `Fixes #N`, `Closes #N`, `Part of #N`.
5. **Conversation context**, such as an issue discussed earlier in the chat.
6. **None found:** ask once, offering "no linked issue" as an answer. With no issue, the problem statement comes from the user and the diff.

Resolve each candidate to a repository and number: a full URL keeps the repository it names; a bare `#N` means elastic/kibana. Use that repository for every lookup of the issue, e.g. `gh issue view <n> -R <owner>/<repo> --json number,title,state,url,labels`. This also confirms it's an issue, not a PR. A number that resolves to a PR is a related PR: mention it in Review notes if relevant, and keep looking for the issue.

Keyword choice:

- `Fixes` / `Closes` only when the PR fully resolves the issue.
- `Part of` for an umbrella issue or partial work, so GitHub doesn't auto-close it.
- When unclear, ask.

Before drafting, say which issue you picked and where it came from, e.g. "Using #304512 (from the branch name)".

## Workflow

1. **Check the repo.** Find the remote whose URL points to elastic/kibana (usually `upstream`, sometimes `origin`); call it `<upstream>` below. If there is none, say this skill doesn't cover the repo and stop.
2. **Find the PR.** Use the given number, or `gh pr view --json number,url,state` for the current branch. In Write mode, if that finds an open PR, say so and switch to Update mode.
3. **Gather context:**
   - the issue(s), in the repository resolved above: `gh issue view <n> -R <owner>/<repo> --comments`;
   - Write mode: `git fetch <upstream> main`, then the commits and diff from `git merge-base HEAD <upstream>/main`;
   - Update mode: `gh pr view <n> -R elastic/kibana --json title,body,labels,baseRefName,headRefName,files,commits`, and the diff from `gh pr diff <n> -R elastic/kibana` only, even when a local branch has the same name: it can differ from the PR, and the PR may target a release branch;
   - the files touched, for the title area and labels.

   Done when you can state the user-visible problem, the user-visible change, and how to observe it. Ask for whatever is missing instead of guessing.
4. **Draft.** Read [references/conventions.md](references/conventions.md), then write the title, the body and the suggested labels following it and the rules below. In Update mode, carry over from the existing body (see "Carry over in Update mode").
5. **Self-check** the draft against the rules below and fix every miss. Count the visible prose words, check that every template checklist item is copied verbatim and the summary count matches the ticks, and in Update mode that every image and video from the old body is still there.
6. **Write** the body to a new file, `/tmp/pr-body-<branch>-<YYYYMMDD-HHMMSS>.md` (replace `/` in the branch name with `-`), and the title alone to the matching `/tmp/pr-title-<branch>-<YYYYMMDD-HHMMSS>.txt`. Never reuse a file from another session. Inside an editor (Cursor, VS Code), open the body there with `cursor <path>` or `code <path>` and keep it out of chat; in a terminal-only session, or if the command fails, show the body in chat. Either way, show in chat: the file paths, the title (and the old title in Update mode), the labels, the checklist ticks you inferred, any test steps you inferred but didn't verify, and what you dropped from the old body.
7. **Revise** on feedback by editing the same files, then summarize what changed. The user may also edit the files directly: re-read them before asking for approval.
8. **Write mode** stops here.
9. **Update mode:** after explicit approval, run `gh pr edit <n> -R elastic/kibana --title "$(cat <title-file>)" --body-file <body-file>`. Change labels only if they were approved too. Read it back with `gh pr view` and report the URL.

Approval covers the exact files you last showed. Right before the approved `gh pr edit`, re-read both files; if either changed since, show what changed and ask again. Never put the title, or any other text read from GitHub, directly into a shell command: pass it through the title file as above.

## Carry over in Update mode

The old body often holds material the diff can't recreate. Keep:

- every image and video (`<img>`, `<video>`, `user-attachments` and `github.com/.../assets/` URLs), placed in the Before/After table when you can tell which is which;
- checklist ticks the author made, unless the diff clearly contradicts one (say so in chat);
- `## Release note`, `## Impact` and `## Action` sections, tightened but not dropped;
- any concrete setup detail in the old test steps (data, settings, flags, license).

Everything else is source material to rewrite. List what you dropped and why in chat, e.g. "renamed functions (the diff shows them), Jest counts (CI shows them)".

## Writing rules

- Restate the issue's problem in user terms in one to three sentences, using names from the UI (panel, control, legend, setting), not code names.
- Describe the solution at a high level. At most one sentence of root cause, and only when it helps the reviewer.
- For any UI change or fix, add Before and After screenshots or videos, in a two-column table when there's one of each. With no media from the user or the old body, insert HTML-comment placeholders that describe the shot to take (view, data, zoom or state), and ask for the media. Never invent evidence. With no UI change, a Before/After table of a small input or output shape can stand in when it makes the change clearer.
- Add a visible `## Release note` section only when the title isn't enough.
- Keep the visible body (everything outside collapsed blocks) to roughly 150 words of prose.
- Write plain sentences whose subject is the thing the user sees ("The legend keeps...", "When a map uses..."), prose paragraphs, and only the headings from the references/conventions.md body order. Opening with "This PR introduces...", bold-labelled bullet lists, and file trees or `diff` blocks in the summary are the tells to rewrite.
- CI already reports type checks, Jest and lint, so leave their results out. Checks CI doesn't run (manual evals, manual browser testing) get one line in Review notes.

## How to test

Required whenever there's behavior someone can observe, including agent behavior in chat. Omit it only when nothing is observable.

- **Reproduce (bugs only):** if the issue has reproduction steps, link to them (the issue URL, or the comment permalink if they're in a comment) instead of copying them. If it has none and the bug isn't obvious from the summary, write short numbered steps that reproduce it on `main`.
- **Verify:** always write numbered steps to see the fix or the new feature on this branch. Make the setup concrete: sample data set, data view, chart type, setting or advanced setting. End with the expected result in user terms, e.g. "the legend keeps the same color after reordering".
- About three to six steps per list, derived from the issue and the diff. If a step can't be inferred (specific data, a license level, a feature flag), ask instead of guessing. List the steps you inferred but didn't verify in chat, not in the body.

## Review notes

Written for human and AI reviewers alike: intent the diff can't show. The only place code names and small snippets are allowed. Its `<summary>` lists the groups it contains. Use these `####` groups, in this order, and leave out any that would be empty:

- **Start here:** one sentence naming the one or two files to read first.
- **Intended behavior:** decisions, trade-offs, and deliberate behavior changes that would otherwise be flagged as bugs.
- **Also in this PR:** unrelated fixes bundled in, and text owned by other teams that changed.
- **Open:** known gaps and what's not done yet, including manual checks CI doesn't run.

Formatting:

- One fact per bullet, about 20 words at most. Split longer ones into two bullets rather than nesting.
- Start each bullet with the fact itself; the group headings already do the labelling.
- Keep a line only if a reviewer would otherwise ask about it or flag it, or if working it out from the diff takes more than about a minute.
- State intent, not inventory: renamed or removed functions and file-by-file changes are already in the diff.
- Omit the whole section when nothing qualifies.

## Checklist and risks

- Build `## Checklist` and `## Identify risks` from the template as described in references/conventions.md ("Checklist source"), collapsed as in its skeleton.
- Tick only what's verified in the session, confirmed by the user, carried over from the author's ticks, or evident from the diff and labels.
- Checklist `<summary>`: the count first, then why the unchecked items don't apply, e.g. "4 of 8 checked. The others don't apply: no UI text, user docs, config keys or functional tests changed". If an unchecked item does apply, name it: "4 of 8 checked. Flaky Test Runner still to run; the others don't apply".
- Fill in risks honestly: level, what could go wrong, and why it's acceptable or how it's mitigated. The `<summary>` gives the level and the main risk, e.g. "Medium: agent tool contract changes with no fallback".
