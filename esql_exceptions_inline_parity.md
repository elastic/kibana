# Exceptions inlined right after `FROM`: DSL filter against `WHERE`, for every type and operator

Generated on 2026-10-10 against Elasticsearch 9.6.0-SNAPSHOT. It replaces the 121-scenario comparison of `esql_exceptions_operator_parity.md`, which covered fewer types and values and used one translation.

## Question

An exception on a source field runs today as a DSL filter on the `_query` request. Would it give the same alerts if it were written as a `WHERE` right after `FROM`? For every field type and every exception operator that the DSL supports, this test runs the same exception both ways on the same documents and compares the rows that are kept.

## Method

- **DSL side:** the clause shapes that `build_exception_filter.ts` builds (`match_phrase`, `wildcard`, `exists`, `terms`, `range`, `nested`), negated for an excluded entry and wrapped in the `must_not` of the exception filter, sent as the `filter` of `POST /_query` with `FROM <index> METADATA _id | KEEP _id`.
- **Inline side:** `FROM <index> METADATA _id | WHERE <clause> | KEEP _id`, where `<clause>` is a translation of the same exception. Three translations are compared:
  1. **Direct:** what one writes first. `is` is `NOT (f == "v")`, `is one of` is `NOT (f IN (...))`, `matches` is `NOT (f LIKE "p")`, `exists` is `NOT (f IS NOT NULL)`. A negative operator drops the negation.
  2. **Null-safe direct:** the same with the functions that return a boolean for null and multi-valued fields: `MV_CONTAINS(f, "v"::type)`, `COALESCE(MV_LIKE(f, "p"), false)`. Values are cast to the column type and not validated.
  3. **Production compiler:** the output of `compileEndStageItem`, with its validation, typed literals, `MV_INTERSECTS` and `MV_IN_RANGE`. A `text` column is compared as a `keyword` column, on the whole value and respecting case. When it cannot write a clause it skips the item. That is counted as "no form" here, because inlining every source-field exception would leave the item without any exclusion.
- **Data:** one index per type, 2 to 14 documents each, built for the edge cases: single and multi-valued fields, a missing field, `null`, different case, spaces, an empty string, backslashes, line feeds, non-ASCII, out of range numbers, float precision, dates at the start and end of a day and in other formats, IPv4, IPv6 and mapped addresses, CIDR values, versions with a pre-release, flattened sub-keys, nested objects, an alias, a normalizer and `ignore_above`.
- **Operators:** `is`, `is not`, `is one of`, `is not one of`, `matches`, `does not match`, `exists`, `does not exist`, value lists (`keyword`, `ip`, `ip_range`) and `nested` entries.
- **Outcome of one scenario:** `same` (the same rows are kept), `excludes too many` (the inline form drops rows that the DSL keeps), `excludes too few` (it keeps rows that the DSL excludes), `error` (Elasticsearch rejects the inline query, so the rule would fail), `no form` (nothing can be written).

## Scope

617 scenarios on 28 field kinds. In 84 of them the DSL filter itself fails (a wildcard on a number, an invalid value): the rule fails today, so they are not compared. That leaves **533 scenarios** where the DSL works.

## Result

| Translation | Same rows | Silently different | Query error | No form |
|---|---|---|---|---|
| Direct (`==`, `IN`, `LIKE`) | 160 (30%) | 290 (54%) | 83 (16%) | 0 (0%) |
| Null-safe direct (`MV_CONTAINS`, `MV_LIKE`, typed casts) | 378 (71%) | 116 (22%) | 37 (7%) | 2 (0%) |
| Production compiler | 322 (60%) | 52 (10%) | 0 (0%) | 159 (30%) |

Reading it: no translation reproduces the DSL filter for all of the 533 scenarios. The direct form is wrong or fails on 70% of them. The null-safe form fixes most of the missing and multi-valued rows and still differs on 22% and fails on 7%. The production compiler keeps other rows than the DSL on 52 scenarios (a `text` or `match_only_text` field, which the DSL compares after analysis and the compiler on the whole value as the exceptions documentation describes, and a keyword with a normalizer) and has no safe form for 159, which are exceptions that work in the DSL today.

### By field type

Counts of scenarios where the DSL works. "Silent" means different rows with no error.

| Field | Scenarios | Direct: same / silent / error | Null-safe: same / silent / error | Compiler: same / silent / no form |
|---|---|---|---|---|
| `keyword` | 56 | 20 / 34 / 2 | 54 / 0 / 2 | 52 / 0 / 4 |
| `keyword_normalizer` | 20 | 4 / 16 / 0 | 18 / 2 / 0 | 18 / 2 / 0 |
| `keyword_ignore_above` | 12 | 7 / 5 / 0 | 12 / 0 / 0 | 12 / 0 / 0 |
| `text` | 46 | 5 / 41 / 0 | 8 / 38 / 0 | 8 / 38 / 0 |
| `match_only_text` | 14 | 2 / 12 / 0 | 2 / 12 / 0 | 2 / 12 / 0 |
| `wildcard` | 30 | 12 / 18 / 0 | 30 / 0 / 0 | 30 / 0 / 0 |
| `constant_keyword` | 14 | 14 / 0 / 0 | 14 / 0 / 0 | 14 / 0 / 0 |
| `integer` | 28 | 8 / 18 / 2 | 24 / 4 / 0 | 16 / 0 / 12 |
| `long` | 24 | 9 / 13 / 2 | 22 / 2 / 0 | 18 / 0 / 6 |
| `short` | 12 | 5 / 7 / 0 | 12 / 0 / 0 | 12 / 0 / 0 |
| `byte` | 12 | 5 / 7 / 0 | 12 / 0 / 0 | 12 / 0 / 0 |
| `double` | 32 | 11 / 17 / 4 | 28 / 4 / 0 | 2 / 0 / 30 |
| `float` | 22 | 9 / 13 / 0 | 22 / 0 / 0 | 2 / 0 / 20 |
| `half_float` | 12 | 3 / 9 / 0 | 12 / 0 / 0 | 2 / 0 / 10 |
| `scaled_float` | 16 | 6 / 10 / 0 | 16 / 0 / 0 | 2 / 0 / 14 |
| `unsigned_long` | 20 | 4 / 2 / 14 | 14 / 6 / 0 | 14 / 0 / 6 |
| `boolean` | 10 | 2 / 8 / 0 | 10 / 0 / 0 | 10 / 0 / 0 |
| `ip` | 36 | 8 / 8 / 20 | 14 / 20 / 0 | 26 / 0 / 10 |
| `version` | 30 | 10 / 12 / 8 | 22 / 0 / 8 | 18 / 0 / 12 |
| `date` | 24 | 4 / 18 / 2 | 8 / 16 / 0 | 22 / 0 / 2 |
| `date_nanos` | 22 | 5 / 15 / 2 | 10 / 12 / 0 | 20 / 0 / 2 |
| `ip_range` | 8 | 0 / 0 / 8 | 0 / 0 / 8 | 0 / 0 / 8 |
| `geo_point` | 2 | 2 / 0 / 0 | 2 / 0 / 0 | 0 / 0 / 2 |
| `flattened_subkey` | 10 | 0 / 0 / 10 | 0 / 0 / 10 | 0 / 0 / 10 |
| `flattened_root` | 4 | 2 / 0 / 2 | 2 / 0 / 2 | 0 / 0 / 4 |
| `object_parent` | 2 | 0 / 0 / 2 | 0 / 0 / 2 | 0 / 0 / 2 |
| `alias_of_keyword` | 10 | 3 / 7 / 0 | 10 / 0 / 0 | 10 / 0 / 0 |
| `nested` | 5 | 0 / 0 / 5 | 0 / 0 / 5 | 0 / 0 / 5 |

### By operator

| Operator | Scenarios | Direct: same / silent / error | Null-safe: same / silent / error | Compiler: same / silent / no form |
|---|---|---|---|---|
| is (both polarities) | 302 | 80 / 174 / 48 | 214 / 76 / 12 | 172 / 22 / 108 |
| is one of (both polarities) | 76 | 9 / 55 / 12 | 56 / 16 / 4 | 50 / 8 / 18 |
| matches (both polarities) | 86 | 21 / 55 / 10 | 54 / 22 / 10 | 56 / 22 / 8 |
| exists (both polarities) | 54 | 48 / 0 / 6 | 48 / 0 / 6 | 44 / 0 / 10 |
| in list (both polarities) | 10 | 2 / 6 / 2 | 6 / 2 / 0 | 0 / 0 / 10 |
| nested is (both polarities) | 2 | 0 / 0 / 2 | 0 / 0 / 2 | 0 / 0 / 2 |
| nested is one of (both polarities) | 1 | 0 / 0 / 1 | 0 / 0 / 1 | 0 / 0 / 1 |
| nested exists (both polarities) | 2 | 0 / 0 / 2 | 0 / 0 / 2 | 0 / 0 / 2 |

