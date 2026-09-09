# Review: rna-program IM ES|QL assessment + gaps in our Elasticsearch tickets

Reviewed file: `~/rna-program/docs-security/detection-engine-v2/architecture/rule-type-indicator-match.md`
(pinned to kibana `7a7ce1c6`, dated 2026-07-29). Claims below were verified against current
Kibana `main` in this workbench.

## Verified accurate in the rna doc

The document is unusually accurate on v1 mechanics. The following were checked against source and hold:

- Alert `_id` formula `generateId(index, id, version, spaceId:ruleId)`; matched indicators do not participate in the id.
- IM is the **only** rule type that sets `ruleTaskTimeout` (`'1h'`); all others inherit the framework default.
- `items_per_search` default `MAX_PER_PAGE = 9000`.
- The value-list-exception TODO in the event count (`get_event_count.ts:82`).
- `maxClauseCount` formula `floor((limit-1)/(entries+1))`, with the nested variant dividing by `2*(entries+1)`.
- `MAX_CHUNK_SIZE = 1024` is dead code (only the definition and the generated `.d.ts` reference it).
- Query-type encodings: `tq` (term), `mq` (match).
- Two-direction enrichment sourcing: events-first reuses the already-built map; indicators-first re-fetches all matching threats at enrichment time (`build_threat_enrichment.ts`).
- Terms-eligibility set `{keyword, constant_keyword, wildcard, ip}`; field-caps error falls back to match mode.
- The exception filter is applied to the threat query too.

## Part A: Inaccuracies and imprecisions in the rna doc

### A1. Threat page size in the main loop is wrong by ~9x  (FOLLOW UP)
- **Location:** line ~126, "Indicator retrieval: the whole threat index, every run".
- **Claim:** "Default page size is `INDICATOR_PER_PAGE = 1000`".
- **Reality:** the bulk retrieval loop passes `perPage = concurrent_searches × items_per_search`, defaulting to **9000**, to `getThreatList`. The `1000` fallback only applies to the enrichment-map fetch (`getSignalIdToMatchedQueriesMap` calls `getThreatList` with no `perPage`).
- **Why it matters:** a reader concludes the main indicator scan pages at 1000 when it pages at 9000. Affects any scale/latency reasoning.

### A2. "WHERE IN not shipped" contradicts our own ES tickets  (FOLLOW UP - highest priority)
- **Location:** line ~294, "WHERE IN subquery" ("Status: not shipped ... targeted for tech preview in 9.5").
- **Conflict:** the Security-filed ES tickets #154849 and #154852 describe WHERE IN behavior in the present tense as if it exists ("WHERE ... IN (`<subquery>`) today: ...").
- **Action:** reconcile against current ES state (doc written 2026-07-29; verify as of now). Our entire ES-ticket framing assumes WHERE IN is real, so this needs a definitive answer.

### A3. LOOKUP JOIN version claims unverified and disagree with the other assessment  (FOLLOW UP)
- **Location:** lines ~253-255. "GA since 9.1", "multi-field `ON` GA 9.2", "complex conditions Preview 9.3".
- **Conflict:** the earlier internal (Fable) assessment put multi-key `ON` at 9.0.
- **Action:** verify all LOOKUP JOIN version numbers against ES release notes before quoting upstream. Not verifiable from Kibana code.

### A4. Omission: cross-type field pairs (ip vs keyword)
- The doc covers terms-eligibility and LOOKUP JOIN's same-named-column requirement, but never addresses that the current two-query design tolerates *different types on each side* via per-shard coercion, and that ES|QL's single-union-type resolution breaks exactly that.
- This is the gap our new cross-type ticket covers; it is absent from the doc.

### A5. Omission: range/CIDR containment
- The doc's eight-requirement list for a faithful IM does not include `ip_range`/numeric-range containment, which our ES ticket #154851 treats as a real supported type. The requirement list is under-scoped relative to our ticket set.

### A6. The doc predates most of our ES tickets  (FOLLOW UP)
- It references only #154846 and #154847; it never cites the ES epic #154845 or #154849 / #154851 / #154852.
- Its claim "Nothing tracks the Indicator Match type on v2 beyond the two Elasticsearch asks" (line ~13) is now stale (five sub-issues + the epic).
- **Action:** ask the author to refresh against the current ticket set.

## Part B: What our ES tickets are missing (surfaced by the rna doc)

### B1. No cross-links to overlapping existing ES issues  (FOLLOW UP - high value)
- Existing LOOKUP JOIN liberalization asks predate ours:
  - es#126934 (LOOKUP JOIN against any index type)
  - es#120655 (aliases and data streams)
  - es#132367 (lookup against a subquery)
- Our #154846 overlaps heavily. Without linking, #154846 risks being triaged as a duplicate or missing the momentum of the existing asks.
- **Action:** reference them from #154846 and frame it as the IM-motivated combination (ordinary/remote right side + returned identity).

### B2. No roadmap alignment  (FOLLOW UP)
- roadmap#60 / ppo#62 (tracking Jira EPD-387, esql-planning#25): committed ES work for `IN`/`NOT IN` over single- and multi-column lookup indexes plus value-lists-to-lookup.
- Our #154847 (tuple) maps directly onto the "multi-column" ambition. No ticket references the roadmap, so ES PM cannot see the connection.
- **Action:** cross-link #154847 (and the epic) to the roadmap.

### B3. No anti-join / negation-only ask  (FOLLOW UP - genuine missing capability)
- The doc identifies that "groups of only negated entries need anti-join semantics nothing provides."
- None of our tickets ask for correlated negation / anti-join against ordinary indices. #154847 covers positive tuple AND only.
- **Action:** file a dedicated ticket (draft available on request).

### B4. Scale: existing ES issue not cited, still no sub-issue  (FOLLOW UP)
- The doc notes IN-subquery "execution today is serial per subquery with coordinator-heap gathering (es#150536)."
- That is the coordinator-materialization ceiling flagged earlier as having no home in our epic.
- **Action:** reference es#150536 and decide whether to file our own scale ask.

### B5. IN-contract issues not referenced
- es#154269 (subquery "exactly one column" contract) and es#139197 (IN is non-correlated) are directly relevant to #154847 and #154852 and would strengthen them as corroboration.

### B6. #154846 should also rule out ENRICH
- Our "why existing constructs don't cover it" lists IN and LOOKUP JOIN but omits ENRICH (single `match_field`, stale force-merged snapshot). Adding it makes the ask airtight.

### B7. #154846 does not mention fan-out bounding
- A returning-rows join produces unbounded fan-out; IM bounds enrichment at 200 per event. Add a sentence noting Kibana handles this today, so the ES team knows it is not being asked to solve it.

## Suggested follow-up order

1. **A2** (WHERE IN status): resolve first, it underpins everything.
2. **B1 + B2** (cross-link existing ES issues and the roadmap): cheap, high value, avoids duplicate triage.
3. **B3** (anti-join/negation ticket): fills a real capability gap.
4. **A1, A6** (rna doc corrections): hand back to the doc author.
5. **B4, B5, B6, B7, A3** (strengthen existing tickets, verify versions).
6. **A4, A5** (confirm cross-type and range tickets are reflected in the rna doc's requirement list).
