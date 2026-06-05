# Demo idea - AI-Assisted PR Review with Domain Knowledge

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
