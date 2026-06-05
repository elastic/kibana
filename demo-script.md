# Demo script - AI-Assisted PR Review with Domain Knowledge

## Minute-by-minute (20 min total)

> All "filler" blocks below are **elastic** — they can stretch or compress depending on how `/dex-review-code` progresses. Time markers are targets, not hard cuts. Watch the terminals.

### 0:00 — 0:02 · Intro (2 min)

- "Hi, I'm Georgii. I lead the Rule Management team in SIEM Detection Engineering."
- "We're going to look at one claim today: **a code-review skill that knows your domain finds different — and much better — issues than a generic one.**"
- "I'm going to prove it on the same PR, side by side, live."
- Brief frame: "*The PR you'll see is a fake feature called Rule Birthdays. We planted 10 specific mistakes in it — mistakes my team has actually been bitten by in the past 18 months. Let's see which terminal catches what.*"

### 0:02 — 0:03 · Show the PR + kick off both runs (1 min)

- Switch to the browser. Scroll the PR description and one chunk of the diff. **Do not** read out the planted violations — let the skills find them.
- Switch to the terminals.
- In `WITH DOMAIN`: `/dex-review-code` ↵
- In `WITHOUT DOMAIN`: `/dex-review-code` ↵
- *Optional dramatic flair:* "*OK, ~7 minutes. Let's fill that time with the why and the how.*"

### 0:03 — 0:08 · Real-PR comparisons (5 min, ELASTIC)

This is the **strongest evidence** in the demo. The planted PR is the live spectacle; the real-PR comparisons are what convinces the room.

