---
name: dashboards-pr
description: Writes, creates or updates elastic/kibana PR titles and descriptions following the Kibana Dashboards team's conventions (problem, solution, before/after, how to test, collapsed review notes, checklist and risks). Invoke explicitly, e.g. `/dashboards-pr`, `/dashboards-pr #304512`, `/dashboards-pr update 305973`.
disable-model-invocation: true
---

# Dashboards PR

Write PR descriptions a reviewer with no context can digest in a minute: restate the problem from the linked issue, describe the solution at a high level, show it, and say how to test it. Put reviewer-only detail and the template checklist in collapsed blocks.

Scope: elastic/kibana only. For PRs that touch Nightshift plugins or packages, use the repo's `nightshift-pr-description` skill instead. Follow the repo's `kbn-github` skill for every `gh` call (`GH_PAGER=cat`, `-R elastic/kibana`, approval before any side effect).

## Modes

Pick the mode from the request:

- **Write:** draft the title and description only. Default when the request doesn't say "create", "open" or "update".
- **Create:** draft, then open a draft PR from the current branch.
- **Update:** rewrite the title and description of an existing PR, given its number or URL, or found from the current branch.

A Write or Create request switches to Update when the branch already has a PR (see step 2).

Every mode drafts first and touches GitHub only after approval, so word your progress messages as drafting until then: "Drafting a new title and description for #305973. Nothing changes on GitHub until you approve." Say "updating" or "creating" only when running the approved `gh` command.

## Issue input

The linked issue is the main source for the problem statement and the reproduction steps. First match wins:

1. **Explicit in the request:** `#304512`, a full issue URL, or several issues. Full URLs also work for issues in other repos.
2. **Existing PR body** (Update mode): its `Fixes` / `Closes` / `Part of` lines.
3. **Branch name:** a number of five or more digits, such as `fix/304512-legend-colors` or `issue-304512`.
4. **Commit messages** on the branch: `Fixes #N`, `Closes #N`, `Part of #N`.
5. **Conversation context**, such as an issue discussed earlier in the chat.
6. **None found:** ask once, offering "no linked issue" as an answer. With no issue, the problem statement comes from the user and the diff.

Confirm each candidate is an issue, not a PR, with `gh issue view <n> -R elastic/kibana --json number,title,state,url,labels`. A number that resolves to a PR is a related PR: mention it in Review notes if relevant, and keep looking for the issue.

Keyword choice:

- `Fixes` / `Closes` only when the PR fully resolves the issue.
- `Part of` for an umbrella issue or partial work, so GitHub doesn't auto-close it.
- When unclear, ask.

Before drafting, say which issue you picked and where it came from, e.g. "Using #304512 (from the branch name)".

## Workflow

1. **Check the repo.** `upstream` (or `origin`) must point to elastic/kibana. In any other repo, say this skill doesn't cover it and stop.
2. **Find the PR.** In Update mode, use the given number, or `gh pr view --json number` for the current branch. In Write and Create modes, run `gh pr list -R elastic/kibana --head <branch> --state open`; if one exists, say so and switch to Update mode.
3. **Gather context:**
   - the issue(s): `gh issue view <n> -R elastic/kibana --comments`;
   - Write and Create modes, or Update mode with the PR's branch checked out: `git fetch upstream main`, then the commits and diff from `git merge-base HEAD upstream/main`;
   - Update mode: `gh pr view <n> -R elastic/kibana --json title,body,labels,headRefName,files,commits`. When the current branch isn't the PR's `headRefName`, take the diff from `gh pr diff <n>` only;
   - the files touched, for the title area and labels.

   Done when you can state the user-visible problem, the user-visible change, and how to observe it. Ask for whatever is missing instead of guessing.
4. **Draft.** Read [kibana.md](kibana.md) and [examples.md](examples.md), then write the title, the body and the suggested labels following them and the rules below. In Update mode, carry over from the existing body (see "Carry over in Update mode").
5. **Self-check** the draft against "Before showing the draft" and fix every miss.
6. **Write** the body to `/tmp/pr-body-<branch>.md` (replace `/` in the branch name with `-`). Show in chat: the title (and the old title in Update mode), the body, the labels, the checklist ticks you inferred, any test steps you inferred but didn't verify, and what you dropped from the old body.
7. **Revise** on feedback by editing the same file, then show only what changed.
8. **Write mode** stops here.
9. **Create mode:** run the branch checks, wait for explicit approval of the title, body and labels, then open the PR (see "Creating the PR").
10. **Update mode:** after explicit approval, run `gh pr edit <n> -R elastic/kibana --title "<title>" --body-file /tmp/pr-body-<branch>.md`. Change labels only if they were approved too. Read it back with `gh pr view` and report the URL.

## Carry over in Update mode

The old body often holds material the diff can't recreate. Keep:

- every image and video (`<img>`, `<video>`, `user-attachments` and `github.com/.../assets/` URLs), placed in the Before/After table when you can tell which is which;
- checklist ticks the author made, unless the diff clearly contradicts one (say so in chat);
- `## Release note`, `## Impact` and `## Action` sections, tightened but not dropped;
- any concrete setup detail in the old test steps (data, settings, flags, license).

