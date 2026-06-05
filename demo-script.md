# Demo script - AI-Assisted PR Review with Domain Knowledge

## Minute-by-minute (20 min total)

> All "filler" blocks below are **elastic** — they can stretch or compress depending on how `/dex-review-code` progresses. Time markers are targets, not hard cuts. Watch the terminals.
>
> **Important**: `/dex-review-post` is NOT run live during the demo. The reviews shown on PR #272773 at 0:15–0:19 are pre-posted from a dry-run; the live `dex-review-code` runs at 0:02 produce equivalent `review-comments.md` artifacts that we preview at 0:14–0:15. Honesty framing is built into the script at 0:13–0:14.

### 0:00 — 0:02 · Intro (2 min)

- "Hi, I'm Georgii. I lead the Rule Management team in SIEM Detection Engineering."
- "We're going to look at one claim today: **a code-review skill that knows your domain finds different — and much better — issues than a generic one.**"
- "I'm going to prove it on the same PR, side by side, live — plus show you the same comparison on two real PRs my team has merged in the last month."
- Brief frame: "*The live PR you'll see is a fake feature called Rule Birthdays. We planted 10 specific mistakes in it — mistakes my team has actually been bitten by in the past 18 months. Let's see which terminal catches what.*"

### 0:02 — 0:03 · Show the PR + kick off both runs (1 min)

- Switch to the browser. Scroll the PR description and one chunk of the diff. **Do not** read out the planted violations — let the skills find them.
- Switch to the terminals.
- In `WITH DOMAIN`: `/dex-review-code` ↵
- In `WITHOUT DOMAIN`: `/dex-review-code` ↵
- *Dramatic flair*: "*OK, ~7 minutes. Let's fill that time with the why and the how.*"

### 0:03 — 0:08 · Real-PR comparisons (5 min, ELASTIC)

This is the **strongest evidence** in the demo. The planted PR is the live spectacle; the real-PR comparisons are what convinces the room. The featured PRs and all quote text live in `demo-slides.md` (Slides 0, 1a, 1b).

Flow:

- **(30 sec) Slide 0 — framing.** "*Before we look at the live run, here's what this looks like on real, merged PRs from our team's backlog. Same skill, same code, two clones — one with the domain folder, one without. Two PRs today.*"

- **(2 min) Slide 1a — PR #271722 (`rulesClient.bulkCreate()`)**. Speak through the quote pairs on the slide:
  - "*The without-domain reviewer found a KQL escape gap and flagged the concurrency setting as a throughput regression. Both real, both worth fixing.*"
  - "*The with-domain reviewer found the same code — but called it `data-model leakage`, and **cited PR #262307 by name** as the historical catch the team got burned by.*"
  - Punchline: "*Without domain, the AI says 'escape your strings, raise your concurrency'. With domain, the AI says 'you just re-introduced the failure mode that bit us 6 months ago' — and it tells you which PR.*"

- **(2 min) Slide 1b — PR #272038 (refactor into `DetectionRulesClient`)**. Speak through the quote pairs:
  - "*Both reviewers caught the unsafe `as` cast and the missing change-tracking action. So far, parity.*"
  - "*Only the domain reviewer flagged the abstraction-boundary leakage — a type from a sibling domain's handler-level module leaking into the central `IDetectionRulesClient` interface. And only the domain reviewer noticed that the batched-loop pattern — explicitly called out in our domain knowledge as not scaling to MSSP customers — is now officially part of the new client contract.*"
  - Punchline: "*Generic finds the bugs. Domain finds the bugs PLUS the design issues that travel with the refactor.*"

- **(30 sec) Take-home.** "*In both cases the domain-aware review caught what a senior reviewer would have flagged — and named the invariant they violated. The generic review wasn't wrong; it was blind to everything our team has learned to refuse.*"

**Framing reminder**: focus on the AI tool, NOT the engineer. "*Engineers caught these in manual review — we want to see whether AI tooling, with the right context, could have surfaced them earlier.*" PR numbers + titles on screen, no engineer names.

### 0:08 — 0:11 · How the domain knowledge actually works (3 min, ELASTIC)

