# Log Relationship Maintainer — Approach Comparison

> **Status:** Decision document. Compares two candidate engines for the **log-source** relationship
> maintainer path. Entity-index configs (`administers`, `owns`) are out of scope and unchanged in
> both options.
>
> **Date:** 2026-08-03
> **Branch:** `280917-maintainers-optimizations`

---

## The two candidates

### A — DSL + ES|QL, whole-window aggregation (no time-slicing)

Two-phase per run, no intermediate storage:

```
DSL composite agg over raw logs  →  page of distinct actors (actor-disjoint, `after` cursor)
  for each actor page:
    ONE ES|QL query over the FULL 30-day window, filtered to this page's actors
      → STATS access_count = COUNT(*) BY actorUserId, targetEntityId
      → counts arrive ALREADY SUMMED across the whole window
    projectRelationshipRecords (bucketed split | standard collapse)
    writeEntityIds(page)                 // plain OVERWRITE
    writeRelationshipMetadatas(page)
  advance composite `after` cursor → next page
```

The distinguishing property: **the ES|QL query spans the entire window in one shot.** There is no
slice loop, no per-slice counting, no accumulator. `COUNT(*)` returns the 30-day total directly.

> This is *not* the time-sliced engine currently on the branch. Time-slicing (probe → boundary →
> per-slice extract) is a third, superseded option — it is the thing that introduced the split-day
> classification bug, and it is discarded in both candidates here. Where this document says
> "DSL+ES|QL" it always means the whole-window variant above.

### B — Two-step ES|QL with a daily-aggregation index

Two ES|QL steps against *different* indices, with a persisted index between them:

```
STEP 1  (raw logs → daily-aggregates index)     [incremental: only days since watermark]
  days = daysToCompute(lastComputedDay, today, 30)   // first run: 30 days; else: today only
  for each day D:
    ES|QL over raw logs for [D, D+1)
      → STATS access_count = COUNT(*) BY actorUserId, targetEntityId
    upsert one doc per actor: _id = sha256(maintainer|integration|actor|day)
    advance lastComputedDay = D

STEP 2  (daily-aggregates index → entity store)  [always full 30d rolling]
  ES|QL over the daily index, day >= now-30d
    → SUM(count) BY actor, target → collapse to one row per actor
  for each actor page:
    projectRelationshipRecords
    writeEntityIds(page)                 // plain OVERWRITE
    writeRelationshipMetadatas(page)
```

Full plan: `docs/superpowers/plans/2026-07-30-daily-incremental-log-maintainer.md` (15 TDD tasks).

---

## Shared prerequisite — applies to both

**The `localNamespaceFastPath` EUID optimization is required by both approaches and is a cost of
neither.**

Measured on `logs-system.auth` (~700M docs, 30-day lookback):

| Query shape | Runtime |
|---|---|
| Engine-generated (full EUID/namespace EVALs, ~13 fields materialized) | ~300s (timeouts) |
| Medium (namespace chain removed, field checks kept) | ~32s |
| Hand-minimized (hardcoded `@local`; only `user.email` / `user.name` / `host.id`) | **~11s** |

The 26× difference is **field materialization in the EUID/namespace EVAL chain — not window span.**
Both candidates read raw logs through the same EVAL chain, so both need the fast path. It is a
prerequisite, not a differentiator, and it should not be counted as a pro or con on either side.

This also reframes the original motivation: time-slicing was a workaround for a cost that was never
actually caused by the window length.

---

## Candidate A — DSL + ES|QL, whole-window aggregation

### Pros

1. **Composite agg gives actor buckets out of the box.** Distinct actors are iterated safely with an
   `after` cursor, with no accumulation and nothing written to intermediate memory or an index.
   Updates are written per page as you go.

2. **Actor-disjoint pages make plain overwrite correct.** Because each page carries an actor's
   complete target set for the whole window, `writeEntityIds` can replace
   `entity.relationships.<relType>.ids` outright. No server-side array union, no Painless scripting.

3. **Correct bucketed classification, by construction.** `COUNT(*)` over the full window returns the
   30-day total in a single number. A pair with 2 accesses on Monday and 3 on Tuesday arrives as
   `5` — never as `2` and `3` separately. **There are no slices, so there is no split-day bug to
   solve.** This is the property the time-sliced engine lost and the daily index had to restore.

4. **Engine structure mostly unchanged.** `runIntegration` (the entity-index path for `administers`
   / `owns`) already has this shape. Keeping the log path aligned means one engine model to
   understand and maintain, not two.

5. **No new persisted state.** No index, no template, no mappings version, no ILM policy, no
   watermark, no idempotent install step. Nothing that can be half-created, drift, or need
   migration.

6. **Stateless and self-healing.** Every run recomputes from source. A bad run is corrected by the
   next run. No stored artifact can be silently wrong for 30 days.