Everything else is source material to rewrite. List what you dropped and why in chat, the way examples.md does.

## Creating the PR

Branch checks, before asking for approval:

- **Current branch:** must not be `main` or a release branch (`8.x`, `9.x`, `x.y`).
- **Uncommitted changes:** if any, ask whether to continue without them. Never commit on the user's behalf.
- **Behind `upstream/main`:** mention it, but don't rebase.

After approval:

1. Push the branch to the fork: `git push -u origin <branch>`. Don't force-push unless the user asks.
2. Create the draft PR (`<fork-owner>` comes from the `origin` URL):

   ```bash
   GH_PAGER=cat gh pr create -R elastic/kibana --draft --base main \
     --head <fork-owner>:<branch> \
     --title "<title>" --body-file /tmp/pr-body-<branch>.md [--label <label> ...]
   ```

3. Read it back with `gh pr view` and report the URL, the draft state and the applied labels.

Leave the PR in draft with no reviewers and no comments; the author takes it from there.

## Writing rules

- Restate the issue's problem in user terms in one to three sentences, using names from the UI (panel, control, legend, setting), not code names.
- Describe the solution at a high level. At most one sentence of root cause, and only when it helps the reviewer.
- For any UI change or fix, add Before and After screenshots or videos, in a two-column table when there's one of each. With no media from the user or the old body, insert HTML-comment placeholders that describe the shot to take (view, data, zoom or state), and ask for the media. Never invent evidence.
- Add a visible `## Release note` section only when the title isn't enough.
- Keep the visible body (everything outside collapsed blocks) to roughly 150 words of prose.
- Write like the team PRs in examples.md: plain sentences whose subject is the thing the user sees ("The legend keeps...", "When a map uses..."), prose paragraphs, and only the headings from the kibana.md body order. Opening with "This PR introduces...", bold-labelled bullet lists, and file trees or `diff` blocks in the summary are the tells to rewrite.
- CI already reports type checks, Jest and lint, so leave their results out. Checks CI doesn't run (manual evals, manual browser testing) get one line in Review notes.

## How to test

Required whenever there's behavior someone can observe, including agent behavior in chat. Omit it only when nothing is observable.

- **Reproduce (bugs only):** if the issue has reproduction steps, link to them (the issue URL, or the comment permalink if they're in a comment) instead of copying them. If it has none and the bug isn't obvious from the summary, write short numbered steps that reproduce it on `main`.
- **Verify:** always write numbered steps to see the fix or the new feature on this branch. Make the setup concrete: sample data set, data view, chart type, setting or advanced setting. End with the expected result in user terms, e.g. "the legend keeps the same color after reordering".
- About three to six steps per list, derived from the issue and the diff. If a step can't be inferred (specific data, a license level, a feature flag), ask instead of guessing. List the steps you inferred but didn't verify in chat, not in the body.

## Collapsed sections

Each collapsed section is a visible `## Title` heading followed by a `<details>` block whose one-line summary is useful without expanding:

```markdown
## Identify risks

<details>
<summary>Medium: agent tool contract changes with no fallback</summary>

...

</details>
```

Keep `<summary>` to plain text. An `<h2>` inside it gets GitHub's fixed heading margins, which leave large gaps between stacked blocks.

Summary lines:

- **Review notes:** the groups it contains, e.g. "Where to start, intended behavior, extra changes, open items".
- **Checklist:** the count first, then why the unchecked items don't apply, e.g. "4 of 8 checked. The others don't apply: no UI text, user docs, config keys or functional tests changed". If an unchecked item does apply, name it: "4 of 8 checked. Flaky Test Runner still to run; the others don't apply".
- **Identify risks:** the level and the main risk, e.g. "Medium: agent tool contract changes with no fallback".

## Review notes

Written for human and AI reviewers alike: intent the diff can't show. The only place code names and small snippets are allowed. Use these `####` groups, in this order, and leave out any that would be empty:

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

- Build `## Checklist` and `## Identify risks` from the template as described in kibana.md ("Checklist source"), collapsed as above.
- Tick only what's verified in the session, confirmed by the user, carried over from the author's ticks, or evident from the diff and labels.
- Fill in risks honestly: level, what could go wrong, and why it's acceptable or how it's mitigated.

## Before showing the draft

Check each item and fix any miss before step 6:

- Title follows kibana.md: `[Area]` prefix, present-tense verb, sentence case, at most about 70 characters, no issue number or code names.
- The `Fixes` / `Closes` / `Part of` line uses a full issue URL and the right keyword.
- Visible prose is about 150 words or less; count it.
- The problem and the solution use UI names; code names appear only in Review notes.
- UI changes have a Before/After table, with real media or descriptive placeholders.
- How to test ends with an expected result in user terms.
- Every template checklist item is present verbatim, and the summary count matches the ticks.
- Every `<details>` has a useful one-line `<summary>` and its own visible `##` heading.
- Update mode: every image and video from the old body is still present.