- Switch to editor.
- **Slide 2 (discovery flow, 30 sec)**: "*When you run `/dex-review-code`, it diffs your branch, looks at the paths you touched, intersects them with the registered domains, loads the matching domain's knowledge files, and gives them to a reviewer subagent. That's it.*"
- Show `domain.json` (20 sec): "*This is the entry-point. Slug, name, owners, code paths, knowledge files.*"
- Show `detection-rule-management.md` (60 sec): scroll through, point at the section headers — "*What every reviewer must know, architectural invariants, common review patterns, security considerations, performance constraints, historical catches.*"
- Show how this knowledge was captured (30 sec): "*It came from `/dex-domain-capture`. Code scan + PR mining + a structured interview with the domain expert.*"
- **Slide 3 (anatomy recap, 20 sec)**: side-by-side `domain.json` skeleton + `.md` section headers. "*Two files, that's the whole format. Anyone on your team can write these.*"

This block is the answer to the "how does the magic work" question someone in the audience will mentally ask.

### 0:11 — 0:13 · Why AI needs specific information (2 min, ELASTIC)

- **Slide 4** drives this whole block.
- "*This is the part that I think gets underrated. We say LLMs are smart. They are. But smart is not the same as informed.*"
- Walk the three bullets on the slide:
  - **The abstraction**: "*The model doesn't know that `IDetectionRulesClient` is THE abstraction in our domain.*"
  - **The history**: "*It doesn't know we got burned by an `as`-cast on `lastRunStatus` in PR #262307.*"
  - **The scale**: "*It doesn't know MSSP customers run 300 spaces × 10,000 rules per space. We had to tell it.*"
- "*The quality of the review is proportional to the quality of what you tell it. That's what `dex-dev-skills` is about — the company-wide library where these review and capture skills live. We'll show you in the hands-on how to extend it for your own area.*"

### 0:13 — 0:14 · Check both reviews completed (1 min)

- Switch back to terminals. Both should be at or past `Code review complete. Artifacts in: ...`.
- "*OK, both runs finished. Same skill, same code, two clones — only difference is the domain folder.*"
- **Honesty framing for the substitution**: "*The reviews you're about to see on GitHub came from a dry-run earlier today — same skill, same code, same domain folder as what just finished here. Posting live takes about 2 min and I'd rather spend that time on the comments themselves.*"
- If one terminal is still running, narrate: "*Right terminal is still going — `without` is usually faster because it has fewer reviewer agents to dispatch. Let's give it 30 seconds.*"
- If a terminal **failed** (rare but possible): say so plainly, then move on to the pre-posted reviews on GitHub — they're identical in content.

### 0:14 — 0:15 · Preview the live-run artifact (1 min, ELASTIC)

- In `WITH DOMAIN`: `cat ~/.dex-dev-skills/work/github/.../review-comments.md | head -40` (or open in editor). (~30 sec)
  - "*~10 comments, mostly tagged `Domain invariant` or `Domain catch`. Each one points at a specific invariant section.*"
- In `WITHOUT DOMAIN`: same `cat`. (~30 sec)
  - "*Fewer comments, mostly style, nullability, and a couple of real bugs. None of them name an architectural invariant.*"
- Bridge line: "*Same content. Now let me show you these as GitHub comments — where the team would actually see them.*"
- *Skip this block entirely if you're behind schedule* — go straight to the GitHub walkthrough.

### 0:15 — 0:19 · Walk pre-posted reviews on the live PR (4 min)

The full list of which comments to walk, with file paths and verbatim quote text, lives in `demo-slides.md` under "Comment IDs for screenshotting later". Use that as your reference card.

- Switch to the browser. Refresh PR #272773.
- Both reviews are labeled in the body: **🎯 Domain-aware review (WITH domain knowledge)** and **🤨 Generic review (NO domain knowledge)**.

**Open the WITH DOMAIN review first.** Click through 3 specific comments and read each aloud:

- **Comment A — API contract leakage.** On `birthdays_today_route.gen.ts:43` (or `birthdays_today_route.schema.yaml:56`). The review names `alertTypeId`, `createdBy`, `createdAt` as AF/SO storage-shape leaks and cites `RuleResponse` as the canonical contract. Read the "*contract is frozen once shipped — rename before landing*" line.
- **Comment B — `RulesClient` bypass.** On `birthday_helper.ts:60`. The review names this as violating "*the single hardest rule in the domain*" — direct ES access bypasses RBAC, space isolation, SO model versioning. Read aloud.
- **Comment C — bulk anti-pattern.** On `bulk_actions/route.ts:493`. The review names the `initPromisePool`-around-`bulkEdit` pattern as N individual `bulkEdit` calls and cites the MSSP-scale concern. Read aloud.

