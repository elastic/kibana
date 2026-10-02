# Native exceptions for ES|QL rules

Status: proposal with a working implementation behind a feature flag. Scope: the ES|QL rule type (`siem.esqlRule`) in the current detection engine, first delivery. Value lists stay as they are today (see [Out of scope](#out-of-scope)).

## Summary

An ES|QL rule applies exceptions today as a DSL filter attached to the `_query` request. The filter runs on the source documents before the rule's pipeline. That works for exceptions on source fields. It cannot work for an exception on a column the pipeline computes (a `STATS` output, an `EVAL` value, a renamed column), because the column does not exist when the filter runs.

This proposal keeps the DSL filter for source fields and adds one thing: exceptions on computed output columns are compiled into ES|QL `WHERE` stages appended at the end of the rule query, where those columns exist.

- Exceptions on source fields: unchanged. They stay in the DSL filter, with the behavior analysts already know.
- Exceptions on computed columns: appended as `| WHERE ...` stages at the end of the query.
- Anything that can be evaluated in neither place is not applied. It is logged, and reported as a rule warning when the user could expect it to apply.

Inlining source-field exceptions right after `FROM` was evaluated and rejected as too risky for this delivery (see [Why source fields stay in the DSL filter](#why-source-fields-stay-in-the-dsl-filter)).

## How exceptions apply to ES|QL rules today

`create_security_rule_type_wrapper.ts` calls `buildExceptionFilter` and passes one DSL `exceptionFilter` to the executor. `buildEsqlSearchRequest` puts it in the `filter` field of the `_query` request, where each exception item becomes a `must_not` clause. Elasticsearch applies it to the source index, so the rule pipeline only sees documents that survive.

Consequences:

1. An exception can only reference fields that exist in the source indices.
2. An exception on a field the source does not have is still part of the filter. For an `is not` style operator it excludes every document, because the negative operators exclude the complement of the match, and a document without the field is part of that complement.
3. The query results of an aggregating rule are computed from the surviving documents. An exception on a source field therefore changes the aggregates (event-level exclusion). This is the behavior this proposal preserves.

The behavior of each entry type and operator on each field type is documented in `esql_exceptions_v1_inventory.md`.

## Design

### Inputs

- **Source field types** (`SourceFieldTypes` in the code): the result of a `_field_caps` call on the rule's source indices, limited to the fields named by the exception items plus the parent prefixes of dotted names (`a.b.c` also asks for `a` and `a.b`). Field caps ignores unknown names, so the response stays small whatever the mappings look like.
- **Output columns** (`OutputColumns` in the code): the result of running the rule query followed by `| LIMIT 0`. It returns the names and ES|QL types of the output columns and no rows.

### Per-item placement

An item is placed as a whole. Its entries are AND-ed, so splitting an item across two positions would turn an intersection into a union. For each exception item:

| Condition on the fields of the item | Placement |
| --- | --- |
| Every field is a source field: it is in the source field types, or sits under a `flattened` parent that is | DSL filter (as today) |
| Otherwise, every field is one of the output columns, of a type the end stage supports, and every entry can be compiled | End of the query |
| A field is in neither the source field types nor the output columns (typical of a shared list written for other indices) | Not applied, logged at `debug` |
| A field is a source field that the query does not output (for example removed by `KEEP` or `STATS`) and the item also needs a computed column | Not applied, logged at `warn` and reported as a rule warning |
| The item has an entry the end stage cannot compile (unsupported column type, `list` or `nested` entry, value that does not cast, `matches` on a non-string column, list longer than the cap) | Not applied, logged at `warn` and reported as a rule warning |

Two details of the first rows:

- Source fields are classified with `_field_caps`, never with the ES|QL schema of the source. The ES|QL schema hides object parents, `nested` sub-fields and `flattened` sub-keys, which the DSL filter matches without trouble. Using it would move those items out of the DSL filter and lose them. Flattened sub-keys are not listed by field caps either, so a name is also a source field when one of its parent prefixes is a `flattened` field in the source field types.
- The DSL is the default. An item moves to the end of the query only when it is provably evaluable there.

The DSL filter is rebuilt from the DSL items only. Items that move to the end of the query, and items that are not applied, no longer appear in it.

### Worked example

A rule flags hosts reached by many distinct users:

```esql
FROM logs-*
| STATS user_count = COUNT_DISTINCT(user.name) BY host.name
| WHERE user_count > 50
| RENAME host.name AS target_host
```

A shared exception list holds three items:

| Item | Fields | Placement |
| --- | --- | --- |
| `user.name is vuln-scanner-svc` | `user.name` (source field) | DSL filter. The scanner events are excluded before `COUNT_DISTINCT`, so they do not inflate any distinct-user count. |
| `target_host is dc-01` | `target_host` (output column, not in the source) | End of the query. Only the `dc-01` alert row is excluded. |
| `winlog.event_id is 4624` | `winlog.event_id` (in neither) | Not applied, logged at `debug`. |

Resulting request: the DSL filter contains the first item, and the query becomes

```esql
FROM logs-*
| STATS user_count = COUNT_DISTINCT(user.name) BY host.name
| WHERE user_count > 50
| RENAME host.name AS target_host
| WHERE NOT (MV_CONTAINS(target_host, "dc-01"))
```

### What each position means

The DSL filter excludes source events before the pipeline, so for an aggregating rule it changes the aggregates. The end-of-query stage excludes alert rows after the pipeline and changes no other row. Both are intended: an exception authored on a source field means "ignore these events", and an exception authored on a computed column means "ignore this result". For a non-aggregating rule that passes its fields through unchanged, the two positions produce the same alerts.

### Boolean structure

Each item adds one stage, `| WHERE <expression>`, that keeps the rows the item does not exclude. One stage per item keeps the expression shallow: `NOT A AND NOT B` is expressed as two stages, not as a long `OR` chain, which matters because the ES|QL parser limits expression depth.

- An item with several entries joins them with `AND` in its stage: `| WHERE NOT ((MV_CONTAINS(risk, "low")) AND (count IS NOT NULL))`.
- A single `is not` style entry needs no negation, because keeping the rows that do not match `NOT p` is `p`. A multi-entry item negates only its excluded entries: `| WHERE NOT ((NOT (MV_CONTAINS(risk, "low"))) AND (count IS NOT NULL))`.

All comparisons use functions that return a real boolean for null and multi-valued inputs (`MV_CONTAINS`, `IS NULL`, `IS NOT NULL`). `==`, `IN` and `LIKE` return `null` on a multi-valued value and are never used. The two predicates that can be null (`MV_LIKE` and `MV_IN_RANGE`) are wrapped in `COALESCE(..., false)`. This reproduces the any-element matching of the Lucene queries behind the DSL filter, and a null column keeps the row for a positive operator and excludes it for a negative one, as the DSL filter does.

## Types supported at the end of the query

An exception can be tested at the end of the query on 11 ES|QL column types: `keyword`, `text`, `integer`, `long`, `unsigned_long`, `double`, `boolean`, `ip`, `version`, `date` and `date_nanos`. A `text` column supports `is`, `is one of` and `exists`, but not `matches` (see [Text columns](#text-columns)). The type is the ES|QL type of the output column reported in the output columns, not the mapping of a source field.

`col` stands for the column name, backquoted per dotted segment when a segment is not a plain identifier (`` `host-name` ``, `` a.`b-c` ``). The clauses below are the stages the implementation generates for the `is`, `is one of`, `matches` and `exists` operators.

| Column type | `is` (`match`) | `is one of` (`match_any`) | `matches` (`wildcard`) | `exists` |
|---|---|---|---|---|
| `keyword` | `\| WHERE NOT (MV_CONTAINS(col, "good.com"))` | `\| WHERE NOT (MV_CONTAINS(col, "good.com") OR MV_CONTAINS(col, "bad.com"))` | `\| WHERE NOT (COALESCE(MV_LIKE(col, "good*"), false))` | `\| WHERE NOT (col IS NOT NULL)` |
| `text` | `\| WHERE NOT (MATCH_PHRASE(col, "to good.com"))` | `\| WHERE NOT (MATCH_PHRASE(col, "to good.com") OR MATCH_PHRASE(col, "other"))` | not supported | `\| WHERE NOT (col IS NOT NULL)` |
| `integer` | `\| WHERE NOT (MV_CONTAINS(col, 42::integer))` | `\| WHERE NOT (MV_CONTAINS(col, 42::integer) OR MV_CONTAINS(col, 7::integer))` | not supported | `\| WHERE NOT (col IS NOT NULL)` |
| `long` | `\| WHERE NOT (MV_CONTAINS(col, 42::long))` | `\| WHERE NOT (MV_CONTAINS(col, 42::long) OR MV_CONTAINS(col, 7::long))` | not supported | `\| WHERE NOT (col IS NOT NULL)` |
| `unsigned_long` | `\| WHERE NOT (MV_CONTAINS(col, 1000::unsigned_long))` | `\| WHERE NOT (MV_CONTAINS(col, 1000::unsigned_long) OR MV_CONTAINS(col, 7::unsigned_long))` | not supported | `\| WHERE NOT (col IS NOT NULL)` |
| `double` | `\| WHERE NOT (MV_CONTAINS(col, 3.14::double))` | `\| WHERE NOT (MV_CONTAINS(col, 3.14::double) OR MV_CONTAINS(col, 2.5::double))` | not supported | `\| WHERE NOT (col IS NOT NULL)` |
| `boolean` | `\| WHERE NOT (MV_CONTAINS(col, true))` | `\| WHERE NOT (MV_CONTAINS(col, true) OR MV_CONTAINS(col, false))` | not supported | `\| WHERE NOT (col IS NOT NULL)` |
| `ip` | `\| WHERE NOT (MV_CONTAINS(col, "10.0.0.1"::ip))` | `\| WHERE NOT (MV_CONTAINS(col, "10.0.0.1"::ip) OR MV_CONTAINS(col, "10.0.0.2"::ip))` | not supported | `\| WHERE NOT (col IS NOT NULL)` |
| `version` | `\| WHERE NOT (MV_CONTAINS(col, "1.2.3"::version))` | `\| WHERE NOT (MV_CONTAINS(col, "1.2.3"::version) OR MV_CONTAINS(col, "2.0.0"::version))` | not supported | `\| WHERE NOT (col IS NOT NULL)` |
| `date` (day value) | `\| WHERE NOT (COALESCE(MV_IN_RANGE(col, "2026-09-30T00:00:00.000Z"::date, "2026-09-30T23:59:59.999Z"::date), false))` | `\| WHERE NOT (COALESCE(MV_IN_RANGE(col, "2026-09-30T00:00:00.000Z"::date, "2026-09-30T23:59:59.999Z"::date), false) OR COALESCE(MV_IN_RANGE(col, "2026-08-01T00:00:00.000Z"::date, "2026-08-01T23:59:59.999Z"::date), false))` | not supported | `\| WHERE NOT (col IS NOT NULL)` |
| `date_nanos` (day value) | `\| WHERE NOT (COALESCE(MV_IN_RANGE(col, "2026-09-30T00:00:00.000Z"::date_nanos, "2026-09-30T23:59:59.999999999Z"::date_nanos), false))` | the same range, one per value, joined with `OR` | not supported | `\| WHERE NOT (col IS NOT NULL)` |

### Negative operators

Every supported type uses the same pattern. Shown for `keyword`:

| Operator | Stage |
|---|---|
| is not | `\| WHERE MV_CONTAINS(col, "good.com")` |
| is not one of | `\| WHERE MV_CONTAINS(col, "good.com") OR MV_CONTAINS(col, "bad.com")` |
| does not match | `\| WHERE COALESCE(MV_LIKE(col, "good*"), false)` |
| does not exist | `\| WHERE col IS NOT NULL` |

A row with a null column fails these conditions, so it is excluded. The DSL filter treats a document without the field the same way. On a `text` column "is not" is `| WHERE MATCH_PHRASE(col, "to good.com")`.

### Value rules

A value that cannot be cast to the column type is rejected and the item is not applied. A failed cast yields `null`, `MV_CONTAINS(col, null)` is true, and the stage would then exclude every row.

| Column type | Accepted values |
|---|---|
| `keyword` | Any string. Quotes, backslashes, `\n`, `\r` and `\t` are escaped in the literal. |
| `text` | Any string, compared as a phrase after the analyzer of the source field, as `match_phrase` does in the DSL. A phrase with no token matches nothing. |
| `integer`, `long`, `unsigned_long` | Integers within the range of the type. `42` is written `42::long`. |
| `double` | Finite decimal numbers, including exponents. |
| `boolean` | `true` or `false`, in any case. |
| `ip` | A single address (IPv4 or IPv6). CIDR notation is rejected. |
| `version` | A semantic version, for example `1.2.3` or `1.2.3-beta`. |
| `date`, `date_nanos` | See [Date values](#date-values). |
| `matches` (any type) | Only `keyword` columns; a `text` column is not supported. The pattern keeps `*` and `?` as wildcards, keeps `\*`, `\?` and `\\` as literals, and drops other backslashes. A pattern that ends with a lone backslash is rejected. |

An `is one of` list must have between 1 and 250 values.

### Date values

The DSL `match_phrase` on a date rounds to the unit of the value, and the end-of-query stage reproduces that.

| Value | Compiled as |
|---|---|
| Day, hour, minute or second (`2026-09-30`, `2026-09-30T14`, `2026-09-30T14:05`, `2026-09-30T14:05:09`, with optional `Z`) | `COALESCE(MV_IN_RANGE(col, "first instant"::date, "last instant"::date), false)` covering the whole unit. For `date_nanos` the last instant ends in `.999999999Z`. |
| Year or month (`2026`, `2026-09`) | The first day only, which is what the DSL filter matches. |
| Value with a fraction (`2026-09-30T14:00:00.123Z`) | An exact instant: `MV_CONTAINS(col, "2026-09-30T14:00:00.123Z"::date)`. Up to 3 fraction digits on `date`, up to 9 on `date_nanos`. |
| Offsets, epoch milliseconds, other formats, years before 1000, impossible dates | Rejected. The item is not applied. |

`MV_IN_RANGE` has inclusive bounds and any-element semantics, so a multi-valued date column is handled like the DSL filter.

### Text columns

A `text` column reaches the end of the query only when the query passes a `text` source field through unchanged: `RENAME message AS msg`, `EVAL msg = message`, or a `STATS ... BY msg = message` key. Every function that takes a `text` value returns a `keyword` (`COALESCE`, `CASE`, `MV_FIRST`, `CONCAT`, `TRIM`, `TO_LOWER`, `SUBSTRING`, `REPLACE`, `MV_DEDUPE`, `VALUES`, `MAX`), so the type `text` in the output columns identifies an alias of a source field. A `text` source field that the query passes through under its own name is a source field and stays in the DSL filter.

**`is`, `is one of` and their negatives are supported with `MATCH_PHRASE`.** The DSL uses `match_phrase`, which analyzes the value with the analyzer of the field and matches a phrase of tokens. On an Elasticsearch 9.6 snapshot `MATCH_PHRASE` runs after `RENAME`, after an `EVAL` alias and after `STATS ... BY alias = field`, resolves the alias to the source field and keeps those semantics. For the documents `Connection to Good.com failed`, `connection to good.com`, `bad.com`, one with the values `x` and `to good.com now`, and one without the field, the exclusions are the same as the DSL on the source field for `is`, `is one of`, `is not` and `is not one of`, including the multi-valued document, the missing field and a phrase in another case (`Good.com` matches because the field is analyzed). A phrase with no token (an empty string) matches nothing, as in the DSL (verified for the empty string), and `NOT` keeps the rows with no value.

**`matches` and `does not match` are not supported.** The DSL `wildcard` query on a `text` field compares the pattern with each analyzed token (lowercased by the analyzer, while the pattern is not analyzed). For the same documents:

| Pattern | DSL `wildcard` on the `text` field | `MV_LIKE` on the renamed column |
|---|---|---|
| `*good*` | both documents that have a `good.com` token | only the document whose whole value is `good.com` |
| `*Good*` | none | only the document that holds `Good.com` in its value |
| `good*` | both documents that have a `good.com` token | only the document whose whole value is `good.com` |

The functions that take a wildcard and use the analyzer, `QSTR` and `KQL`, are rejected after `RENAME`, `EVAL` and `STATS` ("cannot be used after RENAME"), and `MATCH` treats `good*` as a literal. `LIKE` compares the whole value and is case-sensitive, so `matches` would exclude fewer alerts than the analyst intended and `does not match` would exclude more, silently dropping alerts that the DSL filter would keep. The item is not applied and is reported with a rule warning. The request to Elasticsearch is drafted in `esql_exceptions_es_issue.md`.

**Position restrictions.** A full-text function runs only at some positions of a query, and an error would fail the whole rule. On an Elasticsearch 9.6 snapshot it was accepted after `EVAL`, `RENAME`, `KEEP`, `DROP`, `WHERE`, `SORT` without `LIMIT`, `DISSECT`, `GROK` and `MV_EXPAND`, and rejected after `LIMIT` ("cannot be used after LIMIT when it targets an indexed field"). After `STATS` the answer depends on the commands that follow: `STATS ... BY message | RENAME message AS msg | KEEP msg` is accepted, while `STATS ... BY message | EVAL msg = message` and `STATS ... BY message | WHERE n > 0 | RENAME message AS msg` are rejected. A check of the query text cannot predict that, and a request to Elasticsearch to find out costs one more round trip (a `LIMIT 0` does not work for it, because it skips the position check).

So the executor reads the commands of the rule query with the ES|QL parser, nested sub-queries and `FORK` branches included, and compares a `text` column only when every command is one of the accepted ones listed above. If the query uses any other command (`LIMIT`, `STATS`, `INLINE STATS`, `SAMPLE`, `LOOKUP JOIN`, `FORK`, and so on), the items that use `MATCH_PHRASE` are not applied and the rule shows a warning that names the command; the other end-of-query items still apply. This makes no extra request. It is conservative: a rule that groups by an aliased `text` column with `STATS` would be accepted by Elasticsearch, but its `text` items are not applied.

Alternatives considered for `matches` and rejected:

1. **Compare the column as it is** (`MV_LIKE` on the `text` column). This is the behavior in the table above, with the silent differences it causes.
2. **Cast to `keyword` with a temporary column** (`EVAL <temporary> = TO_STRING(msg) | WHERE ... | DROP <temporary>`). This is feasible: the output columns of the final query are identical to the rule's, nulls and multi-valued columns behave as on `keyword`, and it works after `STATS`. The temporary name must not collide with an output column. It fixes the type, not the semantics: the comparison is whole-value and case-sensitive, so `*good*` misses `Connection to Good.com failed`, and an uppercase pattern such as `*Good*` matches here while it matches nothing in the DSL.
3. **Cast and lowercase** (`TO_LOWER(TO_STRING(msg))`). This reproduces the DSL for patterns that appear anywhere in the value, but a pattern anchored at the start, such as `good*`, matches the token `good.com` in the DSL and does not match the whole value `connection to good.com failed`, so the exception would not exclude it. It would look like parity while still silently missing documents, which is worse than reporting the item.

No ES|QL function applies a `text` analyzer to a column (`SPLIT` cuts on a fixed delimiter, which is not the same). An analyst who needs `matches` on such a column can convert it in the rule, for example `| EVAL msg = TO_STRING(msg)`, which makes it a `keyword` column with exact whole-value semantics that the rule shows explicitly.

Elasticsearch issue [elastic/elasticsearch#130567](https://github.com/elastic/elasticsearch/issues/130567) (open, "improved planning for full-text search functions") is related: it asks the planner to accept a full-text function such as `QSTR` after `EVAL` or `LOOKUP JOIN` when the filter can still be pushed down to the source. It names a source field that the `EVAL` did not change and does not mention `RENAME` or `STATS`, so it would not by itself lift the restriction on `matches`.

### Types not supported at the end of the query

An item with a field of one of these types is not applied, and the skip reason is logged.

| Type | Why |
|---|---|
| `search_as_you_type`, `completion`, `join`, `binary`, `long_range`, `integer_range`, `float_range`, `ip_range`, `sparse_vector`, `rank_*`, `percolator` | They surface in ES\|QL as `unsupported`, so no predicate can reference the column. |
| `geo_*`, `cartesian_*`, `dense_vector`, `double_range`, `date_range`, `flattened` root, histogram family, `aggregate_metric_double` | The column exists but accepts no value comparison. The `exists` operator could be supported on these in a later iteration. |
| `float`, `half_float` columns computed from a source field | The type widens to `double` with the precision of the original type, so equality with a typed decimal such as `0.1` fails. |
| `nested` sub-fields, object parents, `flattened` sub-keys, `passthrough` parents | ES\|QL has no column for them. The DSL filter handles them when they are source fields. |
| Fields that are not mapped anywhere | No column exists. |

Entry types other than `match`, `match_any`, `wildcard` and `exists` are not supported at the end of the query: `list` (value lists) and `nested`.

## Items that are not applied

An item that is not applied is removed from the DSL filter, so it excludes nothing. Each skip is reported according to how likely the user expected the item to apply.

| Reason | Level | Rule warning |
|---|---|---|
| A field is in neither the source nor the output | `debug` | No. This is the normal case of a list shared by rules over different indices. |
| A source field that the query does not output, in an item that needs a computed column | `warn` | Yes |
| A type, entry type or value the end stage cannot compile (including `matches` on a `text` column) | `warn` | Yes |
| A comparison of a `text` column in a query that uses a command after which Elasticsearch may reject the full-text function (`LIMIT`, `STATS`, and others) | `warn` | Yes |
| More than 100 items already placed at the end of the query | `warn` | Yes |
| The inspection of fields failed (see below) | `warn` | Yes |

The rule warning lists the first 5 skipped items with their reason, followed by "and N more". Items applied at the end of the query are logged at `debug`.

## Limits

| Limit | Value | Reason |
|---|---|---|
| Values in one `is one of` entry at the end of the query | 250 | A flat chain of `OR` comparisons fails at 293 terms with the parser's expression depth error (limit 300). |
| Items placed at the end of the query | 100 | The query can have at most 500 pipeline stages. |

Neither limit exists today in the schema, the UI or the API. The DSL filter has only the Lucene clause limit at runtime. A list longer than 250 values on a computed column is not applied and is reported.

## Failure handling

If the `_field_caps` call or the `LIMIT 0` request fails, nothing moves: all exceptions stay in the DSL filter exactly as today, and the rule logs and reports `Could not inspect the fields of the exceptions, so all exceptions use the DSL filter: <reason>`. The feature adds two lightweight requests per run (one is skipped when no item needs the output columns) and no row data.

## Why source-field exceptions stay in the DSL filter

**Decision.** An exception whose fields are all source fields (including keys below a `flattened` field) keeps running as part of the DSL filter on the `_query` request, exactly as it does today. It is not compiled into a `WHERE` stage right after `FROM`. Only exceptions on computed columns are compiled into ES|QL, at the end of the query.

**What inlining right after `FROM` would have brought.** One evaluation model for every exception, no partition of the list between two mechanisms, and the whole filtering logic visible in the query text. These are real advantages, and the early `WHERE` would have the same effect on an aggregating rule as the DSL filter has: both remove the source events before `STATS`, so the aggregates change in the same way. Inlining adds no new capability for source fields.

**Why we did not do it.**

1. **The translation is not equivalent, and some of the differences fail silently.** The DSL filter and the early `WHERE` were compared on every operator and field type, 121 scenarios in total (details in `esql_exceptions_operator_parity.md`). 99 matched and 22 differed, in 11 distinct ways:

   | Kind of difference | Examples | Consequence |
   |---|---|---|
   | Rule failure | A carriage return or line feed in the value (parse error) | The rule fails and creates no alert |
   | Excludes every document | A value that fails the cast (`10.0.0.0/24`, epoch milliseconds, a date in the field's own `format`) becomes `null`, and `MV_CONTAINS(col, null)` is true | All alerts of the rule are silently lost |
   | Excludes too few | A backslash in a `matches` pattern with `QSTR`; CIDR or a date range on a multi-valued field (`null` instead of `false`) | Alerts that the analyst meant to exclude still fire |
   | Excludes too many | A year or month date value (the DSL covers the first day only); an uppercase `matches` pattern on `text` | Alerts that should fire are silently lost |
   | Scale | More than 293 values in one "is one of", or hundreds of items in one `WHERE` | The query fails, where the DSL works up to the Lucene clause limit (4468 on the tested cluster) |
   | Not expressible | An `object` or `nested` parent used with "exists", a `flattened` sub-key | No ES|QL form exists |

   Most have a verified fix (a validated literal, escaping, `MV_IN_RANGE`, `MV_INTERSECTS`, splitting into stages). Two do not: the uppercase `matches` on `text` is a product decision, and the parents have no column. Every fix is new code on the path that every existing exception uses, and the failures it guards against lose alerts without any error.

2. **It could never be the only mechanism for source fields.** Some source fields cannot be a usable ES|QL column: a field mapped with different types across the indices (it becomes `unsupported`), a `flattened` field (only the root is a column, and no scalar predicate works on it), the range types, the `nested` sub-fields, and `search_as_you_type`, `completion` and `join`. The DSL filter matches all of them. Value lists also stay in the DSL filter in this delivery. Inlining would therefore replace the DSL for some exceptions and keep it for the rest, which means two mechanisms with two sets of semantics, plus a rule to choose between them on every run, instead of the one mechanism we claimed to be removing.

3. **The risk is asymmetric.** The DSL path is proven on every existing ES|QL rule. A wrong translation does not show as an error: it shows as alerts that disappear, and the analyst has no signal. A bug in the end-of-query stage affects only the new capability, behind a feature flag, and every case it cannot handle is reported on the rule. A bug in early inlining would affect every exception on every ES|QL rule.

4. **Performance is unverified.** The DSL filter runs as a Lucene filter on the indexed fields. An ES|QL `WHERE` is as cheap only if the predicate is pushed down to Lucene, which holds for many comparisons but was not measured for this set of operators. Keeping the DSL avoids having to prove it for the first delivery.

**What we give up.** The filtering logic is split between the query text (computed-column items) and the request filter (source-field items). The rule log and the rule warnings name every item that is applied at the end of the query or skipped, and a rule preview shows the request, so the split is observable.

**When to revisit.** Early inlining becomes worth another look if ES|QL gains the missing pieces (a column for fields with conflicting types, access to `flattened` keys, a containment test for range fields, term-level date rounding), or when value lists are evaluated in ES|QL with `LOOKUP JOIN`, because a join key has to be a usable column. The source-field limitations that matter at that point are kept in `esql_exceptions_language_gaps.md`.

## Out of scope

- **Value lists.** `list` entries are not compiled at the end of the query. They keep working through the DSL filter on source fields, with today's limits and the existing unprocessed-exceptions warning for lists that are too large. A list exception on a computed column is not applied and is reported. A later iteration stores each list in a lookup index and applies it with `LOOKUP JOIN`, which covers computed columns as well.
- **In-memory filtering of large value lists.** The ES|QL executor does not do it today, and it would interact with the paging that uses `excludedDocuments`.
- **Early inlining.** See above.
- **`nested` entries at the end of the query.** They have no ES|QL representation.

## Behavior changes to review

1. **Items on fields the source does not have no longer exclude documents.** Today a negative operator on an unmapped field excludes every document. After this change that item is removed from the DSL filter and logged. This favors the shared list case (a list written for several index patterns), but the change is visible to existing rules that use the flag.
2. **Items that reference an output column now apply** where they previously matched nothing, so alerts that fired may stop firing. This is the purpose of the feature.
3. **Caps of 250 and 100** are new restrictions that apply only to the end of the query.
4. **The 250-value cap could be lifted** with `MV_INTERSECTS`, which handled 5000 `keyword` values in a single call. It was verified for `keyword` only, so the first delivery keeps the cap.

## Rollout

- Behind the experimental feature `esqlNativeExceptionsEnabled`, off by default. Enable it with `xpack.securitySolution.enableExperimental: ['esqlNativeExceptionsEnabled']`. With the flag off, the executor makes no extra request and builds the same request as today.
- Scoped to the ES|QL rule type. No other rule type changes.
- The executor receives the full list of non-expired exception items (`allExceptionItems`) next to the existing DSL filter, so it can split them. The wrapper still builds the DSL filter from all items for the flag-off path.

## Verification

- Unit tests cover the clause compiler (every entry type, operator, column type, value rule and rejection), the split of items between DSL, end of query and skipped, the orchestration (logging levels, warnings, failure handling, DSL filter rebuilt from DSL items only) and the executor wiring (flag off makes no request, the stage is appended before the final limit, the DSL filter is built from the source items only).
- The production code was run against a live Elasticsearch for 27 cases. They cover every operator on `keyword`, `long`, `integer`, `unsigned_long`, `double`, `scaled_float`, `boolean`, `ip`, `version`, `date` and `date_nanos`, plus `exists` on `text`, with single-valued, multi-valued and missing values. Each case excluded exactly the expected rows.
- A second live run covers `text` columns that alias a source field: `is`, `is one of`, `is not` and `is not one of` excluded the same documents as the DSL `match_phrase` on the source field (multi-valued, missing and mixed-case values included). The item was applied, and the query ran, after `RENAME` with `KEEP`, after `EVAL` with `WHERE` and `SORT`, and after `DISSECT` with `MV_EXPAND`. It was not applied, with a rule warning, after `LIMIT`, after `SORT` with `LIMIT`, and after `STATS`. A keyword item in the same rule still applied, and the whole run made no request besides the output probe.
- A worked example with a shared list ran end to end: the source field item stayed in the DSL filter, a flattened sub-key stayed in the DSL filter, an item absent everywhere was logged at `debug`, and a source field the query does not output was reported at `warn`.
- Not yet verified: a complete run through a Kibana instance with the flag enabled, and the performance of the extra requests on wide mappings or cross-cluster searches.

## Related documents

- `esql_exceptions_v1_inventory.md`: behavior of every entry type, operator and field type today.
- `esql_exceptions_operator_parity.md`: the comparison between the DSL filter and a `WHERE` stage right after `FROM`.
- `esql_exceptions_language_gaps.md`: ES|QL language limitations behind the unsupported combinations.