## Why the results differ

Seven causes explain every difference. The examples are scenarios of this run, with their queries.

### 1. Missing, null and multi-valued fields (the direct translation)

`==`, `IN` and `LIKE` return `null` for a document that has no value in the field, and for a multi-valued field. `WHERE` drops a row whose condition is `null`, so `WHERE NOT (f == "x")` drops those rows even though they do not hold `x`. The DSL keeps them. This accounts for 213 of the 290 silent differences of the direct translation, on every type. The null-safe functions (`MV_CONTAINS`, `MV_LIKE` with `COALESCE`) remove this cause.

**Example: `keyword` field, "is good.com". Document `k12` has no field and `k13` holds `null`.**

- Exception: `keyword` field `f` is `good.com`.
- DSL filter keeps 12 of 14 documents, and excludes `k1`="good.com", `k11`=["good.com","bad.com"].
- Direct (`==`, `IN`, `LIKE`): `WHERE NOT (f == "good.com")` drops `k12`=(no field), `k13`=null that the DSL keeps.
- Null-safe direct (`MV_CONTAINS`, `MV_LIKE`, typed casts): `WHERE NOT (MV_CONTAINS(f, "good.com"))` keeps the same rows.
- Production compiler: `WHERE NOT (MV_CONTAINS(f, "good.com"))` keeps the same rows.

### 2. Text fields: analyzed tokens against the whole value

The DSL compares a `text` field after the analyzer: `match_phrase` finds the phrase in any position and ignores the case, and `wildcard` compares each token, in lowercase. ES|QL compares the whole stored value, case sensitive. Equality, `MV_CONTAINS` and `LIKE` therefore keep alerts that the exception excludes, and a pattern with capitals drops rows that the DSL keeps. This is the largest silent group of the null-safe translation (50 of 116). The compiler follows the exceptions documentation instead: it compares a `text` column on the whole value and respecting case, as a `keyword` column, so for the DSL on a source field it keeps other rows in these scenarios, and that is the difference that a computed column accepts.

**Example: `text` field, "is good.com".**

- Exception: `text` field `f` is `good.com`.
- DSL filter keeps 6 of 9 documents, and excludes `t1`="Connection to good.com failed", `t3`="Good.com", `t6`=["to good.com","other"].
- Null-safe direct (`MV_CONTAINS`, `MV_LIKE`, typed casts): `WHERE NOT (MV_CONTAINS(f, "good.com"))` keeps `t1`="Connection to good.com failed", `t3`="Good.com", `t6`=["to good.com","other"] that the DSL excludes.
- Production compiler: `WHERE NOT (MV_CONTAINS(f, "good.com"))` keeps `t1`="Connection to good.com failed", `t3`="Good.com", `t6`=["to good.com","other"] that the DSL excludes.

**Example: `text` field, "matches GOOD*" (the DSL compares the lowercase token `good`, so the pattern matches nothing).**

- Exception: `text` field `f` matches `GOOD*`.
- DSL filter keeps 9 of 9 documents, so it excludes no document.
- Null-safe direct (`MV_CONTAINS`, `MV_LIKE`, typed casts): `WHERE NOT (COALESCE(MV_LIKE(f, "GOOD*"), false))` drops `t2`="GOOD morning" that the DSL keeps.
- Production compiler: `WHERE NOT (COALESCE(MV_LIKE(f, "GOOD*"), false))` drops `t2`="GOOD morning" that the DSL keeps.

### 3. Dates: the DSL rounds to the unit of the value

An exception value of `2026-10-01` excludes every instant of that day in the DSL. A cast of the value gives the midnight, and an equality compares one instant. The same happens for month and year values, and for hours and minutes. The compiler writes the whole range with `MV_IN_RANGE`.

**Example: `date` field, "is 2026-10-01".**

- Exception: `date` field `f` is `2026-10-01`.
- DSL filter keeps 5 of 9 documents, and excludes `dt1`="2026-10-01T08:00:00Z", `dt2`="2026-10-01T23:59:59.999Z", `dt6`=["2026-10-01T08:00:00Z","2026-01-15T00:00:00Z"], `dt9`="2026-10-01T08:00:00.123Z".
- Null-safe direct (`MV_CONTAINS`, `MV_LIKE`, typed casts): `WHERE NOT (MV_CONTAINS(f, "2026-10-01"::date))` keeps `dt1`="2026-10-01T08:00:00Z", `dt2`="2026-10-01T23:59:59.999Z", `dt6`=["2026-10-01T08:00:00Z","2026-01-15T00:00:00Z"], `dt9`="2026-10-01T08:00:00.123Z" that the DSL excludes.
- Production compiler: `WHERE NOT (COALESCE(MV_IN_RANGE(f, "2026-10-01T00:00:00.000Z"::date, "2026-10-01T23:59:59.999Z"::date), false))` keeps the same rows.

### 4. Values that do not cast, or cast to `null`

A string that cannot be cast becomes `null` with a warning, and `MV_CONTAINS(col, null)` is true. The negated form then drops every row, so the rule loses all its alerts without an error. This applies to values that the DSL understands: a CIDR on an `ip` field (the DSL matches the range), a number out of range, `NaN`, a negative `unsigned_long`.

**Example: `ip` field, "is 10.0.0.0/24".**

- Exception: `ip` field `f` is `10.0.0.0/24`.
- DSL filter keeps 7 of 9 documents, and excludes `ip1`="10.0.0.5", `ip6`=["1.1.1.1","10.0.0.7"].
- Direct (`==`, `IN`, `LIKE`): `WHERE NOT (f == "10.0.0.0/24")` fails: `line 1:44: Cannot convert string [10.0.0.0/24] to [IP], error ['10.0.0.0/24' is not an IP string literal.]`
- Null-safe direct (`MV_CONTAINS`, `MV_LIKE`, typed casts): `WHERE NOT (MV_CONTAINS(f, "10.0.0.0/24"::ip))` drops `ip2`="192.168.0.1", `ip3`="::1", `ip4`="2001:db8::1", `ip5`="::ffff:1.2.3.4", `ip7`=(no field), `ip8`="10.0.1.9", `ip9`="0.0.0.0" that the DSL keeps.
- Production compiler: `WHERE NOT (COALESCE(MV_IN_RANGE(f, "10.0.0.0"::ip, "10.0.0.255"::ip), false))` keeps the same rows.

**Example: `integer` field, "is 2147483648" (out of range: the DSL matches nothing).**

- Exception: `integer` field `f` is `2147483648`.
- DSL filter keeps 8 of 8 documents, so it excludes no document.
- Null-safe direct (`MV_CONTAINS`, `MV_LIKE`, typed casts): `WHERE NOT (MV_CONTAINS(f, "2147483648"::integer))` drops `x1`=42, `x2`=-7, `x3`=0, `x4`=2147483647, `x5`=[42,7], `x6`=(no field), `x7`=null, `x8`=43 that the DSL keeps.
- Production compiler: no form (value_not_supported: value "2147483648" cannot be written for a column of type integer at the end of the query).

### 5. Queries that fail

The rule fails when the inline query is invalid. Counts of scenarios, by cause:

| Cause | Direct | Null-safe |
|---|---|---|
| a comparison between two different types | 32 | 10 |
| the field is not a column (`Unknown column`) | 17 | 17 |
| a string that cannot be converted to the column type | 24 | 0 |
| the field type is `unsupported` in ES|QL | 8 | 8 |
| a pattern that LIKE rejects (a lone backslash) | 2 | 2 |

### 6. Nothing can be written

Some DSL exceptions have no ES|QL form at all, with any translation: a `flattened` sub-key (only the root is a column, and it is unusable), a `nested` entry, `exists` on an `object` parent, an `ip_range` field (`unsupported`), and `exists` on a `geo_point` for the compiler. Value lists, `matches` on `text` and `matches` on `version` are written by the direct forms with wrong results or errors, and the compiler has no safe form for them.

**Example: `flattened` sub-key `labels.domain`, "is evil.com".**