**Open the WITHOUT DOMAIN review.** Click through 3 comments:

- **Comment D — `Math.random()` in production data path** (`birthday_helper.ts:100`). Read aloud.
- **Comment E — `birthdayDate` not validated by Zod regex** (`route.ts:53`). Read aloud.
- **Comment F — Hardcoded `size: 1000` silently drops rules past 1000** (`birthday_helper.ts:50`). Read aloud.

**Closing line**: "*Generic catches real bugs — `Math.random()` in production, missing validation, silent truncation. Those are all worth fixing. But none of them name an architectural invariant. None of them cite the abstraction, the canonical converter, or the historical catch. That's the gap domain knowledge closes.*"

### 0:19 — 0:20 · Outro & hand-off to Nir (1 min)

- "*Two takeaways:*"
  1. "*Domain knowledge is the difference between a review that wastes everyone's time and a review you'd actually take seriously — one that names the invariants it's flagging.*"
  2. "*Domain knowledge is something you can capture in 30–60 min with `/dex-domain-capture` — which is what you'll do in the hands-on.*"
- "*Over to Nir to set you up.*"

## Risk mitigations & contingencies

### "A terminal hangs or fails mid-run"

- Don't debug live. Acknowledge it ("*looks like we hit a rate limit live*") and move on — the pre-posted reviews on GitHub at 0:15–0:19 are equivalent in content and carry the primary evidential weight regardless of the live run.

### "Both reviews finish much faster than expected (3 min)"

- Compress 0:14–0:15 (skip the artifact preview). Go straight to GitHub.
- Don't cut Slides 1a/1b — they're the strongest content. Cut the artifact preview first.

### "Both reviews take much longer than expected (10 min)"

- Stretch the slide blocks: linger on the editor, ask a rhetorical question on Slide 4, walk slowly through Slide 2.
- Hard limit: if reviews are not done by 0:14, skip the artifact preview at 0:14–0:15 entirely (the GitHub walkthrough doesn't depend on the live runs completing — only on the framing established at 0:13).

### "A live run finishes much faster than expected"

- Same as above: skip 0:14–0:15 and go straight to GitHub.
- Or use the extra time to walk a 4th comment in the WITH DOMAIN review on GitHub (the i18n-leak business-logic-in-utils comment is a good optional add).

### "An audience question lands in the middle of the demo"

- Defer to the hands-on Q&A unless it's a 5-second answer.
- Canned response: "*Great question — let's hold that for the hands-on, where you can try it on your own PR.*"

### "Wrong terminal posted a review by mistake"

- Not a risk this run — `dex-review-post` does not execute live.

### "PR has unexpected new comments / conflicts at demo time"

- Refresh PR #272773 once before the demo and once after the WITH DOMAIN walkthrough. Don't refresh aggressively.
- If the line numbers in the chosen Comments A–F have drifted (rare but possible if anyone rebased the demo branch), the comment text still resolves to the right code via GitHub's line-anchor fallback.

### "A planted violation doesn't get caught by the (live) domain reviewer"

- Possible — reviewer agents are non-deterministic. Mitigation: the pre-posted reviews on GitHub (which the audience sees from 0:15) are the primary evidence and are unaffected by the live run's outcome. The live runs are atmosphere, not proof.

## Demo state (start → end)

**Start state** (at 0:00):

- Pre-posted reviews are already on PR #272773: one labeled `🎯 Domain-aware review (WITH domain knowledge)`, one labeled `🤨 Generic review (NO domain knowledge)`.
- Both terminals at clean prompt, in their respective Kibana clones, on the demo branch.
- Browser open to the PR diff (one of the chunks visible).
- Editor open to the two domain knowledge files.
- Slide deck open at Slide 0.

**End state** (at 0:20):

- Two live-run `review-comments.md` artifacts on local disk (one per clone). Not posted.
- Pre-posted reviews on PR #272773 unchanged; the audience has seen 6 specific comments walked aloud (3 WITH, 3 WITHOUT).

## References

- **Slide content (per-slide outlines + verbatim quote text)**: `demo-slides.md`
- **Planted-PR problem statement and violation map**: `demo-test-pr-problem.md`
- **Broader rationale and PR pool**: `demo-idea.md`
- **Day-of checklist**: `demo-prep.md`
