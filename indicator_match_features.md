# Indicator Match rule type — feature inventory

Rule type: `siem.indicatorRule` / `threat_match` (`INDICATOR_RULE_TYPE_ID`).
Verified against Kibana `main` by reading the implementation under
`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/indicator_match`.

---

## A. Core matching model

- **`threat_mapping`**: array of groups (min 1). Each group holds `entries[]` of `{ field, type: 'mapping', value, negate? }`. `field` = event-index field, `value` = threat-index field. **Groups are OR'd; entries inside a group are AND'd.**
- **No join. Direction is chosen by size.** The engine counts both sides, then pages the *smaller* one: events-first when `eventCount < threatListCount`, else threat-first. For each page it builds a bool filter against the other index.
  - `create_threat_signals.ts:323`
- **Two query shapes** (`build_threat_mapping_filter.ts:153-212`):
  - *Single-entry group, both sides terms-eligible* (keyword / constant_keyword / wildcard / ip, via `field_caps`): the whole page collapses into **one `terms` query** (a single-field `IN`).
  - *Multi-entry (AND / tuple) groups, or non-terms fields*: **one named `bool` clause per (document × group)**, values inlined, all OR'd under `should` / `minimum_should_match:1`.
- **`negate` ("does not match")** compiles to `must_not match` for a present value, or a bare `exists` when the other doc lacks the field.
  - `build_threat_mapping_filter.ts:97-124`
- **Multi-valued guard on the supplying side**: `value.length === 1` is required; the terms path uses only the first element.
  - `build_threat_mapping_filter.ts:64-65,82`
- **`maxClauseCount` recovery**: parses the ES limit out of the error, shrinks `chunkPage`, and restarts pagination.
  - `create_threat_signals.ts:209-285`
- **Concurrency knobs**: `itemsPerSearch` (default `MAX_PER_PAGE = 9000`), `concurrentSearches` (default 1); `perPage = concurrentSearches * itemsPerSearch`.

---

## B. Index sources / paging / CCS

- **Event side**: index patterns *and* data views (`dataViewId` → `runtimeFieldMap` resolved into runtime mappings). **Threat side: index-pattern strings only** — no data-view support.
- **Threat paging**: PIT (`keep_alive` `THREAT_PIT_KEEP_ALIVE`, `allow_partial_search_results: true`) + `search_after` sorted `['_shard_doc', {'@timestamp':'asc'}]`. Event side: plain `search_after`, no PIT.
  - `get_threat_list.ts:84-94`
- **Timestamp**: `primaryTimestamp = timestampOverride ?? '@timestamp'`, with a secondary-fallback range. **The threat search carries no time-range filter** — indicators match regardless of age.
- **CCS**: works at any license (no CCS-specific code; remote patterns flow straight into `count` / `search` / `openPointInTime`).
- **Rule type license = `basic`**; suppression is Platinum (see section E).

---

## C. Deduplication

- **Alert `_id` is deterministic**: `sha256(event._index + event._id + String(event._version) + "${spaceId}:${ruleAlertId}")`. No indicator data and no execution tuple enter the id → **one source event = exactly one alert per rule + space**, no matter how many indicators matched. (`_version` is never requested, so it is the literal string `"undefined"`.)
  - `wrap_hits.ts:33-39`, `utils.ts` `generateId`
- **Ancestor self-filter**: `wrapHits` drops any hit whose `kibana.alert.ancestors` already includes this rule (prevents alerts-on-alerts).
  - `wrap_hits.ts:57-62`
- **Cross-run / cross-page dedup lives in the rule_registry persistence wrapper**, not in the IM code:
  - `filterDuplicateAlerts` pre-queries the alerts index by `_id` in chunks of 10,000 and removes ones already present.
    - `create_persistence_rule_type_wrapper.ts:116-162`
  - Bulk write is `create` keyed by `_id`, and **409 (already-exists) conflicts are swallowed** via `errorAggregator(response.body, [409])`.
    - `create_persistence_rule_type_wrapper.ts:387,679`
  - Net effect: the deterministic id + swallowed 409 make concurrent chunked searches safe (same event discovered twice → the second write is a no-op).

---

## D. Exceptions & value lists

- **DSL exception filter** is compiled once per run (`exceptionFilter`, a `must_not`) and applied to **both** the event query and the threat query. The threat-side application is explicitly questioned in code: `// Exceptions shouldn't apply to threat list??`. The same `exceptionFilter` also flows into `getThreatListCount` and the event count.
  - `get_threat_list.ts:51`
- **Small value-list exceptions** (keyword / ip / ip_range, within size limits) are inlined into that DSL filter.
- **Large value lists** are handled in memory: after each event page, `filterEventsAgainstList` removes matching events before bulk create. IM supports this; the ES|QL rule type does **not**.
  - `search_after_bulk_create_factory.ts:174-185`

---

## E. Alert suppression

- **License-gated at execution**: needs **Platinum**, even though the rule type itself is `basic`. `isAlertSuppressionActive = isConfigured && hasPlatinumLicense`.
  - `create_threat_signals.ts:310-316`
- **Group key**: `instanceId = objectHash([suppressionTerms, ruleAlertId, spaceId])`; `suppressionTerms` come from the event's fields per `alertSuppression.groupBy`, with multi-valued fields sorted for stability.
  - `suppression_utils.ts:68-86`
- **Suppression fields written**: `ALERT_INSTANCE_ID`, `ALERT_SUPPRESSION_TERMS`, `ALERT_SUPPRESSION_START` / `_END`, `ALERT_SUPPRESSION_DOCS_COUNT`.
  - `suppression_utils.ts:30-60`
- **`missing_fields_strategy`** (`suppress` default | `doNotSuppress`) and optional **`duration`** (per-execution vs time-window; time-window suppression searches the alerts index Kibana-side).
- **5× budget**: when suppression is configured, the per-run processing cap rises to `MAX_SIGNALS_SUPPRESSION_MULTIPLIER * maxSignals` = **5× `max_signals`**.
  - `constants.ts:13`, enforced at `create_threat_signals.ts:265-278`
- **Sort flips to `asc`** when suppression is *configured*, so suppression window boundaries are correct — at a documented performance cost.
  - `create_threat_signals.ts:318-321`
- **Enrichment interaction**: suppressed events' enrichments are dropped, not merged.

---

## F. Enrichment (`threat.enrichments`)

- Each enrichment object: `{ indicator (from threat_indicator_path), feed: {name}, matched: {atomic, field, id, index, type} }`. `matched.atomic` = the event's value; `matched.id` / `matched.index` identify the specific indicator document.
  - `enrich_signal_threat_matches.ts:24-105`
- **Which indicator matched which event comes from Lucene named queries** (`_name` + `matched_queries`) in a **dedicated second search against the threat index**, run in both execution directions. **Capped at 200 matches per signal** (`MAX_NUMBER_OF_SIGNAL_MATCHES`).
  - `get_signal_id_to_matched_queries_map.ts:87-192`
- **Key point for the migration**: enrichment is **already decoupled** from the detection query — it always comes from this follow-up named-query search.
