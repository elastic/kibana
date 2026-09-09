# ES|QL migration: missing features to raise with the ES|QL team

Prepared for the ES|QL team meeting. Compiled from the RNA detection-engine-v2 rule-type docs and the three Elasticsearch epics:

- Indicator Match: [elastic/elasticsearch#154845](https://github.com/elastic/elasticsearch/issues/154845) (6 sub-issues)
- Threshold: [elastic/elasticsearch#154879](https://github.com/elastic/elasticsearch/issues/154879) (2 sub-issues)
- New Terms: [elastic/elasticsearch#154876](https://github.com/elastic/elasticsearch/issues/154876) (no sub-issues; a findings post)

In the Elasticsearch issue column, `None yet` means the gap has no ES issue filed. A `security-team#` link is a subscription/product item, not an ES|QL language feature.

---

## Indicator Match, epic [es#154845]

| Elasticsearch issue | Missing ES\|QL feature / problem |
| --- | --- |
| [es#154846] | No join that returns the **matched right-side (indicator) row** against an ordinary/remote index (the enrichment source); a semi-join carries nothing back. |
| [es#154847] | No **correlated multi-column (tuple/AND) membership** against ordinary indices; `IN` is single-column, non-correlated. |
| [es#154849] | The request-level filter **leaks into the `IN` subquery**; no way to scope the rule's time range to the outer `FROM`, so the threat index cannot stay unwindowed. |
| [es#154851] | **Range / CIDR containment** membership (e.g. `ip_range` indicators). See the caveat below. |
| [es#154852] | `IN` / `NOT IN` **multi-valued (any-element) and NULL semantics** differ from Lucene terms matching (silent zero or all matches). |
| [es#155881] | Join / `IN` **key across conflicting field types** (e.g. `keyword` vs `ip`); a single-query model needs one resolved type. Inline cast is rejected; only an `EVAL`-materialized cast works, and flattening `ip` to `keyword` is lossy. |
| [es#150536] | `IN`-subquery **scale**: coordinator-materialization ceiling, serial per-subquery execution. (ES issue exists, not Security-filed.) |
| None yet | **No request-level `runtime_mappings` in `_query`**: a data-view runtime field referenced by the rule resolves to `Unknown column` (no Painless in ES\|QL). |
| [security-team#15968] | Licensing: **ES\|QL CCS requires Enterprise**, vs `_search` CCS on Platinum. |

**Caveat on [es#154851] (range/CIDR):** local testing on ES 9.6 shows **`LOOKUP JOIN` can already express range containment** via non-equality `ON` (`sip >= range_start AND sip <= range_end`) over bound columns, so this is no longer a hard blocker. Reframe it as an *ergonomic* ask (native single-column `ip_range` containment) before raising, or it will read as already-solved.

---

## Threshold, epic [es#154879]

| Elasticsearch issue | Missing ES\|QL feature / problem |
| --- | --- |
| [es#154881] | **`COUNT_DISTINCT` accuracy (hard 40,000 ceiling) and performance** at high cardinality (the v1 team's primary blocker: the query works and passes tests but fails with performance errors here). Accuracy verified on ES 9.6: 50k true distinct returned 50,420 at default precision, 49,907 at max precision 40,000. The performance/circuit-breaker failure was not reproducible on a single-node local cluster. |
| [es#154883] | **Multi-index mapping type conflicts** (same field, different types across indices) break `STATS BY`. Verified (`verification_exception`, `[keyword]` vs `[long]`). An `EVAL` cast workaround rescues grouping, so this is ergonomic, not a hard blocker (see the caveat below). |
| None yet | **Arbitrary, silent truncation ordering** (no `SORT`), plus a hard 10k row ceiling. Lower priority: not primarily a count-loss issue (see the note below). Verified: 50k qualifying groups returned 1,000 (no `LIMIT`), 10,000 (`LIMIT 10000`), and still 10,000 (`LIMIT 50000`), with no `Warning` header. |
| None yet | **No request-level `runtime_mappings` in `_query`**: a data-view runtime field used as a grouping or cardinality field resolves to `Unknown column`; no Painless in ES\|QL. |
| None yet | **`flattened` grouping fields are not readable in ES\|QL.** V1 aggregates flattened subfields as keywords, but ES\|QL cannot address them (`Unknown column`) and v2 has no aggregation fallback. (`nested` and unmapped grouping fields produce no buckets in V1 either, so they are not a regression.) (Framework side: rna#59.) |
| [security-team#15968] | Licensing: **ES\|QL CCS requires Enterprise**, vs `_search` on Platinum; CCS-configured threshold rules on Platinum break on migration. |

**Note on the row cap (why it is lower priority):** this is *not* a count-loss regression. V1 already caps alerts per run at `min(max_signals, xpack.alerting.rules.run.alerts.max)` (defaults **100** and **1000**), which is below ES|QL's 10k row cap, so a rule emitting no more than 1000 alerts in V1 emits the same set in V2. The real gaps are narrower: (1) **non-deterministic truncation**, because when qualifying groups exceed the cap V1 drops the excess in deterministic composite-key order while ES|QL has no `SORT`, so the surviving set is arbitrary and shifts run-to-run (churns alerts, breaks episode/dedup continuity); (2) **no truncation warning** (V1 warns, V2 does not); (3) a **hard 10k ceiling** that only affects rules deliberately configured for more than 10k alerts per run (V1's `max_signals` is schema-uncapped and the framework cap goes to 100,000; ES|QL can never return more than 10k rows).

**Caveat on [es#154883] (type conflict):** the `EVAL` cast workaround **works for `STATS BY`** (unlike the IM `IN`-subquery case), so this is an ergonomic ask, not impossibility. Verified on ES 9.6 for `ip+keyword`, `long+keyword`, `date+keyword` (matching values on both sides):

- Direct `STATS BY k` always fails with `verification_exception` (incompatible types).
- `EVAL norm = TO_STRING(k)` collapses `ip+keyword` and `long+keyword` to **1 bucket**.
- **`date+keyword` needs `TO_DATETIME(TO_STRING(k))`, not `TO_STRING` alone:** the date side serializes with `.000` millisecond precision (`...00.000Z`) while the keyword side keeps the raw input (`...00Z`), so `TO_STRING` yields **2 buckets**; `TO_DATETIME(TO_STRING(k))` normalizes both to one instant, giving 1 bucket.
- The cast strategy must be chosen at query-construction time; per-cast performance overhead is unmeasured.

**V1 to V2 impact is asymmetric (important for framing):** only `ip+keyword` is a genuine regression risk. V1 `_search` returns 2 buckets for `ip+keyword` and the stable alert `_id` collapses them to 1 alert (works today), so requiring a cast in V2 is a real change. But `long+keyword` and `date+keyword` **already crash the V1 rule** (`ClassCastException` / HTTP 500, 0 alerts, verified), so ES|QL's clean `verification_exception` is *not* a regression there, arguably an improvement. Same family as IM [es#155881] and the range finding.

**The deeper problem: the cast requires knowing field types in advance.** `_search` needs no type knowledge (per-shard resolution); ES|QL needs the resolved type at query-build time, both to decide *whether* to cast and *which* cast to use.

*Real-world case that works in V1 but fails in ES|QL.* A threshold rule "at least 100 failed authentications from the same `source.ip`" over `index: ["security-logs-*"]`. The pattern spans an ECS-mapped source (`security-logs-auth-*`, where `source.ip` is `ip`) and a custom firewall stream imported from CSV (`security-logs-fw-*`, where `source.ip` was stored as `keyword`). Across the pattern `source.ip` resolves to `ip + keyword` (`field_caps` returns `['ip','keyword']`). Verified consequences:

- **V1** (`_search` composite): runs (HTTP 200). It returns two buckets for the same address (`203.0.113.5`: 150 events from the `ip` index, 70 from the `keyword` index); the 150 bucket exceeds the threshold, so **the rule alerts**.
- **V2** (ES|QL): `verification_exception` at plan time, so **the rule cannot run at all** unless `source.ip` is cast.

The natural ES|QL translation **fails** (verified):

```esql
FROM security-logs-*
| WHERE event.category == "authentication" AND event.outcome == "failure"
| WHERE source.ip IS NOT NULL
| STATS count = COUNT(*),
        from_ts = MIN(@timestamp), to_ts = MAX(@timestamp)
    BY source.ip
| WHERE count >= 100
| LIMIT 10000
-- verification_exception: Cannot use field [source.ip] due to ambiguities being
-- mapped as [2] incompatible types: [ip] in [...], [keyword] in [...]
```

It only runs once the conflicting key is cast (`TO_STRING` also merges the two split buckets into one group of 220):

```esql
FROM security-logs-*
| WHERE event.category == "authentication" AND event.outcome == "failure"
| EVAL src_ip = TO_STRING(source.ip)
| WHERE src_ip IS NOT NULL
| STATS count = COUNT(*),
        from_ts = MIN(@timestamp), to_ts = MAX(@timestamp)
    BY src_ip
| WHERE count >= 100
| LIMIT 10000
```

The `EVAL src_ip = TO_STRING(source.ip)` line is the one you can only add after a `field_caps` lookup tells you `source.ip` is `ip + keyword` on this index set.

(The conflict comes from the *custom* stream: index names under the built-in `logs-*` ECS templates get `source.ip` normalized to `ip`, so a genuine `ip + keyword` clash needs a source that is not ECS-templated, such as a raw CSV import.)

To know that `source.ip` here needs `TO_STRING`, that a consistently-typed field needs nothing, and that a field like `login_time` (`date` in one index, `keyword` in a CSV-ingested one) needs `TO_DATETIME(TO_STRING())`, the engine must call `field_caps` on that exact index set at build time and choose per field:

| Field resolves to | Correct ES\|QL grouping expression | V1 today |
| --- | --- | --- |
| one type everywhere (no conflict) | `BY <field>` (no cast; casting anyway adds cost and flattens the type) | works |
| `ip` + `keyword` (the `source.ip` case above) | `BY TO_STRING(source.ip)` | works and alerts (real regression) |
| `long` + `keyword` | `BY TO_STRING(field)` | already crashes (HTTP 500) |
| `date` + `keyword` | `BY TO_DATETIME(TO_STRING(field))` (`TO_STRING` alone splits into 2 buckets, `.000` precision) | already crashes (HTTP 500) |

You cannot pick the right row without `field_caps`, and you cannot blindly `TO_STRING` everything (it breaks the `date` case and pays a cost when there is no conflict). So a correct threshold query needs a **per-run `field_caps` preflight** (or fire-parse-the-`verification_exception`-and-retry) to choose casts per field. The New Terms ES|QL rewrite already does exactly this. It is worse under v2, where the query is recomposed statically from the persisted rule with no per-run substitution: mappings drift as indices roll over (a new `logs-myapp-*` backing index, a reindex), so a cast baked at authoring time can silently become wrong, and hand-authoring casts for a `logs-*` wildcard is not viable.

**So the ask is not "casting"; it is removing the build-time type-resolution burden** that `_search` never imposed: resolve multi-typed fields per-shard like `_search`, or auto-coerce grouping/join keys, or at minimum allow an inline cast on the key plus a documented type-agnostic normalization that also handles the date-precision case.

---

## New Terms, epic [es#154876] (no sub-issues)

| Elasticsearch issue | Missing ES\|QL feature / problem |
| --- | --- |
| [es#154876] | **`FIRST()` cannot consistently identify the first occurrence.** New Terms attributes each alert to the *introducing document* (the earliest event carrying the new value) and copies its fields. On tied earliest `@timestamp`s, `FIRST()` returns "any corresponding value", so which event is treated as the first occurrence is arbitrary and layout-dependent (verified end to end: the same data indexed in a different order attributed the alert to a different event, `alice` vs `bob`). This needs a **consistent secondary-sort tie-break** (e.g. break `@timestamp` ties by `_id`); `FIRST`/`TOP` offer none today. |
| [es#154876] | **No memory bound on the aggregation.** `STATS ... BY` keeps one group of state in memory for every distinct field combination, and each `FIRST(field)` carried for the alert adds more state per group. At high cardinality (multi-valued fields multiply the combination count), the total exceeds the request memory limit and the query fails (a `2 MV + 1 SV` field set failed at about 388 MB in testing, reported as a parent circuit-breaker error). ES|QL has no paged or per-request-bounded aggregation like v1's composite paging, and it cannot narrow the history aggregation to only recently-seen candidates the way v1 does (for multi-field rules that would need a multi-column `IN`, the same capability as [es#154847]). |
| None yet | **No in-query retrieval of the introducing source document.** A New Terms alert copies the full `_source` of the introducing document, but ES|QL cannot carry that through an aggregation: `STATS`/`FIRST` return only the group keys plus explicitly enumerated typed columns (no `FIRST(*)`, no `_source` passthrough, and each `FIRST` field adds per-group memory). The one shape that carries all columns, `INLINE STATS`, buffers the intermediate relation and fails at the default `esql.intermediate_local_relation_max_size` cap at New Terms cardinality (verified on ES 9.6; [es#142288] only made that cap configurable, not viable), so it is not an option. The realistic paths are a doc *reference* (`FIRST(_id)` / `TOP`) or a second `_msearch`, neither of which is a full in-query source document. Same family as [es#154846]. |
| [es#154883] / [es#155881] | **Multi-index type conflict on a `new_terms_fields` field**: `STATS BY` fails verification (same gap as Threshold [es#154883] and IM [es#155881]); v1 routes these to the aggregation fallback. |
| None yet | **No request-level `runtime_mappings` in `_query`**: a `new_terms_fields` data-view runtime field resolves to `Unknown column`; v1 falls back to aggregation. |
| None yet | **`flattened` `new_terms_fields` are not readable in ES\|QL.** V1 aggregates flattened subfields as keywords (verified: `labels.env` yields a term), but ES\|QL cannot address them (`Unknown column`) and v2 has no aggregation fallback. (`nested` and unmapped fields are *not* a regression: they produce no alerts in V1 either, verified 0 composite buckets.) (Framework side: rna#59.) |
| [security-team#15968] | Licensing: **ES\|QL CCS requires Enterprise**, vs `_search` on Platinum. |

**`FIRST` coherence is not guaranteed:** when several `FIRST()` calls extract different fields of the introducing document in one `STATS`, the contract ("any corresponding value") does not promise they come from the same tied document, so on tied timestamps the alert could mix fields from different events (a "Frankenstein" row). Observed coherent on ES 9.6 across repeated runs, but not guaranteed; a consistent tie-break also removes this risk.

**Multi-valued fields:** the semantics port. V1 expands each array value into its own term, and several multi-valued fields produce the cross product of their values (verified: one document with `host.name=[h1,h2]` and `user.name=[u1,u2]` yields 4 terms); ES|QL reproduces this with one `MV_EXPAND` per field before `STATS ... BY`. What does not port is the cost: that cross-product combination count is what drives the memory problem above, which v1 bounds by paging and ES|QL does not.

**New Terms epic is thin:** [es#154876] has no sub-issues, links no issues, and is tagged `>non-issue` by ES. It evaluates `INLINE STATS` and `STATS + FIRST`, while the shipped Kibana rewrite uses `STATS + _msearch`; [es#142288] only made the sub-plan cap configurable, so `INLINE STATS` is not a viable path and is not treated as an option here. Expect to re-frame its asks live.

---

## Notes

- **Framework/Kibana-side gaps are excluded** from this document (write-time dedup, source-document alert payload, partial-results handling, notification-time suppression, rule preview, the rule-window boundary literal). Those are v2/Kibana items, not ES|QL-team asks.
- Requirements that affect more than one rule type (type conflicts, runtime fields, nested/flattened fields, CCS licensing) are **repeated in each rule type's table** rather than centralized, so each section stands on its own.

[es#154845]: https://github.com/elastic/elasticsearch/issues/154845
[es#154846]: https://github.com/elastic/elasticsearch/issues/154846
[es#154847]: https://github.com/elastic/elasticsearch/issues/154847
[es#154849]: https://github.com/elastic/elasticsearch/issues/154849
[es#154851]: https://github.com/elastic/elasticsearch/issues/154851
[es#154852]: https://github.com/elastic/elasticsearch/issues/154852
[es#155881]: https://github.com/elastic/elasticsearch/issues/155881
[es#150536]: https://github.com/elastic/elasticsearch/issues/150536
[es#154879]: https://github.com/elastic/elasticsearch/issues/154879
[es#154881]: https://github.com/elastic/elasticsearch/issues/154881
[es#154883]: https://github.com/elastic/elasticsearch/issues/154883
[es#154876]: https://github.com/elastic/elasticsearch/issues/154876
[es#142288]: https://github.com/elastic/elasticsearch/issues/142288
[security-team#15968]: https://github.com/elastic/security-team/issues/15968