> Pre-made artifacts for this block: see [Real-PR comparison artifacts](#real-pr-comparison-artifacts) below — produced tomorrow (T-1 day). Curated subset: **A1 = #262307**, **A2 = #268724**, optional **A3 = #266112**.

Flow:
- "*Before we look at the live run, here's what this looks like on **real, merged PRs from our team's backlog.***"
- **A1 (90 sec) — #262307 (`rules/_search`)**: "*This PR is the seed of our domain knowledge — I reviewed it manually 6 months ago because generic AI tools missed major issues.*" Show 1 sharp with-domain comment (e.g. the `as` cast on aggregation, or the `FindRulesSortField` legacy-alias reuse) + 1 dull without-domain comment (style / null-safety).
- **A2 (90 sec) — #268724 (Rule Changes History API)**: "*Same comparison, totally different domain axis: the diff algorithm.*" Domain-aware catches the array-as-unit semantics (cited in `detection-rule-management.md` historical-catches section); generic talks about JSON parsing edge cases.
- **A3 (45 sec, optional) — #266112 (Alainna's *next* PR)**: "*Same author's follow-up — did the same issues recur, and would the AI catch them?*" Quick punchline. **If time is tight, skip.**
- Pull up to a one-line take-home: "*In each case the domain-aware review caught the architecturally-load-bearing issue. The generic review didn't.*"
- Reserve ~2 min of buffer in this block — if the live runs are taking longer, stretch the explanation.

**Framing reminder**: focus on the AI tool, NOT the engineer. "*Engineers caught these in manual review — we want to see whether AI tooling, with the right context, could have surfaced them earlier.*" PR numbers + titles on screen, no engineer names.

### 0:08 — 0:11 · How the domain knowledge actually works (3 min, ELASTIC)

- Switch to editor.
- Show `domain.json`: "*This is the entry-point. Slug, name, owners, code paths, knowledge files.*" (15 sec)
- Show `detection-rule-management.md`: scroll through, point at the section headers — "*What every reviewer must know, architectural invariants, common review patterns, security considerations, performance constraints, historical catches.*" (45 sec)
- Show slide B (discovery flow): "*When you run `/dex-review-code`, it diffs your branch, looks at the paths you touched, intersects them with the registered domains, loads the matching domain's knowledge files, and gives them to a reviewer subagent. That's it.*" (30 sec)
- Show how this knowledge was captured: "*It came from `/dex-domain-capture`. Code scan + PR mining + a structured interview with the domain expert.*" (30 sec)
- Show slide A (anatomy): briefly. (15 sec)

This block is the answer to the "how does the magic work" question that someone in the audience will mentally ask.

### 0:11 — 0:13 · Why AI needs specific information (2 min, ELASTIC)

- "*This is the part that I think gets underrated. We say LLMs are smart. They are. But smart is not the same as informed.*"
- "*The model doesn't know that `IDetectionRulesClient` is THE abstraction in our domain. It doesn't know that we got burned by an `as`-cast on `lastRunStatus` in PR #262307. It doesn't know that MSSP customers run 300 spaces × 10000 rules per space. We had to tell it.*"
- "*The quality of the review is proportional to the quality of what you tell it. That's what `dex-dev-skills` is about.*"
- Plug: "*`dex-dev-skills` is the company-wide library where these review and capture skills live. We'll show you in the hands-on how to extend it for your own area.*"

### 0:13 — 0:14 · Check both reviews completed (1 min)

- Switch back to terminals. Both should be at or past `Code review complete. Artifacts in: ...`.
- "*OK, both runs finished. Let's see what they got.*"
- If one is still running, narrate: "*Right terminal is still going — `without` is usually faster because it has fewer reviewer agents to dispatch. Let's give it 30 seconds.*"
- If a terminal **failed** (rare but possible): switch immediately to the backup recording for that terminal, no live debugging.

### 0:14 — 0:15 · Kick off `/dex-review-post` in both terminals (1 min)

- In both terminals: `/dex-review-post` ↵
- Both will ask for an event — pick **COMMENT** in both (we're commenting, not approving/rejecting our own PR).
- "*While these post, let's preview what each terminal *found* before it sends anything to GitHub.*"

### 0:15 — 0:16 · Quick preview of the comments file in both terminals (1 min, ELASTIC)

- In `WITH DOMAIN`: `cat ~/.dex-dev-skills/work/github/.../review-comments.md | head -40` (or open in editor).
  - "*~10 comments, mostly tagged "Domain invariant" or "Domain catch". Each one points at a specific invariant section.*"
- In `WITHOUT DOMAIN`: same `cat`.
  - "*~5 comments, mostly style and nullability. None of them name an architectural invariant.*"
- This is the **money shot** preview before the live PR view.

### 0:16 — 0:19 · Show and compare the posted reviews on the live PR (3 min)

- Switch to the browser. Refresh the PR.
- Both pending reviews should be visible — they're labeled in the review body with "🎯 With domain knowledge" and "🟢 Without domain knowledge" (we ensure this via the review-body content).
- Open the WITH DOMAIN review first. Click through 3 specific comments:
  - **Comment 1**: the camelCase leak (`alertTypeId` in response). Read the comment aloud — it should cite `Architectural invariants §3` and the canonical contract `RuleResponse`.
  - **Comment 2**: the `p-map` loop instead of `bulkEdit`. Read aloud — it should cite the MSSP-scale concern.
  - **Comment 3**: the business-logic-in-route violation. Read aloud — it should name the abstraction `IDetectionRulesClient` and the *thick API endpoint handler anti-pattern*.
- Open the WITHOUT DOMAIN review. Click through its top 3 comments.
  - They will be style / null-safety / minor-correctness items.
  - **Specifically point out** what's *missing*: "*Notice — no mention of `IDetectionRulesClient`, no mention of the canonical converter, no mention of true-bulk discipline. It can't have known any of that.*"
- One-line take-home: "*The without-domain review isn't *wrong* — it's just blind to everything that matters in this code.*"

### 0:19 — 0:20 · Outro & hand-off to Nir (1 min)

- "*Two takeaways:*"
  1. "*Domain knowledge is the difference between a review that wastes everyone's time and a review you'd actually take seriously.*"
  2. "*Domain knowledge is something you can capture in 30–60 min with `/dex-domain-capture` — which is what you'll do in the hands-on.*"
- "*Over to Nir to set you up.*"