7. **No first-run cliff.** Cold start and steady state cost the same. Nothing special happens on day
   one, after an upgrade, or after an index is deleted.

8. **Config changes apply immediately and retroactively.** Adjust a threshold, filter, or EUID rule
   and the very next run reflects it across the entire window.

9. **Composite `after` pagination is unbounded.** It genuinely streams arbitrarily many actors —
   this is a solved problem, not an open question.

10. **One failure domain.** The run either succeeded or it didn't. "Is the maintainer healthy?" is a
    one-part question.

### Cons

1. **Bucket explosion is a live, per-integration hazard.** `system_security` and `system_auth` were
   hand-optimized (dropping `user.id` from `customActor.fields`) to keep the composite bucket count
   manageable. Nothing in the engine prevents the same problem when a new integration is onboarded —
   and it surfaces as a slow or failing query at runtime, not as a design-time error.

2. **30-day windows risk timeouts on unoptimized integrations.** Even with the fast path, a
   high-volume integration re-reads the full window on every run. Sources larger than
   `logs-system.auth` may not fit the timeout budget.

3. **Cost is O(full window), forever.** Every run re-reads 30 days of raw logs. Nothing amortizes; as
   data grows, every run gets slower. The only lever is narrowing the window.

4. **Per-page ES|QL fan-out.** Each actor page issues its own ES|QL query with an actor filter. Many
   pages means many queries, each paying its own planning and scan cost. This fan-out is the
   original reported problem on production data.

5. **Two query languages in one pipeline.** DSL composite for actor discovery, ES|QL for targets.
   Two mental models, two sets of quirks, and two places for a filter to drift out of sync.

6. **Partial progress is lost on abort.** A run killed at 90% has produced nothing reusable; the next
   run starts from zero. If the task timeout is shorter than a full run, it may never converge.

7. **Wasted work on cold actors.** An actor with no activity for 29 days is re-read and
   re-aggregated on every single run.

---

## Candidate B — Two-step ES|QL with aggregation index

### Pros

1. **Incremental by design.** Steady-state work is one day's delta, not the full window. Cost is
   decoupled from window length — extending to 60 or 90 days costs nothing extra at runtime.

2. **Idempotent recompute.** `_id = sha256(maintainer|integration|actor|day)` means re-running any
   day overwrites cleanly. Backfilling a day or replaying a week after a bug fix is safe.

3. **Abort-safe with real progress.** The watermark advances per completed day, so a run killed
   after day 3 of 30 keeps three days. This is what makes the first run survivable under a task
   timeout at all.

4. **Step 2 is cheap and predictable.** It reads one small doc per active actor per day — kilobytes,
   not hundreds of millions of documents. Its runtime barely varies with raw log volume.

5. **One query language.** ES|QL throughout, both steps.

6. **The daily index is independently useful.** It is a queryable record of per-day actor→target
   activity. "Why did this relationship appear?" becomes a lookup instead of a re-derivation.

7. **Correct bucketed classification.** Step 2 sums across all daily docs before applying the
   threshold, so a split-day pair totals correctly.

   *Note: this is a pro relative to the time-sliced engine, **not** relative to Candidate A.*
   Candidate A gets the same correctness for free by never slicing. Both candidates are correct
   here; only the discarded time-sliced approach was not.

### Cons

1. **Another index to own.** Index, template, mappings version, ILM policy, alias, and an idempotent
   install path — all new operational surface.

   On **stale data**, the design does answer this: ILM `data_retention: '35d'` (30-day window plus a
   5-day buffer), *and* Step 2 independently filters `day >= now-30d`. Belt and braces, so retention
   lag cannot leak old days into a total. Treat this as **resolved in design, unproven in
   practice** — the residual risk is a deployment where ILM isn't applied and the index grows
   unbounded. Worth an explicit health check.

2. **First run still processes the full 30 days.** Precisely: 30 *sequential single-day* queries,
   not one 30-day query. That shape is also the mitigation — each is small and independently
   committed, and the watermark means a killed first run resumes rather than restarts. So the first
   run is **slow but survivable**, where Candidate A's equivalent is **slow and all-or-nothing**.

3. **Config changes are not retroactive.** Change an EUID rule, filter, or threshold and only *new*
   days reflect it. The prior 29 days keep the old semantics until they age out or you force a
   backfill. This is the most underrated cost of the approach.

4. **Two write paths that must stay consistent.** Step 1's `targetCounts` shape and Step 2's parse
   contract have to agree, and they are written and tested separately.

5. **Open question — can ES|QL iterate a `flattened` field's keys?** Task 9 does not yet know. If it
   cannot, Step 1 must *also* write a parallel `targetCountPairs: keyword[]` for Step 2 to
   `MV_EXPAND`, which reaches back into the mapping (Task 4) and the writer (Task 6). **This is the
   largest open technical risk in the plan.**

