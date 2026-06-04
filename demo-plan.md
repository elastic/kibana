# Demo plan — AI-Assisted PR Review with Domain Knowledge

## Slot metadata

- **Workshop**: "AI-Assisted PR Review with Domain Knowledge" (Madrid all-hands, 90 min total, hands-on)
- **Slot title**: "Live demo: AI review + domain knowledge on a real SIEM PR"
- **Duration**: 20 minutes (extended from 15; hands-on shortened by 5 min)
- **Presenter**: Georgii Gorbachev (co-running with Nir Oren)
- **Doc**: [https://docs.google.com/document/d/1gzLUffBNlaOAD8L6-fXnZWm9wi3LGoKiVVNN9BmtS5o/edit](https://docs.google.com/document/d/1gzLUffBNlaOAD8L6-fXnZWm9wi3LGoKiVVNN9BmtS5o/edit)

## Demo claim (one sentence)

> Code review with domain-specific knowledge finds the architecturally load-bearing issues a senior domain engineer would flag; code review *without* domain knowledge misses them and surfaces shallow style chatter instead.

## What the audience leaves believing

After the 20 min, the audience should believe:
1. **Domain knowledge measurably changes review quality.** They saw a side-by-side comparison on the same PR.
2. **The domain-aware review's findings are *correct*, not just numerous.** Each finding points at a specific architectural invariant in the domain file.
3. **The mechanism is reproducible.** They've seen the `domain.json` + `domain-knowledge.md` pair that drives the differentiation and know `dex-domain-capture` produced it.
4. **They can capture their own domain.** Setup is small enough that they'll attempt it in the hands-on.

## Hardware / software setup (day-of)

- **One screen, two terminal panes side-by-side** (tmux, iTerm split, or two windows). Label them at the top: `WITH DOMAIN` (left) and `WITHOUT DOMAIN` (right).
- **Browser tab open** to the live PR on `elastic/kibana` — the planted `Rule Birthdays` PR, draft.
- **Editor (VS Code) open** to two files in advance:
  - `x-pack/solutions/security/plugins/security_solution/.agents/domains/detection-engineering/rule-management/domain.json`
  - `x-pack/.../rule-management/detection-rule-management.md`
- **Slides / overlay** with three reusable visuals (kept simple, no auto-advance):
  - **Slide A** "What's a domain knowledge file?" — anatomy of `domain.json` + the `.md` it points at.
  - **Slide B** "How discovery works" — flow: PR diff → matched paths → loaded domain → reviewer agent.
  - **Slide C** "Why AI needs specific information" — one-line claim + three bullets.
- **Backup recording**: a pre-recorded run of `/dex-review-code` against the planted PR in both terminals (recorded the day before). Stored on the local disk and on USB. Used if either live run hangs.

## Pre-demo checklist (T - 1 hour, T - 5 min)

### T - 1 hour
- [ ] Run the seed script once on the local Kibana instance to populate "today's birthday" rules.
- [ ] Open the planted PR in the browser; confirm it's draft, comments empty, no other reviews.
- [ ] Do a final dry-run of both terminals end-to-end (`dex-review-checkout` → `dex-review-code` → `dex-review-post`). Time each run, write the timings on a sticky note.
- [ ] Confirm any leftover pending reviews from previous dry-runs are deleted (`--repost` flag handles this) or manually clean on github.com.
- [ ] Confirm `gh auth status` and `node --version` in both terminals.
- [ ] Confirm the editor has the domain knowledge files pre-opened in tabs.

### T - 5 min
- [ ] Close noisy notifications (Slack, mail, calendar).
- [ ] Reset both terminals to a clean prompt.
- [ ] Pull up the planted PR in the browser, scroll to the diff (showing one of the violations) — this is the opening shot.
- [ ] Confirm the backup recording is loaded and ready to switch to.

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

## Real-PR comparison artifacts

### Full candidate pool (from user)

Nine PRs across four engineers. Picked because the user expects each to have meaningful contrast between domain-aware and generic review output:

| # | PR | Author | Why it's a candidate |
|---|---|---|---|
| 1 | [#262307](https://github.com/elastic/kibana/pull/262307) – Add `rules/_search` endpoint | Alainna | **Exemplary PR.** The domain knowledge file was *built from* the manual review of this PR. Generic AI reviews missed major issues; user had to add them manually. Highest-confidence contrast. |
| 2 | [#266112](https://github.com/elastic/kibana/pull/266112) – Aggregation support in prebuilt rule install/upgrade review | Alainna | Second PR from same author. User suspects the same major issues recur (the domain knowledge file specifically predicts "this PR will inherit the issues across multiple endpoints"). |
| 3 | [#268165](https://github.com/elastic/kibana/pull/268165) – Refine rules `_search`, install/`_review`, upgrade/`_review` API contracts | Alainna | Attempt to address the review comments on #262307. Interesting: does the domain-aware review now find *different* issues, or notice fixed ones? |
| 4 | [#271722](https://github.com/elastic/kibana/pull/271722) – Add `rulesClient.bulkCreate()` | Steven | Performance-heavy, high domain impact. Should exercise the true-bulk discipline + perf invariants. |
| 5 | [#268724](https://github.com/elastic/kibana/pull/268724) – Rule Changes History API | Maxim | **Documented historical catch in domain.md** (the MITRE array-as-unit diff semantics). Domain-aware should re-find it; generic should miss it. Highest-confidence contrast #2. |
| 6 | [#270446](https://github.com/elastic/kibana/pull/270446) – Instrument `DetectionRulesClient` with change tracking | Maxim | Touches the central abstraction. Likely to surface abstraction-boundary findings. |
| 7 | [#269617](https://github.com/elastic/kibana/pull/269617) – MVP UI for rule changes history | Maxim | UI PR. Open question whether domain knowledge yields much contrast on UI code (the domain.md is server-heavy). Useful to test. |
| 8 | [#272038](https://github.com/elastic/kibana/pull/272038) – Move prebuilt rule install/upgrade/revert into `DetectionRulesClient` | Maxim | Refactor pulling code into the central abstraction. Should be relatively clean — useful as a counterpoint ("does the domain reviewer flag *fewer* issues on good code?"). |
| 9 | [#271550](https://github.com/elastic/kibana/pull/271550) – Fix delete-all limit for deprecated prebuilt rules | Davis | Small bugfix in perf-sensitive area. Useful as a *low-contrast* control — generic and domain reviews probably both have small footprint here. |

### Recommended subset for tomorrow's pre-runs (5 PRs, ranked)

Priority order — start at the top and work down until you run out of time or hit fatigue:

| Rank | PR | Reason | Estimated review time |
|---|---|---|---|
| **A1** | #262307 (Alainna #1) | Highest-confidence win. Domain.md was *built from* this PR. Almost guaranteed to produce a clean before/after. | ~10 min total (both terminals) |
| **A2** | #268724 (Maxim, Rule Changes History) | Second historical catch in domain.md. Different domain axis (diff algorithm, RFC 7396, MITRE) — gives narrative *breadth*. | ~7 min total |
| **A3** | #266112 (Alainna #2) | "*Same author wrote it again — did the AI catch the repeat?*" is a powerful story. Strong narrative if domain-aware catches what generic still misses. | ~8 min total |
| **A4** | #271722 (Steven, bulkCreate) | Adds a 3rd domain axis: perf / true-bulk. Bigger PR; uses more review time but expands the proof. | ~10 min total |
| **A5** | #272038 (Maxim, refactor into DetectionRulesClient) | Counterpoint: "*does the domain reviewer dial down on clean code?*" — only run if you have spare bandwidth. | ~8 min total |

**Minimum bar for the demo**: A1 + A2 done (~17 min of review running). Stretch: A1 + A2 + A3 (~25 min).

### Recommended subset to actually show in the demo (≤ 5 min slot)

In the demo block at **0:03–0:08**, use **A1, A2 + an optional A3**. Narrative:

- **A1 first (90 sec)**: "*This PR was the seed of our domain knowledge — let's see if a domain-aware review can find the same things I had to find manually 6 months ago.*" Show: 1 specific domain-aware comment that nails an architectural invariant (likely the `as` cast on aggregation, or the `FindRulesSortField` legacy alias reuse). Show: 1 specific generic comment that's about style/null-safety. Don't read both verbatim — quote the headlines.
- **A2 second (90 sec)**: "*Same comparison, totally different PR area — the diff algorithm in rule history.*" Domain-aware catches the array-as-unit semantics (cited in the historical-catches section of domain.md); generic talks about JSON parsing edge cases. Strong because it shows the domain-aware *transfers* to a topic that's not just "API design".
- **A3 if time (45 sec, optional)**: "*And here's the same author's *next* PR — the AI is starting to catch the pattern.*" Quick punchline.

### Framing notes (important — these are public PRs by named authors)

- The PRs and their authors are visible in the audience. The framing must be **"what the AI tool did vs. didn't do"**, not "what the engineer should have caught". Engineers caught these things (some of them); we're testing the *tool*.
- A safe framing: "*Reviewers caught issues here. We want to see whether AI tooling, with the right context, could have surfaced them earlier — saving review cycles. That's the proof we're after.*"
- Don't put engineer names on slides. PR numbers and titles are fine; they're public.

### Mechanics (T-1 day, tomorrow)

For each PR in the 5-PR set:

1. `cd ~/Code/elastic/kibana-no-domain` — confirm clean, on `main`, fetched.
2. `/dex-review-checkout <PR_URL>` — fetches PR + branches the local checkout.
3. `/dex-review-code` — let it run; **do not post**.
4. Capture the artifact path printed at the end. Save it.
5. Same in `~/Code/elastic/kibana-with-domain/`. Save artifact path.
6. Open both `review-comments.md` side-by-side. Pick **1 sharp "with" comment** + **1 dull "without" comment** for the demo. Save the pair as a screenshot or quote-pair under `~/Code/elastic/dex-dev-skills/workshops/madrid/real-pr-comparisons/pr-<N>/`.

You can parallelize within each terminal (review N while comparing N-1). Budget ~15 min per PR end-to-end.

**If you run out of time**: keep A1 + A2 minimum. Drop A3–A5 first; they're nice-to-haves.

## Risk mitigations & contingencies

### "A terminal hangs or fails mid-run"

- **Don't** debug live. Switch to the **pre-recorded backup** for that terminal.
- The backup recording is from a dry-run of the SAME planted PR, so the outputs match what the audience expects.
- Narrate briefly: "*Looks like we hit a model rate limit live — let me show you the recorded run from this morning.*" — don't pretend it's live.

### "Both reviews finish much faster than expected (3 min)"

- Compress the gap-fill content: cut PR #3 in the real-PR comparison, cut slide A, go straight to the comparison.
- It's better to have ~4 minutes of unused time at the end than to rush the comparison.

### "Both reviews take much longer than expected (10 min)"

- Stretch the "real-PR comparisons" block. Add a 4th PR or do a deeper walk on each.
- If still waiting at 0:13, swap one of the gap-fill blocks back in. You have ~5 min of optional content (slide C, dex-dev-skills positioning, Q&A buffer).
- **Hard limit**: if reviews are not done by 0:15, switch the *unfinished* terminal to the backup recording.

### "An audience question lands in the middle of the demo"

- Defer to the hands-on Q&A unless it's a 5-second answer.
- One canned response: "*Great question — let's hold that for the hands-on, where you can try it on your own PR.*"

### "A planted violation doesn't get caught by the domain reviewer"

- **Possible** — reviewer agents are non-deterministic. Mitigation:
  - The 10 planted violations include 2 "stretch" violations beyond the calibrated set, so even if 1–2 are missed, the comparison still looks strong.
  - The pre-made real-PR comparisons (which the audience sees BEFORE the live comparison) carry the primary evidential weight.
- If the live comparison undersells, do *not* call out the miss. Focus on what *was* caught.

### "Wrong terminal posted a review by mistake"

- Pending reviews can be deleted on github.com. If submitted in error, you have to live with it (the audience won't know).
- Reduce risk: the `/dex-review-post` step explicitly creates a **pending** review first; only the submission step posts publicly. Use COMMENT submission as planned.

### "PR has unexpected new comments / conflicts at demo time"

- Don't refresh the PR view aggressively. Refresh once before the demo and once after the posts.

## Demo state (start → end)

**Start state** (at 0:00):
- Planted PR is draft on `elastic/kibana`, no reviews posted yet.
- Both terminals at clean prompt, in their respective Kibana clones, on the demo branch.
- Browser open to the PR diff (one of the chunks visible).
- Editor open to the two domain knowledge files.

**End state** (at 0:20):
- Planted PR has **2 pending-then-COMMENT reviews** posted, one labeled "with domain", one labeled "without domain".
- Reviews are **left as COMMENT**, not approve/request-changes — we're not the rule's author and we don't want to ship review noise.

## Things that are NOT in the demo (intentional)

- **No `/dex-domain-capture` live demo.** It's a 30–60 min flow; can't fit. We mention it and the audience does it in the hands-on.
- **No `dex-review-checkout` step on-stage.** Both clones already have the demo branch checked out; we go straight to `dex-review-code`.
- **No live editing of the domain knowledge file** to show "what if we add this section, does it catch X?" — interesting but too slow for 20 min. Could be a follow-up demo.
- **No deep dive into the dex-dev-skills repo architecture.** We name-drop it; details are in `dex-dev-skills/docs/SETUP.md` and `ARCHITECTURE.md` for the hands-on.

## Open questions / parking lot

- (none yet — added during dry-runs)

## Post-demo wrap-up (notes for Nir)

After the slot ends:
- Nir takes over with "Setup + frame the hands-on exercise" (0:22–0:30 in the workshop agenda).
- The planted PR remains open with the two reviews on it — workshop participants can browse it during the hands-on if they want to see "what good looks like" for their own area.
