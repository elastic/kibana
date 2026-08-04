# Creating Context Engine issues

Creating an issue is a **guided, plan-mode-style interview** — not a one-shot generation. Drive it with the **AskUserQuestion** tool (or plan mode) so the user can pick an option or type their own answer at each step.

There are **two kinds of issue**, and they look different:

- **A. Feature / Epic** — high-level, product-framed: *what* we're building and *why*, for whom, with user stories, scope boundaries, and the child tickets it breaks into. Often an epic. Implementation is left open.
- **B. Implementation task** — an engineering-owned, buildable chunk that tracks the actual progression of the work, usually **1:1 with a PR**. Uses the **four-section** structure and is detailed enough to hand to Claude Code.

An **epic (A)** is the parent; its **implementation tasks (B)** are the sub-issues, each mapping to one PR (see `creating-prs.md` for how a large piece of work is split into 1:1 PR-sized tasks).

Don't skip the interview because the task "seems clear" — picking the right kind and classifying requirements as hard-vs-open is the whole point.

---

## The guided flow

### Step 1 — Who is the requester? (ask first, if not already clear)

AskUserQuestion:
> **Are you creating this as engineering or product?**
> - **Developer / Engineer** — I'll ask implementation-shaped questions.
> - **Product / PM** — I'll ask outcome-shaped questions.

Product requesters usually want **A (feature/epic)**; engineers usually want **B (implementation task)** — but not always (an engineer often authors an epic too), so confirm the kind in Step 2.

### Step 2 — Which kind of issue?

AskUserQuestion:
> **What are we creating?**
> - **Feature / Epic (A)** — a high-level description of a capability, to be broken into tasks.
> - **Implementation task (B)** — a concrete, PR-sized unit of work under an existing epic.

This selects the **body template** (see below) and the labels. You may combine Step 1 and Step 2 into a single AskUserQuestion call (two questions).

### Step 3 — How much prior context should Claude capture?

AskUserQuestion:
> **Should I mine our conversation for the plan and decisions?**
> - **Analyze the full conversation transcript** — run the helper script over the raw session history (most thorough).
> - **Use what I already remember from this chat** — summarize from my current context, no script.
> - **Ignore the conversation** — build the issue only from your answers to my questions.

### Step 3a — Full-transcript capture (only if that option was chosen)

Run the helper — it spawns a **separate `claude -p`** over the conversation JSONL so the large transcript never enters your own context:

```bash
.agents/skills/context-engine-team/scripts/derive_issue_from_conversation.sh [TRANSCRIPT.jsonl] [OUT.md]
```

- With no args it uses the **newest** transcript in the current project's session dir (`~/.claude/projects/<project-slug>/`, derived from `pwd` — the live conversation), snapshotted before spawning the child so the child's own session file is never picked. Pass an explicit `.jsonl` path if ambiguous.
- It prints the path to a markdown **brief** (short description / hard product requirements / decisions taken with alternatives / open questions). **Read that brief**, then continue. Treat it as raw material to verify with the user — not final copy.

### Step 4 — Interview to completeness

Ask role- and kind-appropriate questions to fill every gap.

- For **A (feature/epic)**: nail down the persona(s), the user stories, what's explicitly **out of scope**, dependencies, and the rough breakdown into child tickets (and milestones/timeline for epics).
- For **B (implementation task)**: classify **each requirement** —
  - **Hard requirement** (must / acceptance criterion) → *Hard product requirements*.
  - **Open / possible approach** (decision not yet made) → present candidate approaches as an **AskUserQuestion** (options + free-type); record the choice under *Decisions taken*, leave the rest as **⚠️ OPEN**.

Ask follow-ups for ambiguity, missing acceptance criteria, or unstated dependencies. **Iterate** — prefer several small AskUserQuestion rounds over one giant prompt.

### Step 5 — Draft the body

Use the template for the chosen kind (see **Issue body structures** below).

### Step 6 — Preview & confirm (MANDATORY)

Never run `gh issue create` without showing a full preview (repo, title, labels, parent, body) and getting explicit confirmation. Offer "edit <field>" before creating. Editing labels/comments afterwards does not need confirmation.

### Step 7 — Create, label, link

Create in the right repo, apply labels, link to the parent (epic ← task; workstream ← epic) as a native sub-issue, and add to the project board (see **Mechanics**).

---

## Issue body structures

### A. Feature / Epic (product-framed)

```markdown
## Description
What the capability is, why, and for whom (3–5 sentences). Link the parent:
`Workstream: #<workstream>` (for an epic) or the theme it belongs to.

## User Stories
- As a [persona], I can [action] so that [outcome]
- … (4–6 stories)

## Out of Scope
- Explicit exclusions (2–4). What this epic deliberately does NOT do.

## Dependencies
- Blocked by / depends on other issues, teams, or upstream work (e.g. an
  upstream dependency).

## Child Tickets
```[tasklist]
### Tickets
- [ ] <link to implementation task B>
```