6. **Open question — Step 2 pagination.** Single-page vs. paginated is undecided. If an integration
   exceeds `COMPOSITE_PAGE_SIZE` actors, Step 2 needs keyset pagination — which is precisely what
   DSL composite gives Candidate A for free. Until this is settled there is a silent-truncation risk
   that Candidate A does not structurally have.

7. **Two failure domains.** Step 1 can succeed while Step 2 fails, or the index can be present but
   stale. Health becomes a two-part question.

8. **Substantially more code.** ~15 tasks and ~10 new files, versus a config-and-query change.

---

## Summarized tradeoffs

### Side by side

| Dimension | A — DSL + ES|QL (whole window) | B — Two-step + aggregation index |
|---|---|---|
| Steady-state cost | O(full 30d window) every run | O(1 day) delta |
| First-run cost | Same as every run | 30 sequential day-queries (resumable) |
| Bucketed correctness | ✅ Correct (never slices) | ✅ Correct (sums before classifying) |
| Persisted state | None | Index + template + ILM + watermark |
| Abort behaviour | All-or-nothing, restarts | Per-day progress, resumes |
| Config change scope | Immediate, retroactive to full window | New days only; old days keep old semantics |
| Actor pagination | Solved (composite `after`) | **Open question** |
| Query languages | DSL + ES|QL | ES|QL only |
| Failure domains | One | Two |
| Idempotent replay | N/A (stateless) | Yes, by deterministic `_id` |
| Open technical risks | None | Flattened iteration; Step 2 pagination |
| Implementation size | Config + query change | ~15 tasks, ~10 new files |
| Needs `localNamespaceFastPath` | Yes | Yes |

### What actually decides this

**The split-day classification bug is not a differentiator between these two.** That was the
decisive argument *against the time-sliced engine*, and it retired that option. Both candidates here
aggregate over the whole window before classifying, so both are correct. Any comparison that still
leans on split-day correctness to justify B over A is comparing against the wrong baseline.

With correctness equalized, the real axis is **recompute cost versus operational complexity**:

- **Candidate A** is simpler, stateless, self-healing, immediately responsive to config changes, and
  has no unresolved technical questions. Its ceiling is that per-run cost never improves and bucket
  explosion remains a per-integration hazard that must be managed by hand at onboarding.

- **Candidate B** is dramatically cheaper in steady state and degrades gracefully as data grows. It
  pays for that with persistent state, a first-run cliff, loss of retroactivity, two open technical
  questions, and roughly an order of magnitude more code.

**The deciding question is whether whole-window recompute actually fits the runtime budget on the
largest integration you intend to support — measured with the fast path applied.**

- If a fast-path whole-window query on the worst realistic integration lands comfortably inside the
  ES|QL timeout, Candidate A's simplicity is hard to justify trading away. The ~11s figure on ~700M
  docs suggests there is real headroom.
- If it does not fit, or if you expect volume growth to erode that headroom within the horizon you
  care about, Candidate B's incrementality stops being an optimization and becomes the only approach
  that scales.

### Recommendation on sequencing

Both open questions and the deciding question are cheap to answer empirically, and all three change
the calculus:

1. **Measure a fast-path whole-window query on the largest integration in scope.** This single
   number decides the comparison. Everything else is secondary.
2. **Test whether ES|QL can iterate a `flattened` field's keys** (Task 9's open question). If it
   cannot, Candidate B's cost estimate grows.
3. **Determine whether any real integration exceeds `COMPOSITE_PAGE_SIZE` distinct actors.** If none
   do, Candidate B's pagination question is moot; if some do, it is real work.

Resolve these before committing to the 15-task implementation. Candidate A is the lower-risk default
if measurement (1) comes back comfortable — and notably, the `localNamespaceFastPath` work is
required either way, so it can be done first without prejudicing the decision.

---

## Related artifacts

| Artifact | Status |
|---|---|
| `docs/superpowers/specs/2026-07-30-daily-incremental-log-maintainer-design.md` | Approved design for Candidate B |
| `docs/superpowers/plans/2026-07-30-daily-incremental-log-maintainer.md` | 15-task TDD plan for Candidate B |
| `docs/maintainers-esql-2step-aggregation.png` | Flow diagram for Candidate B |
| `.../maintainers/engine/HANDOFF-dsl-esql-vs-timeslicing.md` | Handoff context |
| `docs/superpowers/specs/2026-07-30-bucketed-count-across-slices-design.md` | ⛔ SUPERSEDED — patched the time-sliced bug |
| `docs/superpowers/specs/2026-07-26-relationship-maintainer-time-sliced-esql-design.md` | ⛔ SUPERSEDED — the time-sliced engine |
| GitHub issue | https://github.com/elastic/kibana/issues/280917 |