- Exception: `flattened_subkey` field `f` is `evil.com`.
- DSL filter keeps 3 of 5 documents, and excludes `fl1`={"labels":{"domain":"evil.com","owner":"a"}}, `fl3`={"labels":{"domain":["evil.com","x"]}}.
- Direct (`==`, `IN`, `LIKE`): `WHERE NOT (labels.domain == "evil.com")` fails: `line 1:53: Unknown column [labels.domain]`
- Null-safe direct (`MV_CONTAINS`, `MV_LIKE`, typed casts): `WHERE NOT (MV_CONTAINS(labels.domain, "evil.com"))` fails: `line 1:65: Unknown column [labels.domain]`
- Production compiler: no form (column_type_not_supported: column "labels.domain" has type "unknown", which cannot be tested at the end of the query).

**Example: `version` field, "matches 1.*".**

- Exception: `version` field `f` matches `1.*`.
- DSL filter keeps 3 of 8 documents, and excludes `v1`="1.2.3", `v2`="1.2.3-beta", `v5`="1.10.0", `v6`=["1.2.3","2.0.0"], `v8`="1.2".
- Direct (`==`, `IN`, `LIKE`): `WHERE NOT (f LIKE "1.*")` fails: `line 1:44: argument of [f LIKE "1.*"] must be [string], found value [f] type [version]`
- Null-safe direct (`MV_CONTAINS`, `MV_LIKE`, typed casts): `WHERE NOT (COALESCE(MV_LIKE(f, "1.*"), false))` fails: `line 1:53: first argument of [MV_LIKE(f, "1.*")] must be [string], found value [f] type [version]`
- Production compiler: no form (operator_not_supported_on_type: "matches" with value "1.*" is not supported on a version column).

### 7. The production compiler

Of the 533 scenarios the compiler writes the same rows for 322, keeps other rows for 52 and has no safe form for 159:

| Reason | Scenarios |
|---|---|
| An operator that the type does not support at the end of the query (`matches` on `version`, `is` and `is one of` on `double`, `float`, `half_float` and `scaled_float`) | 82 |
| A value that the DSL accepts and the compiler does not write (`42.0`, `042`, `+42`, an epoch in milliseconds, `1.02.3`, a number out of range) | 36 |
| A field that is not a usable column (`flattened`, `ip_range`, `geo_point`, an `object` parent) | 26 |
| A value list or a `nested` entry | 15 |

The compiler is conservative on purpose: it skips what it cannot prove equal. 74 of the 159 skipped scenarios are equality on `double`, `float`, `half_float` and `scaled_float`. Right after `FROM` the filter is pushed down to the field and matches (the null-safe column shows it), but after a `STATS` or an `EVAL`, where the end of the query runs, a `float` is widened to a `double` and `0.1` no longer matches `0.10000000149011612`. That limit belongs to the end of the query and not to a `WHERE` right after `FROM`.

The scenarios where it keeps other rows are the `text` and `match_only_text` fields (the DSL compares them after analysis and the compiler on the whole value, as the exceptions documentation describes) and "matches AB*" and "does not match AB*" on a `keyword` with a lowercase normalizer: the DSL applies the normalizer to the pattern, and `MV_LIKE` compares the stored lowercase value.

**Example: `keyword` field with a lowercase normalizer, "matches AB*".**

- Exception: `keyword_normalizer` field `f` matches `AB*`.
- DSL filter keeps 2 of 6 documents, and excludes `n1`="ABC", `n2`="abc", `n3`="Abc", `n4`=["ABC","x"].
- Null-safe direct (`MV_CONTAINS`, `MV_LIKE`, typed casts): `WHERE NOT (COALESCE(MV_LIKE(f, "AB*"), false))` keeps `n1`="ABC", `n2`="abc", `n3`="Abc", `n4`=["ABC","x"] that the DSL excludes.
- Production compiler: `WHERE NOT (COALESCE(MV_LIKE(f, "AB*"), false))` keeps `n1`="ABC", `n2`="abc", `n3`="Abc", `n4`=["ABC","x"] that the DSL excludes.

## Conclusion

Inlining all source-field exceptions right after `FROM` would change the alerts of existing rules, in ways the rule author cannot see, or fail the rule. With the natural translation 70% of the scenarios that work in the DSL are wrong or fail. With null-safe functions 29% still are. With the production compiler, which follows the exceptions documentation for `text` columns, 10% keep other rows than the DSL and 30% have no form (16% without the equality on `double` that only the end of the query makes unsafe). The DSL filter has none of these problems for source fields, so source-field exceptions stay in it and only exceptions on computed columns, which the DSL cannot reach, are written as `WHERE` stages at the end of the query.

## Appendix A: scenarios where the DSL filter itself fails

The rule fails today for these exceptions, so they are not compared. Only the included form is listed, the excluded form fails the same way.