## Milestones (epics)
- M<n>: <target experience> — target <YYYY-MM> — #<epic/issue>
```

- Labels: `team:agent-builder` + `epic` (for epics). Keep implementation OPEN — no file paths or schemas here.
- The child tickets are **B** issues, created next and linked as sub-issues.

### B. Implementation task (the MANDATORY four sections)

This is what tracks the real implementation and maps **1:1 to a PR**.

```markdown
## Short description
2–4 sentences: what the task delivers and where it sits in the workstream.
Include `Epic: #<epic>` and `Depends on: #<n>` when there is an ordering dep.

## Hard product requirements
Observable, testable MUST-haves, written as outcomes (not implementation).
These are the acceptance criteria. Include load-bearing constraints when
relevant (feature flag, dependency direction, reviewer boundaries).

## Decisions taken
Concrete design/architecture decisions already made, each with the
alternative(s) considered and why this one was chosen — the "why it's built
this way" a prototyper should NOT relitigate. Mark unresolved points as
"⚠️ OPEN: <owner> — <what needs deciding>".

## Full description (implementation spec)
Self-contained spec: exact file paths, schemas, signatures, key behaviours,
verification steps, and the reviewers. Detailed enough to hand to Claude Code.
Reference the source of truth (PoC PR / rebuild-handover gist) rather than
re-deriving it.
```

- Title area-prefixed, e.g. `[Agent Builder] Context Engine — <area> — <chunk>`.
- One task ≈ one PR ≈ one reviewable semantic chunk (see `creating-prs.md` for the sizing/splitting rules the tasks should mirror).
- Why four sections: **Short description** orients a skimmer; **Hard product requirements** are the pass/fail contract; **Decisions taken** stop a prototyper re-opening settled architecture (and flag what's open); **Full description** is the Claude-Code-ready spec.

---

## Mechanics (repo, titles, labels, linking)

### Where issues live

| Issue kind | Repo |
|------------|------|
| Workstream, Epic, Task/Ticket, Sub-issue, Investigation, team-internal Bug | `elastic/search-team` (default) |
| Kibana product regression / plugin feature request | `elastic/kibana` |

The team's day-to-day work is almost always at the **Task/Ticket level or below** — B tasks under an existing epic for the relevant workstream, split into sub-issues. Creating epics/workstreams (A) is rarer.

### Titles (elastic/search-team)

| Type | Pattern |
|------|---------|
| Epic (A) | `[epic] [Agent Builder] <Name>` |
| Task/Ticket (B) | `[Agent Builder] <Name>` |
| Investigation | `[Agent Builder] Investigation: <Topic>` |
| Bug | `[Agent Builder][Bug] <Short description>` |

Sentence case after the prefix; under 80 chars. Area-prefix by workstream, e.g.: `[Agent Builder] Context Engine — <area> — <chunk>`.

### Labels

- Always: `team:agent-builder`
- Epics (A): add `epic`; user-facing stories: add `story`
- Optional board filter: `epic:<shorthand>` (e.g. `epic:feedback-loop`) on the epic **and** all its children.

### Link to the parent (native sub-issues)

The team uses GitHub **native sub-issues** (epic ← task, workstream ← epic). After creating a child:

```bash
PARENT_ID=$(gh issue view <parent-number> --repo elastic/search-team --json id --jq '.id')
CHILD_ID=$(gh issue view <child-number> --repo elastic/search-team --json id --jq '.id')
gh api graphql -f query="
mutation {
  addSubIssue(input: {issueId: \"$PARENT_ID\", subIssueId: \"$CHILD_ID\"}) {
    subIssue { number title }
  }
}"
```

Also reference the parent in the body (`Epic: #<n>` / `Workstream: #<n>`) and cross-link deps (`Depends on:` / `Blocks:`). When a task belongs to another workstream but is delivered here, reference both.

### Project board

```bash
gh project item-add 1847 --owner elastic --url "https://github.com/elastic/search-team/issues/<n>"
```

Requires the `read:project` token scope; if missing: `gh auth refresh -s read:project`.

### Gotcha — creating several sub-issues at once

Don't rely on parallel indexed bash arrays for titles + body-files (an off-by-one or empty element silently mis-pairs titles with bodies). Create one issue per explicit command, or verify afterwards:

```bash
for N in <numbers>; do gh issue view $N --repo elastic/search-team --json number,title --jq '"#\(.number) \(.title)"'; done
```

Patch `#TBD-n` cross-reference placeholders to real numbers in a second pass once all IDs exist.

---

## Checklist before creating

- [ ] Ran the guided flow: role determined, **issue kind chosen (A epic vs B task)**, context-capture mode chosen
- [ ] Correct repo (`elastic/search-team` for tasks/epics)
- [ ] Title follows the `[Agent Builder]`/`[epic]` convention, area-prefixed by workstream
- [ ] `team:agent-builder` label (+ `epic`/`story` as applicable)
- [ ] **A:** description / user stories / out-of-scope / dependencies / child tickets — implementation left open
- [ ] **B:** all four sections; requirements classified hard-vs-open; open items marked ⚠️ OPEN; reviewers named; ~1:1 with a planned PR
- [ ] Team constraints stated (dependency direction, feature flag, reviewer boundaries)
- [ ] Parent referenced (`Epic:`/`Workstream:`) and linked as native sub-issue
- [ ] Added to project `elastic/1847` (if scope available)
- [ ] Previewed and confirmed with the user
