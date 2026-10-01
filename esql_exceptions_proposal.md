# Native exceptions for ES|QL rules

Status: proposal. Scope: the ES|QL rule type (`siem.esqlRule`) in the current detection engine. Value lists are deliberately out of scope (see [Out of scope](#out-of-scope)).

## Summary

Detection exceptions on an ES|QL rule are applied today as a DSL filter attached to the `_query` request, running against the source documents before the rule's own ES|QL pipeline. That works for a plain rule but not for an aggregating one, and it cannot reference any column the pipeline computes.

This proposal compiles exception items into the ES|QL query itself, in one of two positions decided per item:

- An item that targets only fields present in the source indices is inlined as a `WHERE` stage right after the `FROM` command, so it excludes the source documents before the rule's pipeline runs.
- An item that targets a column the pipeline computes (a `STATS` output, an `EVAL` field, a renamed column) is appended as a `WHERE` stage at the end, so it can reference that column and suppress the resulting alert row.

Both positions use the same ES|QL predicate compiler, so the whole exception list is evaluated by one engine with one set of semantics. The DSL filter is no longer used for in-scope exceptions; it stays only as a fallback and for the out-of-scope value-list path.

This matches what product asked for: exceptions apply to the source documents when they target fields present in the indices, and apply at the end otherwise.

## How exceptions apply to ES|QL rules today

`create_security_rule_type_wrapper.ts` calls `buildExceptionFilter` and hands the executor one DSL `exceptionFilter`. `build_esql_search_request.ts` puts that filter on the `filter` field of the `_query` request, and Elasticsearch runs it as a boolean pre-filter on the source index. The rule's pipeline only ever sees documents that survive the filter.

Two consequences:

1. An exception can only reference source fields. A rule that alerts on a computed column (`failures` from `STATS failures = COUNT(*)`, an `EVAL` value, a column renamed by `RENAME`/`KEEP`) cannot be excepted on that column, because the pre-filter is evaluated before the column exists.
2. The exclusion is expressed in Lucene query semantics, while any exception that has to run after the pipeline must be expressed in ES|QL. Splitting one exception list across two matchers means two sets of null handling, type coercion, and multi-value behavior for the same list.

## What the POC does today

The workbench POC always applies inlined exceptions at the end. `buildNativeEsqlExceptionPipeline` returns stages that `esql.ts` appends after the rule query. There is no early-stage path. Because of that, an exception on a source field that an aggregating rule does not carry into its output is not applied against the source. The POC reports it as not-inlineable and drops it with a warning. The design below adds the early position and turns that dropped case into a source-document exclusion.

## Design

### Two schema probes

Before building anything, the executor resolves two column sets with `LIMIT 0` requests, which return columns and types but no rows:

- Source columns: the `FROM` source command alone, followed by `| LIMIT 0`. This is the set of fields present in the indices, with their ES|QL types, exactly as they exist at the point right after `FROM`.
- Output columns: the full rule query followed by `| LIMIT 0`. This is the set of columns the alert carries, computed and renamed columns included.

The `FROM` source command is taken from the parsed query, so the source probe uses the same index pattern and `METADATA` as the rule. A field-caps call cannot substitute for either probe: it does not return computed columns, and it does not reflect ES|QL's own column resolution.

### Per-item placement

An exception list is a disjunction of items; each item is a conjunction of entries. An item is placed as a whole, because its entries are AND-ed and splitting an item across two positions would turn an intersection into a union. For each item:

- if every field it references is a source column, inline it early (a `WHERE` stage inserted right after `FROM`);
- otherwise, if every field it references is an output column, append it late (a `WHERE` stage at the end);
- otherwise (a field in neither set), report it as not-inlineable, which becomes a rule execution warning.

Preferring the early position whenever all fields are source columns is the direct implementation of the product rule. A field that is both a source field and an output column (a `STATS ... BY` key, for instance) is present in the indices, so it goes early.

### Inserting the stages

The insertion point is located with the ES|QL AST (`@elastic/esql`: `Parser`), which gives the exact character offset where the `FROM` source command ends, then the early stage is spliced in there and the late stage is appended at the end. Locating the boundary with the parser rather than scanning for the first pipe keeps it correct across `METADATA` and quoted index names; splicing rather than pretty-printing the whole AST keeps the rule author's original query text byte-for-byte, adding only the `\n| WHERE NOT (...)` stages.

### Boolean structure and per-entry compilation

Each position collects the items assigned to it and emits one exclusion:

```
WHERE NOT ( (item entries AND-ed) OR (item entries AND-ed) OR ... )
```

Each entry compiles to one predicate; the `excluded` operator negates it. The predicate reproduces the Lucene semantics of the current exception filter (`match` / `match_any` are `match_phrase`; `wildcard` is a wildcard query), multi-valued fields included (see [Multi-valued fields](#multi-valued-fields)). Because `match_phrase` behaves differently per field type, the `match` / `match_any` predicate is chosen from the column's type:

| Entry type | Column type | `included` predicate (negated for `excluded`) |
| --- | --- | --- |
| `match` | keyword / ip / numeric / boolean | `MV_CONTAINS(field, value)` |
| `match` | text | `MATCH_PHRASE(field, "value")` (early position; analyzed phrase) |
| `match` | date / date_nanos, coarse value | `COALESCE((field >= lower AND field < upper), false)` (rounded range) |
| `match` | date / date_nanos, full-precision value | `MV_CONTAINS(field, "value"::date)` (exact) |
| `match_any` | any of the above | an `OR` of the per-value `match` predicate |
| `exists` | any | `field IS NOT NULL` |
| `wildcard` | any | `QSTR("field:pattern")` (early) or `COALESCE(field LIKE "pattern", false)` (late) |

`MV_CONTAINS`, `IS NULL` / `IS NOT NULL`, `MATCH_PHRASE`, and `QSTR` return a real boolean on every input, including a null / absent / multi-valued field, so those predicates need no `COALESCE`: a condition on an absent field is `false` (not matched, alert kept), the two-valued behavior the Lucene filter has today. The date range and the late `LIKE` can be null, so those two are wrapped in `COALESCE(..., false)`. `==`, `IN`, and `LIKE` on an indexed field are never used directly, because on a multi-valued or null value they return `null`, which breaks both null handling and any-element matching.

### Why `match_phrase` and the date range

A `match` on a **text** field must be analyzed phrase matching, not exact equality: today `message is root` suppresses an alert whose `message` is `"...failed for root"`. `MV_CONTAINS` is exact whole-value, so text uses `MATCH_PHRASE`, which is full-text and therefore valid only at the early position; a computed text column (late) falls back to exact `MV_CONTAINS` (a computed text column is not Lucene-backed and is not multi-valued in practice). A `match` on a **date** field rounds to the value's precision today (`2026-09-30` matches the whole day), so a coarse value compiles to a half-open range `[day, day+1)`; a full-precision value is an exact instant and stays `MV_CONTAINS`.

### Literal typing, field quoting, and unsupported types

`MV_CONTAINS` requires its second argument to match the column type exactly, so the literal is cast: `keyword` / `text` as a quoted string and `boolean` as `true` / `false` (no cast), numeric types as `<value>::<type>` (for example `42::long`), and `ip` / `version` / `date` as a quoted string with a cast (for example `"10.0.0.1"::ip`). Field names are quoted per dotted segment when a segment is not a plain identifier (`` `host-name` ``, `` a.`b-c` ``), so custom fields compile. A column whose ES|QL type the compiler cannot express safely (a cross-index type conflict resolves to `unsupported`, or `counter_*` / `geo_*`, which have no valid literal cast) is reported as not-inlineable rather than compiled, so the query never fails to parse. For `wildcard`, the `QSTR` argument is `field:pattern` with the `*` / `?` wildcards kept and every other query-string metacharacter backslash-escaped, then escaped again for the ES|QL string literal.

## Why inline into the query instead of the DSL pre-filter

Product asked for source-field exceptions to apply to the source documents. That could be done with the existing DSL `exceptionFilter`, which already pre-filters the source. The recommendation is to inline them as an ES|QL `WHERE` stage instead. The case for inlining:

- One evaluation model. Computed-column exceptions must run as ES|QL, there is no other option. If source-field exceptions stay in the DSL, the same exception list is matched by two engines with different null handling, type coercion, and multi-value rules. Inlining both positions keeps every exception under one compiler, so behavior is consistent and there is a single place that defines how an entry becomes a predicate.
- No runtime coordination between two mechanisms. Keeping the DSL path for part of the list means partitioning items between DSL and query on every run and making sure no item is applied twice. One mechanism removes that hazard.
- One visible artifact. The inlined query is what appears in the logs, in rule preview logged requests, and in the `_query` body. An engineer or analyst reads the entire filtering logic in the query, instead of correlating a query with a separately attached DSL object.
- Same field resolution as the rule. The early `WHERE` resolves fields the way the rule query itself does, rather than through a separate DSL resolution against the source mapping.

The case for the DSL pre-filter, to be fair:

- A DSL `term`/`range` on a mapped field is a Lucene filter that uses the inverted index or doc values directly. An ES|QL `WHERE` is only as cheap if ES|QL pushes the predicate down to Lucene. ES|QL does push many `WHERE` predicates on mapped fields down to the source, so for equality and range on mapped fields the two should be close, but this is the one thing to confirm on the performance sweep rather than assume.
- `buildExceptionFilter` already handles the full entry grammar, including value lists. Inlining re-derives some of that. Since the late position already re-derives it for computed columns, and value lists are out of scope here, the extra cost is small.

On balance, a single evaluation model and a single visible artifact outweigh a DSL pre-filter whose only clear advantage is a pushdown that ES|QL largely provides anyway. The perf sweep should verify the early `WHERE` is not materially slower than the DSL filter on mapped fields; if a specific predicate shape does not push down, that is a targeted follow-up, not a reason to keep two mechanisms.

## Semantics: source position versus end position

The two positions are not just about which fields are reachable; they mean different things, and both are intended.

Source position (event-level exclusion). The exclusion removes source documents before the pipeline, so for an aggregating rule it changes the aggregates. This is what product wants for fields present in the indices: the excluded events do not count toward `COUNT`, `COUNT_DISTINCT`, `MIN`, `MAX`, or grouping.

End position (alert-level exclusion). The exclusion drops output rows after the pipeline, so it suppresses the alert without changing any other row's values. This is the only correct place for a condition on a computed column, and it suppresses one alert rather than reshaping the aggregation.

Worked example. A rule alerts on distinct hosts per user:

```esql
FROM logs-*
| STATS hosts = COUNT_DISTINCT(host.name) BY user.name
| WHERE hosts > 5
```

- Exception matching `host.name` to `"scanner"` (a source field, not in the output). Early position: `scanner` events are removed before `COUNT_DISTINCT`, lowering every user's distinct-host count. This is the case the current POC drops with a warning; here it is applied against the source, as product intends.

  ```esql
  FROM logs-*
  | WHERE NOT (MV_CONTAINS(host.name, "scanner"))
  | STATS hosts = COUNT_DISTINCT(host.name) BY user.name
  | WHERE hosts > 5
  ```

- Exception on `hosts == 6` (a computed column). End position: the alert row is dropped, no other user's count changes. This cannot be expressed as a source pre-filter at all.

  ```esql
  FROM logs-*
  | STATS hosts = COUNT_DISTINCT(host.name) BY user.name
  | WHERE hosts > 5
  | WHERE NOT (MV_CONTAINS(hosts, 6::long))
  ```

For a non-aggregating rule, one event maps to one alert and the exception fields pass through unchanged, so the two positions produce the same alerts. The distinction only matters for aggregating rules and computed columns.

## Renamed, dropped, and overridden fields

The two positions resolve an exception field against two different schemas: the early position against the source columns (before the pipeline), the end position against the output columns (after it). A `KEEP`, `DROP`, `RENAME`, or `EVAL` in the rule changes the output schema, so it changes what an exception on that field can reference and what value it compares against.

- `DROP`. A rule with `| DROP host.name` does not carry `host.name` into the output. An exception on `host.name` is not a source-only case if the rule also reads it from the index, so it resolves against the source columns and applies early, before the `DROP`. An exception on a column that exists only after the pipeline and is then dropped has nowhere to run and is reported as not-inlined.
- `KEEP`. `| KEEP user.name` drops every other output column. An exception on `user.name` still applies (early if it is a source field, late if it is computed). An exception on a source field that `KEEP` removes from the output still applies early, against the source, because the early position does not depend on the output projection.
- `RENAME`. `| RENAME host.name AS host` produces a column named `host`, not `host.name`. An exception authored on `host.name` resolves against the source columns and applies early, against the original values, before the rename. An exception authored on the renamed `host` resolves against the output and applies late. An exception on `host.name` placed late would find no such output column and be reported, which is why source fields are preferred to the early position.
- `EVAL` that overrides a column. `| EVAL host.name = TO_UPPER(host.name)` keeps the name `host.name` but replaces its value in the output. Here the field is both a source column and an output column, and the two positions disagree: early, the exception compares against the original value (`"evil.com"`); late, it would compare against the transformed value (`"EVIL.COM"`). Preferring the early position for fields present in the indices means the exception matches the value the analyst authored it against, not the pipeline's rewrite. This is also why the end position is reserved for columns that exist only after the pipeline.
- `EVAL` that adds a column. `| EVAL risk = score * 2` introduces `risk`, which is not a source field. An exception on `risk` resolves against the output and applies late, which is the only place it exists.

The rule of thumb: a field that exists in the indices is matched against its original, pre-pipeline value at the early position, regardless of how the pipeline later renames, drops, or overrides it; a field that exists only because the pipeline produced it is matched at the end. This keeps source-field exceptions behaving like the exceptions analysts already write, while still allowing exceptions on computed output.

(The current POC applies every inlined item at the end position, so until the early position lands it resolves exceptions against the output schema only: a dropped or renamed source field is reported as not-inlined, and an `EVAL`-overridden field is matched against the transformed value. The early position is what corrects both.)

## Multi-valued fields

Feature parity requires that exceptions match multi-valued fields the same way they do today. Today's exception filter is a Lucene query, and a Lucene `term`, `terms`, or `wildcard` query matches a document when any one value of a multi-valued field matches (any-element). Verified on ES 9.6.0-SNAPSHOT: a document with `f: ["a", "b"]` matches `term f = a`, and `must_not term f = a` returns zero documents (the document is excluded). The native predicates are chosen to reproduce that, so this is parity, not a weaker approximation.

The trap to avoid. ES|QL `==`, `IN`, and `LIKE` do not compare a multi-valued field element by element: on a multi-valued value they return `null`, not `true` / `false` (verified: `["a", "b"] == "a"`, `["a", "b"] IN ("a", "c")`, and `["abc", "def"] LIKE "ab*"` all return `null`). Using them would silently fail to exclude a multi-valued document that today's filter excludes. So the compiler does not use them.

What it uses instead, all verified on ES 9.6.0-SNAPSHOT to reproduce any-element matching without changing row cardinality:

- `match` and `match_any` use `MV_CONTAINS(field, value)`, which returns `true` when any element equals the value. Verified across `keyword`, `text`, `ip`, numeric, `date`, `version`, and `unsigned_long` (with the type cast from [Literal typing](#literal-typing)), on both multi-valued and single-valued fields, and it returns `false` (not `null`) on an absent field. `match_any` is an `OR` of one `MV_CONTAINS` per value, because a multi-valued second argument means "contains all", not "contains any".
- `exists` uses `IS NOT NULL` / `IS NULL`, which already evaluate correctly on a multi-valued field (`["a", "b"] IS NOT NULL` is `true`).
- `wildcard` uses the full-text `QSTR("field:pattern")`, which runs as a Lucene query and so matches any element of a multi-valued field exactly as today's `wildcard` query does (verified: `QSTR("kw:a*")` excludes a document whose `kw` is `["a", "b"]` and keeps one whose `kw` is `["c"]`).

Why not `MV_EXPAND`. `MV_EXPAND` would also restore any-element matching, but it changes cardinality, turning one event into several rows, which duplicates alerts on a plain rule and distorts every aggregate. It is not usable in the exception stage.

One placement constraint for `wildcard`. Full-text functions cannot run after `STATS` or `EVAL` (verified: `QSTR` after `STATS` is rejected with "[QSTR] function cannot be used after STATS"). `MV_CONTAINS` and `IS NULL` have no such restriction. So a `wildcard` exception is compiled at the early position, on the source, where full-text is valid; this is another reason a field present in the indices is matched before the pipeline. A `wildcard` exception that can only reference a computed column (one produced by `STATS` / `EVAL`) cannot use `QSTR`; such a column is not Lucene-backed and is effectively single-valued, so it falls back to `LIKE` at the end position, and only that narrow combination keeps the single-valued-only caveat.

## Correctness

- One mechanism. In-scope exceptions are applied in the query, early or late. The DSL `exceptionFilter` is not used for them, so there is no double-apply to guard against between DSL and query.
- Fallback. If either probe fails, the executor inlines nothing and falls back to today's DSL path unchanged, so a probe failure degrades to current behavior rather than dropping exceptions.
- Placement is total per item. Every in-scope item is early, late, or reported. No item is split.

## Out of scope

Value lists (`list` entries) are not part of this delivery. Shipping correct native exceptions for the ES|QL rule type quickly is the goal, and value lists carry their own design (a lookup-index representation and a `LOOKUP JOIN` compilation). Until that lands, an item containing a `list` entry is not inlined and is handled as it is today: applied through the DSL path where the current code can, and reported in the unprocessed-exceptions warning where it cannot. Nested entries stay out of scope for the same reason, with no native representation.

## Known limitations

- Multi-valued columns reach parity with the Lucene path through `MV_CONTAINS` and `QSTR` (see [Multi-valued fields](#multi-valued-fields)). The one residual is a `wildcard` exception on a computed column, which cannot use `QSTR` after `STATS` / `EVAL` and falls back to `LIKE`; such a column is not multi-valued in practice.
- Two extra requests per run. The source and output probes add two lightweight `_query` round trips before the main query. They return no rows; the cost is plan-time only, and the two probes can run in parallel.
- Multi-typed source fields. A field mapped as conflicting types across the FROM indices may resolve to an unsupported union type in the source probe; an exception on such a field is reported as not-inlineable rather than inlined, since ES|QL cannot compare it without a cast. This is the same type-resolution constraint ES|QL imposes elsewhere.
- Pushdown of the early `WHERE` is the one performance question to confirm against the DSL pre-filter (see the argument above).

## Rollout

- Scope to the ES|QL rule type in the current detection engine. No other rule type changes.
- Put it behind a feature flag so it can be enabled gradually and compared against the DSL path.
- Surface skipped-item warnings in the rule execution results, so an analyst who writes an exception on a field the rule neither sources nor outputs learns it was not applied, and why.

## How it was verified in the POC

The workbench POC (`poc_esql_exceptions.mjs`, `poc_ab_compare.mjs`, `poc_perf_test.mjs`) exercises the compiler against a live Kibana and Elasticsearch, and a Jest unit suite (`build_esql_native_exceptions.test.ts`) covers the compiler's generated ES|QL directly. Both the early (source) and late (computed-column) positions are implemented.

- A per-type matrix (`poc_esql_exceptions.mjs`) builds one exception list and one ES|QL rule for every combination of entry type (`match`, `match_any`, `exists`, `wildcard`), data type, and operator (`included`, `excluded`), each scoped to a document that should be excluded and one that should survive, asserting exactly one alert.
- An A/B harness (`poc_ab_compare.mjs`) previews the same rule and exception through the DSL path and the native path and diffs the surviving alerts per field type, treating the DSL path as the baseline.
- A performance sweep (`poc_perf_test.mjs`) measures the generated query shape as source volume and predicate count grow. For the source position, extend it to compare the early `WHERE` against the DSL pre-filter on the same mapped fields.

## Appendix: generated query examples

Non-aggregating rule, two source-field items (a `match` and a `match_any`), inlined early:

```esql
FROM logs-* METADATA _id
| WHERE NOT ((MV_CONTAINS(user.name, "root")) OR (MV_CONTAINS(process.name, "ping") OR MV_CONTAINS(process.name, "curl")))
| WHERE event.category == "process"
```

Aggregating rule, exception on a computed column, appended late:

```esql
FROM logs-*
| STATS failures = COUNT(*) BY user.name
| WHERE failures > 100
| WHERE NOT (MV_CONTAINS(failures, 101::long))
```

A `wildcard` exception on a source field, compiled early with `QSTR` (full-text cannot follow `STATS`):

```esql
FROM logs-*
| WHERE NOT (QSTR("host.name:jump-*"))
| STATS failures = COUNT(*) BY user.name, host.name
| WHERE failures > 100
```

One rule with both: a source-field item early and a computed-column item late:

```esql
FROM logs-*
| WHERE NOT (MV_CONTAINS(host.name, "jump-box"))
| STATS failures = COUNT(*) BY user.name, host.name
| WHERE failures > 100
| WHERE NOT (MV_CONTAINS(failures, 101::long))
```