| Field | Operator | Value | Elasticsearch error |
|---|---|---|---|
| `integer` | is | `"abc"` | failed to create query: For input string: "abc" |
| `integer` | is | `""` | failed to create query: empty String |
| `integer` | is one of | `["abc"]` | failed to create query: For input string: "abc" |
| `integer` | is one of | `["42", "0x10"]` | failed to create query: For input string: "0x10" |
| `integer` | matches | `"4*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [integer] |
| `long` | is | `"abc"` | failed to create query: For input string: "abc" |
| `long` | matches | `"4*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [long] |
| `short` | matches | `"4*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [short] |
| `byte` | matches | `"4*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [byte] |
| `double` | is | `"abc"` | failed to create query: For input string: "abc" |
| `double` | matches | `"4*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [double] |
| `float` | matches | `"4*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [float] |
| `half_float` | matches | `"4*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [half_float] |
| `scaled_float` | matches | `"4*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [scaled_float |
| `unsigned_long` | is | `"abc"` | failed to create query: For input string: "abc" |
| `unsigned_long` | matches | `"4*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [unsigned_lon |
| `boolean` | is | `"TRUE"` | failed to create query: Can't parse boolean value [TRUE], expected [true] or [false] |
| `boolean` | is | `"1"` | failed to create query: Can't parse boolean value [1], expected [true] or [false] |
| `boolean` | is | `"yes"` | failed to create query: Can't parse boolean value [yes], expected [true] or [false] |
| `boolean` | is | `""` | failed to create query: Can't parse boolean value [], expected [true] or [false] |
| `boolean` | is one of | `["false", "x"]` | failed to create query: Can't parse boolean value [x], expected [true] or [false] |
| `boolean` | matches | `"t*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [boolean] |
| `ip` | is | `"10.0.0.0/33"` | failed to create query: Illegal prefix length [33] in [10.0.0.0/33]. Must be 0-32 for IPv4 ranges, 0-128 for I |
| `ip` | is | `"bogus"` | failed to create query: 'bogus' is not an IP string literal. |
| `ip` | is | `"::ffff:0:0/96"` | failed to create query: CIDR notation is not allowed with IPv6-mapped IPv4 address [::ffff:0:0 as it introduce |
| `ip` | is | `"010.0.0.5"` | failed to create query: '010.0.0.5' is not an IP string literal. |
| `ip` | is one of | `["1.1.1.1", "bogus"]` | failed to create query: 'bogus' is not an IP string literal. |
| `ip` | matches | `"10.*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [ip] |
| `version` | is | `"99999999999999999999.1.1"` | failed to create query: For input string: "99999999999999999999" |
| `date` | is | `"2026-13-01"` | failed to create query: failed to parse date field [2026-13-01] with format [strict_date_optional_time\|\|epoch_ |
| `date` | is | `"2026-10-01Z"` | failed to create query: failed to parse date field [2026-10-01Z] with format [strict_date_optional_time\|\|epoch |
| `date` | is one of | `["2026-10", "bogus"]` | failed to create query: failed to parse date field [bogus] with format [strict_date_optional_time\|\|epoch_milli |
| `date` | matches | `"2026*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [date] |
| `date_nanos` | is | `"2026-10-01T08"` | failed to create query: failed to parse date field [2026-10-01T08] with format [strict_date_optional_time_nano |
| `date_nanos` | is | `"2026-10-01T08:00"` | failed to create query: failed to parse date field [2026-10-01T08:00] with format [strict_date_optional_time_n |
| `date_nanos` | is | `"2026-13-01"` | failed to create query: failed to parse date field [2026-13-01] with format [strict_date_optional_time_nanos\|\| |
| `date_nanos` | is | `"2026-10-01Z"` | failed to create query: failed to parse date field [2026-10-01Z] with format [strict_date_optional_time_nanos\| |
| `date_nanos` | matches | `"2026*"` | Can only use wildcard queries on keyword, text and wildcard fields - not on [f] which is of type [date_nanos] |
| `ip_range` | is | `"10.0.0.0/24"` | failed to create query: '10.0.0.0/24' is not an IP string literal. |
| `geo_point` | is | `"41.12,-71.34"` | failed to create query: Field [f] of type [geo_point] does not support match_phrase queries |
| `flattened_subkey` | matches | `"evil*"` | failed to create query: [wildcard] queries are not currently supported on keyed [flattened] fields. |
| `flattened_subkey` | matches | `"*.com"` | failed to create query: [wildcard] queries are not currently supported on keyed [flattened] fields. |

## Appendix B: every comparable scenario

One row per scenario and polarity. `same` is the same rows, `too many` means the inline form drops rows that the DSL keeps, `too few` means it keeps rows that the DSL excludes, `both` is both, `error` is a failing query, `no form` is a skipped item. The negative operators of the DSL also match the documents that have no value in the field, so the excluded form is not the mirror of the included one.

| Field | Operator | Value | Direct | Null-safe | Compiler |
|---|---|---|---|---|---|
| `keyword` | is | `good.com` | too many | same | same |
| `keyword` | is not | `good.com` | too many | same | same |
| `keyword` | is | `GOOD.COM` | too many | same | same |
| `keyword` | is not | `GOOD.COM` | same | same | same |
| `keyword` | is | `` | too many | same | same |
| `keyword` | is not | `` | same | same | same |
| `keyword` | is | `a\b` | too many | same | same |
| `keyword` | is not | `a\b` | same | same | same |
| `keyword` | is | `line1\nline2` | too many | same | same |
| `keyword` | is not | `line1\nline2` | same | same | same |
| `keyword` | is | `wild*card` | too many | same | same |
| `keyword` | is not | `wild*card` | same | same | same |
| `keyword` | is | `über` | too many | same | same |
| `keyword` | is not | `über` | same | same | same |
| `keyword` | is | `good.com ` | too many | same | same |
| `keyword` | is not | `good.com ` | same | same | same |
| `keyword` | is | `x"y` | too many | same | same |
| `keyword` | is not | `x"y` | same | same | same |
| `keyword` | is one of | `["good.com", "bad.com"]` | too many | same | same |
| `keyword` | is not one of | `["good.com", "bad.com"]` | too many | same | same |
| `keyword` | is one of | `["GOOD.COM", "missing"]` | too many | same | same |
| `keyword` | is not one of | `["GOOD.COM", "missing"]` | same | same | same |
| `keyword` | is one of | `["a\\b", "über"]` | too many | same | same |
| `keyword` | is not one of | `["a\\b", "über"]` | same | same | same |
| `keyword` | is one of | `["good.com"]` | too many | same | same |
| `keyword` | is not one of | `["good.com"]` | too many | same | same |
| `keyword` | matches | `good*` | too many | same | same |
| `keyword` | does not match | `good*` | too many | same | same |
| `keyword` | matches | `*good*` | too many | same | same |
| `keyword` | does not match | `*good*` | too many | same | same |
| `keyword` | matches | `g?od.com` | too many | same | same |
| `keyword` | does not match | `g?od.com` | too many | same | same |
| `keyword` | matches | `GOOD*` | too many | same | same |
| `keyword` | does not match | `GOOD*` | same | same | same |
| `keyword` | matches | `*` | same | same | same |
| `keyword` | does not match | `*` | same | same | same |
| `keyword` | matches | `good.com` | too many | same | same |
| `keyword` | does not match | `good.com` | too many | same | same |
| `keyword` | matches | `*.com` | too many | same | same |
| `keyword` | does not match | `*.com` | too many | same | same |
| `keyword` | matches | `wild\*card` | too many | same | same |
| `keyword` | does not match | `wild\*card` | same | same | same |
| `keyword` | matches | `a\\b` | too many | same | same |
| `keyword` | does not match | `a\\b` | same | same | same |
| `keyword` | matches | `a\b` | error | error | same |
| `keyword` | does not match | `a\b` | error | error | same |
| `keyword` | matches | `???` | too many | same | same |
| `keyword` | does not match | `???` | same | same | same |
| `keyword` | matches | `*\n*` | too many | same | same |
| `keyword` | does not match | `*\n*` | same | same | same |
| `keyword` | exists | `null` | same | same | same |
| `keyword` | does not exist | `null` | same | same | same |
| `keyword` | in list | `{"listType": "keyword", "values": ["good.co...` | too many | same | no form |
| `keyword` | not in list | `{"listType": "keyword", "values": ["good.co...` | too many | same | no form |
| `keyword` | in list | `{"listType": "keyword", "values": ["GOOD.CO...` | too many | same | no form |
| `keyword` | not in list | `{"listType": "keyword", "values": ["GOOD.CO...` | same | same | no form |
| `keyword_normalizer` | is | `ABC` | too many | same | same |
| `keyword_normalizer` | is not | `ABC` | too many | same | same |
| `keyword_normalizer` | is | `abc` | too many | same | same |
| `keyword_normalizer` | is not | `abc` | too many | same | same |
| `keyword_normalizer` | is | `Abc` | too many | same | same |
| `keyword_normalizer` | is not | `Abc` | too many | same | same |
| `keyword_normalizer` | is | `XYZ` | too many | same | same |
| `keyword_normalizer` | is not | `XYZ` | same | same | same |
| `keyword_normalizer` | is one of | `["ABC", "q"]` | too many | same | same |
| `keyword_normalizer` | is not one of | `["ABC", "q"]` | too many | same | same |
| `keyword_normalizer` | is one of | `["abc"]` | too many | same | same |
| `keyword_normalizer` | is not one of | `["abc"]` | too many | same | same |
| `keyword_normalizer` | matches | `AB*` | too many | too few | too few |
| `keyword_normalizer` | does not match | `AB*` | too many | too many | too many |
| `keyword_normalizer` | matches | `ab*` | too many | same | same |
| `keyword_normalizer` | does not match | `ab*` | too many | same | same |
| `keyword_normalizer` | matches | `xyz` | too many | same | same |
| `keyword_normalizer` | does not match | `xyz` | same | same | same |
| `keyword_normalizer` | exists | `null` | same | same | same |
| `keyword_normalizer` | does not exist | `null` | same | same | same |
| `keyword_ignore_above` | is | `short` | too many | same | same |
| `keyword_ignore_above` | is not | `short` | same | same | same |
| `keyword_ignore_above` | is | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | too many | same | same |
| `keyword_ignore_above` | is not | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | same | same | same |
| `keyword_ignore_above` | is one of | `["short", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"]` | too many | same | same |
| `keyword_ignore_above` | is not one of | `["short", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"]` | same | same | same |
| `keyword_ignore_above` | matches | `x*` | too many | same | same |
| `keyword_ignore_above` | does not match | `x*` | same | same | same |
| `keyword_ignore_above` | matches | `s*` | too many | same | same |
| `keyword_ignore_above` | does not match | `s*` | same | same | same |
| `keyword_ignore_above` | exists | `null` | same | same | same |
| `keyword_ignore_above` | does not exist | `null` | same | same | same |
| `text` | is | `good.com` | both | too few | too few |
| `text` | is not | `good.com` | too many | too many | too many |
| `text` | is | `to good.com` | both | too few | too few |
| `text` | is not | `to good.com` | too many | too many | too many |
| `text` | is | `Connection` | both | too few | too few |
| `text` | is not | `Connection` | too many | too many | too many |
| `text` | is | `connection to` | both | too few | too few |
| `text` | is not | `connection to` | too many | too many | too many |
| `text` | is | `good` | both | too few | too few |
| `text` | is not | `good` | too many | too many | too many |
| `text` | is | `failed to` | too many | same | same |
| `text` | is not | `failed to` | same | same | same |
| `text` | is | `Good` | both | too few | too few |
| `text` | is not | `Good` | too many | too many | too many |
| `text` | is | `two spaces` | both | too few | too few |
| `text` | is not | `two spaces` | too many | too many | too many |
| `text` | is | `good day` | both | too few | too few |
| `text` | is not | `good day` | too many | too many | too many |
| `text` | is | `Connection to good.com failed` | too many | same | same |
| `text` | is not | `Connection to good.com failed` | same | same | same |
| `text` | is one of | `["good.com", "morning"]` | both | too few | too few |
| `text` | is not one of | `["good.com", "morning"]` | too many | too many | too many |
| `text` | is one of | `["GOOD", "missing"]` | both | too few | too few |
| `text` | is not one of | `["GOOD", "missing"]` | too many | too many | too many |
| `text` | is one of | `["failed login"]` | both | too few | too few |
| `text` | is not one of | `["failed login"]` | too many | too many | too many |
| `text` | matches | `good*` | both | too few | too few |
| `text` | does not match | `good*` | too many | too many | too many |
| `text` | matches | `*good*` | both | too few | too few |
| `text` | does not match | `*good*` | too many | too many | too many |
| `text` | matches | `GOOD*` | too many | too many | too many |
| `text` | does not match | `GOOD*` | too few | too few | too few |
| `text` | matches | `conn*` | both | too few | too few |
| `text` | does not match | `conn*` | too many | too many | too many |
| `text` | matches | `*om*` | too many | same | same |
| `text` | does not match | `*om*` | too many | same | same |
| `text` | matches | `?ood*` | both | too few | too few |
| `text` | does not match | `?ood*` | too many | too many | too many |
| `text` | matches | `good.com` | both | too few | too few |
| `text` | does not match | `good.com` | too many | too many | too many |
| `text` | matches | `Connection*` | too many | too many | too many |
| `text` | does not match | `Connection*` | too few | too few | too few |
| `text` | matches | `to good*` | too many | too many | too many |
| `text` | does not match | `to good*` | same | too few | too few |
| `text` | exists | `null` | same | same | same |
| `text` | does not exist | `null` | same | same | same |
| `match_only_text` | is | `good.com` | both | too few | too few |
| `match_only_text` | is not | `good.com` | too many | too many | too many |
| `match_only_text` | is | `to good.com` | both | too few | too few |
| `match_only_text` | is not | `to good.com` | too many | too many | too many |
| `match_only_text` | is | `Good` | both | too few | too few |
| `match_only_text` | is not | `Good` | too many | too many | too many |
| `match_only_text` | is one of | `["good.com", "morning"]` | both | too few | too few |
| `match_only_text` | is not one of | `["good.com", "morning"]` | too many | too many | too many |
| `match_only_text` | matches | `good*` | both | too few | too few |
| `match_only_text` | does not match | `good*` | too many | too many | too many |
| `match_only_text` | matches | `GOOD*` | too many | too many | too many |
| `match_only_text` | does not match | `GOOD*` | too few | too few | too few |
| `match_only_text` | exists | `null` | same | same | same |
| `match_only_text` | does not exist | `null` | same | same | same |
| `wildcard` | is | `good.com` | too many | same | same |
| `wildcard` | is not | `good.com` | too many | same | same |
| `wildcard` | is | `GOOD.COM` | too many | same | same |
| `wildcard` | is not | `GOOD.COM` | same | same | same |
| `wildcard` | is | `a\b` | too many | same | same |
| `wildcard` | is not | `a\b` | same | same | same |
| `wildcard` | is | `line1\nline2` | too many | same | same |
| `wildcard` | is not | `line1\nline2` | same | same | same |
| `wildcard` | is | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...` | too many | same | same |
| `wildcard` | is not | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...` | same | same | same |
| `wildcard` | is one of | `["good.com", "bad.com"]` | too many | same | same |
| `wildcard` | is not one of | `["good.com", "bad.com"]` | too many | same | same |
| `wildcard` | matches | `good*` | too many | same | same |
| `wildcard` | does not match | `good*` | too many | same | same |
| `wildcard` | matches | `*good*` | too many | same | same |
| `wildcard` | does not match | `*good*` | too many | same | same |
| `wildcard` | matches | `GOOD*` | too many | same | same |
| `wildcard` | does not match | `GOOD*` | same | same | same |
| `wildcard` | matches | `g?od.com` | too many | same | same |
| `wildcard` | does not match | `g?od.com` | too many | same | same |
| `wildcard` | matches | `*` | same | same | same |
| `wildcard` | does not match | `*` | same | same | same |
| `wildcard` | matches | `a\\b` | too many | same | same |
| `wildcard` | does not match | `a\\b` | same | same | same |
| `wildcard` | matches | `*\n*` | too many | same | same |
| `wildcard` | does not match | `*\n*` | same | same | same |
| `wildcard` | matches | `x*` | too many | same | same |
| `wildcard` | does not match | `x*` | same | same | same |
| `wildcard` | exists | `null` | same | same | same |
| `wildcard` | does not exist | `null` | same | same | same |
| `constant_keyword` | is | `prod` | same | same | same |
| `constant_keyword` | is not | `prod` | same | same | same |
| `constant_keyword` | is | `dev` | same | same | same |
| `constant_keyword` | is not | `dev` | same | same | same |
| `constant_keyword` | is | `PROD` | same | same | same |
| `constant_keyword` | is not | `PROD` | same | same | same |
| `constant_keyword` | is one of | `["prod", "dev"]` | same | same | same |
| `constant_keyword` | is not one of | `["prod", "dev"]` | same | same | same |
| `constant_keyword` | matches | `pr*` | same | same | same |
| `constant_keyword` | does not match | `pr*` | same | same | same |
| `constant_keyword` | matches | `dev*` | same | same | same |
| `constant_keyword` | does not match | `dev*` | same | same | same |
| `constant_keyword` | exists | `null` | same | same | same |
| `constant_keyword` | does not exist | `null` | same | same | same |
| `integer` | is | `42` | too many | same | same |
| `integer` | is not | `42` | too many | same | same |
| `integer` | is | `042` | too many | same | same |
| `integer` | is not | `042` | too many | same | same |
| `integer` | is | `+42` | too many | same | same |
| `integer` | is not | `+42` | too many | same | same |
| `integer` | is | `42.0` | too many | same | no form |
| `integer` | is not | `42.0` | too many | same | no form |
| `integer` | is | `4.2e1` | too many | same | no form |
| `integer` | is not | `4.2e1` | too many | same | no form |
| `integer` | is | `-7` | too many | same | same |
| `integer` | is not | `-7` | same | same | same |
| `integer` | is | `0` | too many | same | same |
| `integer` | is not | `0` | same | same | same |
| `integer` | is | `2147483648` | too many | too many | no form |
| `integer` | is not | `2147483648` | same | too few | no form |
| `integer` | is | `1e3` | too many | same | no form |
| `integer` | is not | `1e3` | same | same | no form |
| `integer` | is | `42.5` | too many | too many | no form |
| `integer` | is not | `42.5` | same | too few | no form |
| `integer` | is | ` 42` | error | same | no form |
| `integer` | is not | ` 42` | error | same | no form |
| `integer` | is one of | `["42", "7"]` | too many | same | same |
| `integer` | is not one of | `["42", "7"]` | too many | same | same |
| `integer` | is one of | `["43", "-7"]` | too many | same | same |
| `integer` | is not one of | `["43", "-7"]` | same | same | same |
| `integer` | exists | `null` | same | same | same |
| `integer` | does not exist | `null` | same | same | same |
| `long` | is | `42` | too many | same | same |
| `long` | is not | `42` | same | same | same |
| `long` | is | `9000000000` | too many | same | same |
| `long` | is not | `9000000000` | too many | same | same |
| `long` | is | `9007199254740993` | too many | same | same |
| `long` | is not | `9007199254740993` | same | same | same |
| `long` | is | `9007199254740992` | too many | same | same |
| `long` | is not | `9007199254740992` | same | same | same |
| `long` | is | `42.0` | too many | same | no form |
| `long` | is not | `42.0` | same | same | no form |
| `long` | is | `1e3` | too many | same | no form |
| `long` | is not | `1e3` | same | same | no form |
| `long` | is | `9223372036854775807` | too many | same | same |
| `long` | is not | `9223372036854775807` | same | same | same |
| `long` | is | `9223372036854775808` | error | too many | no form |
| `long` | is not | `9223372036854775808` | error | too few | no form |
| `long` | is | `-9000000000` | too many | same | same |
| `long` | is not | `-9000000000` | same | same | same |
| `long` | is one of | `["42", "9000000000"]` | too many | same | same |
| `long` | is not one of | `["42", "9000000000"]` | too many | same | same |
| `long` | is one of | `["9007199254740993", "1"]` | too many | same | same |
| `long` | is not one of | `["9007199254740993", "1"]` | too many | same | same |
| `long` | exists | `null` | same | same | same |
| `long` | does not exist | `null` | same | same | same |
| `short` | is | `42` | too many | same | same |
| `short` | is not | `42` | too many | same | same |
| `short` | is | `32767` | too many | same | same |
| `short` | is not | `32767` | same | same | same |
| `short` | is | `32768` | too many | same | same |
| `short` | is not | `32768` | same | same | same |
| `short` | is | `-32768` | too many | same | same |
| `short` | is not | `-32768` | same | same | same |
| `short` | is one of | `["42", "1"]` | too many | same | same |
| `short` | is not one of | `["42", "1"]` | too many | same | same |
| `short` | exists | `null` | same | same | same |
| `short` | does not exist | `null` | same | same | same |
| `byte` | is | `42` | too many | same | same |
| `byte` | is not | `42` | too many | same | same |
| `byte` | is | `127` | too many | same | same |
| `byte` | is not | `127` | same | same | same |
| `byte` | is | `128` | too many | same | same |
| `byte` | is not | `128` | same | same | same |
| `byte` | is | `-128` | too many | same | same |
| `byte` | is not | `-128` | same | same | same |
| `byte` | is one of | `["42", "1"]` | too many | same | same |
| `byte` | is not one of | `["42", "1"]` | too many | same | same |
| `byte` | exists | `null` | same | same | same |
| `byte` | does not exist | `null` | same | same | same |
| `double` | is | `0.1` | too many | same | no form |
| `double` | is not | `0.1` | too many | same | no form |
| `double` | is | `0.10` | too many | same | no form |
| `double` | is not | `0.10` | too many | same | no form |
| `double` | is | `1e-1` | too many | same | no form |
| `double` | is not | `1e-1` | too many | same | no form |
| `double` | is | `3.14` | too many | same | no form |
| `double` | is not | `3.14` | same | same | no form |
| `double` | is | `.5` | too many | same | no form |
| `double` | is not | `.5` | same | same | no form |
| `double` | is | `-0.5` | too many | same | no form |
| `double` | is not | `-0.5` | same | same | no form |
| `double` | is | `0` | too many | same | no form |
| `double` | is not | `0` | same | same | no form |
| `double` | is | `1e10` | too many | same | no form |
| `double` | is not | `1e10` | same | same | no form |
| `double` | is | `NaN` | error | too many | no form |
| `double` | is not | `NaN` | error | too few | no form |
| `double` | is | `Infinity` | error | too many | no form |
| `double` | is not | `Infinity` | error | too few | no form |
| `double` | is | `0.30000000000000004` | too many | same | no form |
| `double` | is not | `0.30000000000000004` | same | same | no form |
| `double` | is | `0.3` | too many | same | no form |
| `double` | is not | `0.3` | same | same | no form |
| `double` | is | `1.5` | too many | same | no form |
| `double` | is not | `1.5` | same | same | no form |
| `double` | is one of | `["0.1", "3.14"]` | too many | same | no form |
| `double` | is not one of | `["0.1", "3.14"]` | too many | same | no form |
| `double` | is one of | `["0.3", "1.5"]` | too many | same | no form |
| `double` | is not one of | `["0.3", "1.5"]` | same | same | no form |
| `double` | exists | `null` | same | same | same |
| `double` | does not exist | `null` | same | same | same |
| `float` | is | `0.1` | too many | same | no form |
| `float` | is not | `0.1` | too many | same | no form |
| `float` | is | `3.14` | too many | same | no form |
| `float` | is not | `3.14` | same | same | no form |
| `float` | is | `1.5` | too many | same | no form |
| `float` | is not | `1.5` | same | same | no form |
| `float` | is | `0.3` | too many | same | no form |
| `float` | is not | `0.3` | same | same | no form |
| `float` | is | `0.30000001192092896` | too many | same | no form |
| `float` | is not | `0.30000001192092896` | same | same | no form |
| `float` | is | `0.10000000149011612` | too many | same | no form |
| `float` | is not | `0.10000000149011612` | too many | same | no form |
| `float` | is | `16777216` | too many | same | no form |
| `float` | is not | `16777216` | same | same | no form |
| `float` | is | `16777217` | too many | same | no form |
| `float` | is not | `16777217` | same | same | no form |
| `float` | is one of | `["0.1", "1.5"]` | too many | same | no form |
| `float` | is not one of | `["0.1", "1.5"]` | too many | same | no form |
| `float` | is one of | `["0.3"]` | too many | same | no form |
| `float` | is not one of | `["0.3"]` | same | same | no form |
| `float` | exists | `null` | same | same | same |
| `float` | does not exist | `null` | same | same | same |
| `half_float` | is | `0.1` | too many | same | no form |
| `half_float` | is not | `0.1` | too many | same | no form |
| `half_float` | is | `1.5` | too many | same | no form |
| `half_float` | is not | `1.5` | too many | same | no form |
| `half_float` | is | `0.0999755859375` | too many | same | no form |
| `half_float` | is not | `0.0999755859375` | too many | same | no form |
| `half_float` | is | `65504` | too many | same | no form |
| `half_float` | is not | `65504` | same | same | no form |
| `half_float` | is one of | `["0.1", "1.5"]` | too many | same | no form |
| `half_float` | is not one of | `["0.1", "1.5"]` | too many | same | no form |
| `half_float` | exists | `null` | same | same | same |
| `half_float` | does not exist | `null` | same | same | same |
| `scaled_float` | is | `0.1` | too many | same | no form |
| `scaled_float` | is not | `0.1` | too many | same | no form |
| `scaled_float` | is | `3.14` | too many | same | no form |
| `scaled_float` | is not | `3.14` | too many | same | no form |
| `scaled_float` | is | `3.15` | too many | same | no form |
| `scaled_float` | is not | `3.15` | same | same | no form |
| `scaled_float` | is | `3.145` | too many | same | no form |
| `scaled_float` | is not | `3.145` | same | same | no form |
| `scaled_float` | is | `1.01` | too many | same | no form |
| `scaled_float` | is not | `1.01` | same | same | no form |
| `scaled_float` | is | `1.005` | too many | same | no form |
| `scaled_float` | is not | `1.005` | same | same | no form |
| `scaled_float` | is one of | `["0.1", "3.14"]` | too many | same | no form |
| `scaled_float` | is not one of | `["0.1", "3.14"]` | too many | same | no form |
| `scaled_float` | exists | `null` | same | same | same |
| `scaled_float` | does not exist | `null` | same | same | same |
| `unsigned_long` | is | `18446744073709551615` | too many | same | same |
| `unsigned_long` | is not | `18446744073709551615` | same | same | same |
| `unsigned_long` | is | `5` | error | same | same |
| `unsigned_long` | is not | `5` | error | same | same |
| `unsigned_long` | is | `0` | error | same | same |
| `unsigned_long` | is not | `0` | error | same | same |
| `unsigned_long` | is | `-1` | error | too many | no form |
| `unsigned_long` | is not | `-1` | error | too few | no form |
| `unsigned_long` | is | `5.0` | error | too many | no form |
| `unsigned_long` | is not | `5.0` | error | too few | no form |
| `unsigned_long` | is | `18446744073709551616` | error | too many | no form |
| `unsigned_long` | is not | `18446744073709551616` | error | too few | no form |
| `unsigned_long` | is | `9223372036854775808` | too many | same | same |
| `unsigned_long` | is not | `9223372036854775808` | same | same | same |
| `unsigned_long` | is one of | `["5", "7"]` | error | same | same |
| `unsigned_long` | is not one of | `["5", "7"]` | error | same | same |
| `unsigned_long` | is one of | `["18446744073709551615", "1"]` | error | same | same |
| `unsigned_long` | is not one of | `["18446744073709551615", "1"]` | error | same | same |
| `unsigned_long` | exists | `null` | same | same | same |
| `unsigned_long` | does not exist | `null` | same | same | same |
| `boolean` | is | `true` | too many | same | same |
| `boolean` | is not | `true` | too many | same | same |
| `boolean` | is | `false` | too many | same | same |
| `boolean` | is not | `false` | too many | same | same |
| `boolean` | is one of | `["true"]` | too many | same | same |
| `boolean` | is not one of | `["true"]` | too many | same | same |
| `boolean` | is one of | `["true", "false"]` | too many | same | same |
| `boolean` | is not one of | `["true", "false"]` | too many | same | same |
| `boolean` | exists | `null` | same | same | same |
| `boolean` | does not exist | `null` | same | same | same |
| `ip` | is | `10.0.0.5` | too many | same | same |
| `ip` | is not | `10.0.0.5` | same | same | same |
| `ip` | is | `10.0.0.0/24` | error | too many | same |
| `ip` | is not | `10.0.0.0/24` | error | too few | same |
| `ip` | is | `10.0.0.5/32` | error | too many | same |
| `ip` | is not | `10.0.0.5/32` | error | too few | same |
| `ip` | is | `::1` | too many | same | same |
| `ip` | is not | `::1` | same | same | same |
| `ip` | is | `::1/128` | error | too many | same |
| `ip` | is not | `::1/128` | error | too few | same |
| `ip` | is | `2001:db8::/32` | error | too many | same |
| `ip` | is not | `2001:db8::/32` | error | too few | same |
| `ip` | is | `::ffff:1.2.3.4` | too many | same | same |
| `ip` | is not | `::ffff:1.2.3.4` | same | same | same |
| `ip` | is | `1.2.3.4` | too many | same | same |
| `ip` | is not | `1.2.3.4` | same | same | same |
| `ip` | is | `0.0.0.0/0` | error | too many | same |
| `ip` | is not | `0.0.0.0/0` | error | too few | same |
| `ip` | is | `::/0` | error | too many | no form |
| `ip` | is not | `::/0` | error | too few | no form |
| `ip` | is | `1.2.3.4/+8` | error | too many | no form |
| `ip` | is not | `1.2.3.4/+8` | error | too few | no form |
| `ip` | is | `fe80::1%eth0` | too many | same | same |
| `ip` | is not | `fe80::1%eth0` | same | same | same |
| `ip` | is one of | `["10.0.0.5", "192.168.0.0/16"]` | error | too many | same |
| `ip` | is not one of | `["10.0.0.5", "192.168.0.0/16"]` | error | too few | same |
| `ip` | is one of | `["10.0.0.0/24", "2001:db8::/32"]` | error | too many | same |
| `ip` | is not one of | `["10.0.0.0/24", "2001:db8::/32"]` | error | too few | same |
| `ip` | exists | `null` | same | same | same |
| `ip` | does not exist | `null` | same | same | same |
| `ip` | in list | `{"listType": "ip", "values": ["10.0.0.5", "...` | too many | same | no form |
| `ip` | not in list | `{"listType": "ip", "values": ["10.0.0.5", "...` | same | same | no form |
| `ip` | in list | `{"listType": "ip", "values": ["10.0.0.0/24"...` | error | too many | no form |
| `ip` | not in list | `{"listType": "ip", "values": ["10.0.0.0/24"...` | error | too few | no form |
| `ip` | in list | `{"listType": "ip_range", "values": ["10.0.0...` | too many | no form | no form |
| `ip` | not in list | `{"listType": "ip_range", "values": ["10.0.0...` | too many | no form | no form |
| `version` | is | `1.2.3` | too many | same | same |
| `version` | is not | `1.2.3` | too many | same | same |
| `version` | is | `1.2` | too many | same | same |
| `version` | is not | `1.2` | same | same | same |
| `version` | is | `1.2.3-beta` | too many | same | same |
| `version` | is not | `1.2.3-beta` | same | same | same |
| `version` | is | `bogus` | too many | same | no form |
| `version` | is not | `bogus` | same | same | no form |
| `version` | is | `10.0.0` | too many | same | same |
| `version` | is not | `10.0.0` | same | same | same |
| `version` | is | `1.10.0` | too many | same | same |
| `version` | is not | `1.10.0` | same | same | same |
| `version` | is | `1.02.3` | too many | same | same |
| `version` | is not | `1.02.3` | same | same | same |
| `version` | is | `2` | too many | same | same |
| `version` | is not | `2` | same | same | same |
| `version` | is one of | `["1.2.3", "2.0.0"]` | too many | same | same |
| `version` | is not one of | `["1.2.3", "2.0.0"]` | too many | same | same |
| `version` | is one of | `["bogus"]` | too many | same | no form |
| `version` | is not one of | `["bogus"]` | same | same | no form |
| `version` | matches | `1.*` | error | error | no form |
| `version` | does not match | `1.*` | error | error | no form |
| `version` | matches | `*.3` | error | error | no form |
| `version` | does not match | `*.3` | error | error | no form |
| `version` | matches | `1.2.*` | error | error | no form |
| `version` | does not match | `1.2.*` | error | error | no form |
| `version` | matches | `1.2.3*` | error | error | no form |
| `version` | does not match | `1.2.3*` | error | error | no form |
| `version` | exists | `null` | same | same | same |
| `version` | does not exist | `null` | same | same | same |
| `date` | is | `2026` | too many | same | same |
| `date` | is not | `2026` | same | same | same |
| `date` | is | `2026-10` | both | too few | same |
| `date` | is not | `2026-10` | too many | too many | same |
| `date` | is | `2026-10-01` | both | too few | same |
| `date` | is not | `2026-10-01` | too many | too many | same |
| `date` | is | `2026-10-01T08` | both | too few | same |
| `date` | is not | `2026-10-01T08` | too many | too many | same |
| `date` | is | `2026-10-01T08:00` | both | too few | same |
| `date` | is not | `2026-10-01T08:00` | too many | too many | same |
| `date` | is | `2026-10-01T08:00:00Z` | both | too few | same |
| `date` | is not | `2026-10-01T08:00:00Z` | too many | too many | same |
| `date` | is | `2026-10-01T08:00:00.000Z` | too many | same | same |
| `date` | is not | `2026-10-01T08:00:00.000Z` | too many | same | same |
| `date` | is | `2026-10-01T10:00:00+02:00` | both | too few | same |
| `date` | is not | `2026-10-01T10:00:00+02:00` | too many | too many | same |
| `date` | is | `1759305600000` | error | too many | no form |
| `date` | is not | `1759305600000` | error | too few | no form |
| `date` | is | `2026-10-01T08:00:00.123Z` | too many | same | same |
| `date` | is not | `2026-10-01T08:00:00.123Z` | same | same | same |
| `date` | is one of | `["2026-10-01", "2026-09-30"]` | both | too few | same |
| `date` | is not one of | `["2026-10-01", "2026-09-30"]` | too many | too many | same |
| `date` | exists | `null` | same | same | same |
| `date` | does not exist | `null` | same | same | same |
| `date_nanos` | is | `2026` | too many | same | same |
| `date_nanos` | is not | `2026` | same | same | same |
| `date_nanos` | is | `2026-10` | both | too few | same |
| `date_nanos` | is not | `2026-10` | too many | too many | same |
| `date_nanos` | is | `2026-10-01` | both | too few | same |
| `date_nanos` | is not | `2026-10-01` | too many | too many | same |
| `date_nanos` | is | `2026-10-01T08:00:00Z` | both | too few | same |
| `date_nanos` | is not | `2026-10-01T08:00:00Z` | too many | too many | same |
| `date_nanos` | is | `2026-10-01T08:00:00.000Z` | too many | same | same |
| `date_nanos` | is not | `2026-10-01T08:00:00.000Z` | too many | same | same |
| `date_nanos` | is | `2026-10-01T10:00:00+02:00` | both | too few | same |
| `date_nanos` | is not | `2026-10-01T10:00:00+02:00` | too many | too many | same |
| `date_nanos` | is | `1759305600000` | error | too many | no form |
| `date_nanos` | is not | `1759305600000` | error | too few | no form |
| `date_nanos` | is | `2026-10-01T08:00:00.123456789Z` | too many | same | same |
| `date_nanos` | is not | `2026-10-01T08:00:00.123456789Z` | same | same | same |
| `date_nanos` | is | `2026-10-01T08:00:00.123Z` | too many | same | same |
| `date_nanos` | is not | `2026-10-01T08:00:00.123Z` | same | same | same |
| `date_nanos` | is one of | `["2026-10-01", "2026-09-30"]` | both | too few | same |
| `date_nanos` | is not one of | `["2026-10-01", "2026-09-30"]` | too many | too many | same |
| `date_nanos` | exists | `null` | same | same | same |
| `date_nanos` | does not exist | `null` | same | same | same |
| `ip_range` | is | `10.0.0.5` | error | error | no form |
| `ip_range` | is not | `10.0.0.5` | error | error | no form |
| `ip_range` | is | `192.168.1.1` | error | error | no form |
| `ip_range` | is not | `192.168.1.1` | error | error | no form |
| `ip_range` | is one of | `["10.0.0.5", "1.1.1.1"]` | error | error | no form |
| `ip_range` | is not one of | `["10.0.0.5", "1.1.1.1"]` | error | error | no form |
| `ip_range` | exists | `null` | error | error | no form |
| `ip_range` | does not exist | `null` | error | error | no form |
| `geo_point` | exists | `null` | same | same | no form |
| `geo_point` | does not exist | `null` | same | same | no form |
| `flattened_subkey` | is | `evil.com` | error | error | no form |
| `flattened_subkey` | is not | `evil.com` | error | error | no form |
| `flattened_subkey` | is | `EVIL.COM` | error | error | no form |
| `flattened_subkey` | is not | `EVIL.COM` | error | error | no form |
| `flattened_subkey` | is | `good.com` | error | error | no form |
| `flattened_subkey` | is not | `good.com` | error | error | no form |
| `flattened_subkey` | is one of | `["evil.com", "x"]` | error | error | no form |
| `flattened_subkey` | is not one of | `["evil.com", "x"]` | error | error | no form |
| `flattened_subkey` | exists | `null` | error | error | no form |
| `flattened_subkey` | does not exist | `null` | error | error | no form |
| `flattened_root` | is | `evil.com` | error | error | no form |
| `flattened_root` | is not | `evil.com` | error | error | no form |
| `flattened_root` | exists | `null` | same | same | no form |
| `flattened_root` | does not exist | `null` | same | same | no form |
| `object_parent` | exists | `null` | error | error | no form |
| `object_parent` | does not exist | `null` | error | error | no form |
| `alias_of_keyword` | is | `good.com` | too many | same | same |
| `alias_of_keyword` | is not | `good.com` | too many | same | same |
| `alias_of_keyword` | is | `GOOD.COM` | too many | same | same |
| `alias_of_keyword` | is not | `GOOD.COM` | same | same | same |
| `alias_of_keyword` | is one of | `["good.com", "x"]` | too many | same | same |
| `alias_of_keyword` | is not one of | `["good.com", "x"]` | too many | same | same |
| `alias_of_keyword` | matches | `good*` | too many | same | same |
| `alias_of_keyword` | does not match | `good*` | too many | same | same |
| `alias_of_keyword` | exists | `null` | same | same | same |
| `alias_of_keyword` | does not exist | `null` | same | same | same |
| `nested` | nested is | `svc` | error | error | no form |
| `nested` | nested is not | `svc` | error | error | no form |
| `nested` | nested is one of | `["svc", "bob"]` | error | error | no form |
| `nested` | nested exists | `null` | error | error | no form |
| `nested` | nested does not exist | `null` | error | error | no form |

## Appendix C: documents used

- `keyword`: `k1`="good.com"; `k2`="Good.COM"; `k3`=" good.com"; `k4`="good.com "; `k5`="bad.com"; `k6`=""; `k7`="a\\b"; `k8`="line1\nline2"; `k9`="wild*card"; `k10`="über"; `k11`=["good.com","bad.com"]; `k12`=(no field); `k13`=null; `k14`="x\"y"
- `keyword_normalizer`: `n1`="ABC"; `n2`="abc"; `n3`="Abc"; `n4`=["ABC","x"]; `n5`=(no field); `n6`="XYZ"
- `keyword_ignore_above`: `i1`="short"; `i2`="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; `i3`=(no field); `i4`=["short","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"]
- `text`: `t1`="Connection to good.com failed"; `t2`="GOOD morning"; `t3`="Good.com"; `t4`="two  spaces"; `t5`="good-day"; `t6`=["to good.com","other"]; `t7`=(no field); `t8`=""; `t9`="Failed login"
- `match_only_text`: `m1`="Connection to good.com failed"; `m2`="GOOD morning"; `m3`=(no field); `m4`=["to good.com","other"]
- `wildcard`: `w1`="good.com"; `w2`="Good.COM"; `w3`="a\\b"; `w4`="line1\nline2"; `w5`=(no field); `w6`=["good.com","bad.com"]; `w7`="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
- `constant_keyword`: `c1`="prod"; `c2`=(no field)
- `integer`: `x1`=42; `x2`=-7; `x3`=0; `x4`=2147483647; `x5`=[42,7]; `x6`=(no field); `x7`=null; `x8`=43
- `long`: `l1`=42; `l2`=9000000000; `l3`=-9000000000; `l4`="9007199254740993"; `l5`=[1,9000000000]; `l6`=(no field); `l7`="9223372036854775807"
- `short`: `s1`=42; `s2`=32767; `s3`=-32768; `s4`=(no field); `s5`=[1,42]
- `byte`: `b1`=42; `b2`=127; `b3`=-128; `b4`=(no field); `b5`=[1,42]
- `double`: `d1`=0.1; `d2`=3.14; `d3`=10000000000; `d4`=-0.5; `d5`=[0.1,0.2]; `d6`=0; `d7`=(no field); `d8`=0.30000000000000004; `d9`=1.5
- `float`: `fl1`=0.1; `fl2`=3.14; `fl3`=1.5; `fl4`=0.3; `fl5`=-0.5; `fl6`=[0.1,0.2]; `fl7`=(no field); `fl8`=16777217
- `half_float`: `hf1`=0.1; `hf2`=1.5; `hf3`=65504; `hf4`=(no field); `hf5`=[0.1,1.5]
- `scaled_float`: `sf1`=0.1; `sf2`=3.14; `sf3`=3.145; `sf4`=1.005; `sf5`=(no field); `sf6`=[0.1,3.14]
- `unsigned_long`: `u1`="18446744073709551615"; `u2`="0"; `u3`="5"; `u4`=["5","7"]; `u5`=(no field); `u6`="9223372036854775808"
- `boolean`: `bo1`=true; `bo2`=false; `bo3`="true"; `bo4`="false"; `bo5`=""; `bo6`=[true,false]; `bo7`=(no field)
- `ip`: `ip1`="10.0.0.5"; `ip2`="192.168.0.1"; `ip3`="::1"; `ip4`="2001:db8::1"; `ip5`="::ffff:1.2.3.4"; `ip6`=["1.1.1.1","10.0.0.7"]; `ip7`=(no field); `ip8`="10.0.1.9"; `ip9`="0.0.0.0"
- `version`: `v1`="1.2.3"; `v2`="1.2.3-beta"; `v3`="2.0.0"; `v4`="10.0.0"; `v5`="1.10.0"; `v6`=["1.2.3","2.0.0"]; `v7`=(no field); `v8`="1.2"
- `date`: `dt1`="2026-10-01T08:00:00Z"; `dt2`="2026-10-01T23:59:59.999Z"; `dt3`="2026-10-02T00:00:00Z"; `dt4`="2026-09-30T12:00:00Z"; `dt5`=1759305600000; `dt6`=["2026-10-01T08:00:00Z","2026-01-15T00:00:00Z"]; `dt7`="2026-01-01T00:00:00Z"; `dt8`=(no field); `dt9`="2026-10-01T08:00:00.123Z"
- `date_nanos`: `dn1`="2026-10-01T08:00:00.123456789Z"; `dn2`="2026-10-01T08:00:00Z"; `dn3`="2026-10-01T23:59:59.999999999Z"; `dn4`="2026-10-02T00:00:00Z"; `dn5`=(no field); `dn6`=["2026-10-01T08:00:00Z","2026-01-15T00:00:00Z"]; `dn7`="2026-10-01T08:00:00.123Z"
- `ip_range`: `ir1`={"gte":"10.0.0.0","lte":"10.0.0.255"}; `ir2`={"gte":"192.168.0.0","lte":"192.168.255.255"}; `ir3`=(no field); `ir4`="10.0.0.0/24"
- `geo_point`: `g1`="41.12,-71.34"; `g2`=(no field); `g3`=[-71.34,41.12]
- `flattened_subkey`: `fl1`={"labels":{"domain":"evil.com","owner":"a"}}; `fl2`={"labels":{"domain":"good.com"}}; `fl3`={"labels":{"domain":["evil.com","x"]}}; `fl4`={"labels":{"owner":"b"}}; `fl5`={}
- `flattened_root`: `fr1`={"labels":{"domain":"evil.com"}}; `fr2`={}
- `object_parent`: `o1`={"host":{"name":"a"}}; `o2`={"host":{}}; `o3`={}
- `alias_of_keyword`: `a1`=(no field); `a2`=(no field); `a3`=(no field); `a4`=(no field)
- `nested`: `ne1`={"nested_user":[{"name":"svc","age":3},{"name":"bob","age":40}]}; `ne2`={"nested_user":[{"name":"bob","age":3}]}; `ne3`={"nested_user":[{"name":"svc"}]}; `ne4`={}

## How to run

The harness is `esql_exceptions_inline_parity.harness.ts`. Copy it into `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/` as `zz_inline_parity.test.ts`, and run `OUT=<directory> node scripts/jest <that file>` with Elasticsearch at `http://localhost:9200` (`ES_URL`, `ES_USER` and `ES_PASS` override it). It writes `outcomes.json` and deletes its `par_*` indices. Remove the copy afterwards, because it needs a running cluster.
