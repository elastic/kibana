# Feature parity: DSL exception filters vs ES|QL `WHERE` after `FROM` (ES|QL rule type)

This compares, for each Elasticsearch operator that exceptions use (`match_phrase`, `wildcard`, `exists`), what the current implementation does with what the equivalent ES|QL predicate does when it is inlined as `WHERE NOT (...)` immediately after `FROM`. The current implementation sends a DSL filter as the `filter` of the `_query` request; the alternative is a `WHERE` stage in the query text. Both exclude documents before the rule's own pipeline runs, so parity here means "the same documents are excluded".

Every case below was run on the same documents through both paths, for the positive operator ("is", "matches", "exists") and for the negative operator ("is not", "does not match", "does not exist"), and the excluded documents were compared. The evidence is listed in the appendix.

Types that ES|QL cannot expose as a usable column (`flattened`, range types, `nested`, a field mapped with different types across indices, and similar) are covered in `esql_exceptions_language_gaps.md` and are not repeated here.

## Summary

| Exception operator | Elasticsearch operator | ES\|QL equivalent | Scenarios | Same | Differ |
|---|---|---|---|---|---|
| is | `match_phrase` | `MV_CONTAINS` (exact types), `MATCH_PHRASE` (text), a range (dates) | 68 | 55 | 13 |
| is one of | `match_phrase` per value | the same, joined with `OR` | 4 | 4 | 0 |
| matches | `wildcard` | `QSTR` (also compared: `MV_LIKE`, `LIKE`) | 32 | 26 | 6 |
| exists | `exists` | `IS NOT NULL` | 17 | 14 | 3 |

Most scenarios are at parity, including the ones that look risky: multi-valued fields, case sensitivity, analyzers, normalizers, `ignore_above`, `null_value`, values above 2^53, `float` and `scaled_float` rounding, IPv6 forms, and field names that need quoting. The differences fall into four groups.

| Group | What it means | Items |
|---|---|---|
| A. The emitted ES\|QL is wrong | The ES\|QL language can express the exception, but the form the POC emits does not match the DSL. These can be fixed in the compiler. | M1, M2, M5, W1, W3 |
| B. A better ES\|QL function exists | The POC form works for single values but misses multi-valued fields. A different function gives parity. | M3, M4 |
| C. Scale | A long list works in the DSL and fails in ES\|QL. | S1 |
| D. Not expressible, or a deliberate difference | No ES\|QL form reproduces the behavior, or ES\|QL is stricter or more lenient than the DSL. | M6, W2, X1 |

## Differences

| ID | Operator | Condition | Current implementation (DSL) | ES\|QL `WHERE` | Effect |
|---|---|---|---|---|---|
| M1 | is | A value that does not cast to the column type: an IP written as CIDR (`10.0.0.0/24`), a date as epoch milliseconds (`1759240800000`), a date in the field's own `format` (`2026/09/30`) | CIDR matches every IP in the range; the epoch and custom-format values match that date | The cast returns `null`, `MV_CONTAINS(field, null)` is true, so the exception excludes **every** document, including documents without the field | Over-exclusion, with no error |
| M2 | is | `date` or `date_nanos` value with only a year (`2026`) or a month (`2026-09`) | Matches the first day only (`2026` is 2026-01-01, `2026-09` is 2026-09-01) | The POC range covers the whole year or month | Over-exclusion |
| M3 | is | `date` with a day value (checked) on a **multi-valued** field; the same mechanism applies to hour, minute, and second values | Excluded when any element is in the rounded range | `field >= lower AND field < upper` is `null` on a multi-valued field, so the document is not excluded | Under-exclusion |
| M4 | is | `ip` value in CIDR notation, on a multi-valued field | Excluded when any element is in the range | `CIDR_MATCH` returns `null` on a multi-valued field, so the document is not excluded | Under-exclusion |
| M5 | is, matches | A carriage return or line feed in the value | Works | The POC writes the raw character inside the ES\|QL string literal, which is a parse error, so the rule fails | Rule failure |
| M6 | is | A value that the DSL rejects but ES\|QL accepts: boolean `TRUE`, an ISO date on a field with a custom `format` | The search fails and the rule fails | Runs and matches | ES\|QL is more lenient; not a regression |
| S1 | is one of, many items | More than 293 values in one "is one of", or hundreds of exception items in one `WHERE` (100 worked, 1000 failed) | Works up to the Lucene clause limit (4468 here) | A flat `OR` chain deeper than 293 fails: `exceeded the maximum expression depth allowed (300)` | Rule failure |
| W1 | matches | A backslash in the pattern: `a\*b` (literal star), `a\?b`, `a\\`, `a\b*` | The backslash escapes the next character | `QSTR` as emitted doubles the backslash, so `a\*b` matches nothing and `a\b*` matches the wrong documents | Under-exclusion and wrong-document exclusion |
| W2 | matches | `text` field and a pattern with uppercase letters | Compares the pattern with the lowercase tokens, case-sensitively, so `GOOD*` matches nothing | `QSTR` lowercases the pattern and matches | Over-exclusion |
| W3 | matches | A carriage return or line feed in the pattern | Works | Parse error, as in M5 | Rule failure |
| X1 | exists | The `object` parent, the `nested` parent, or a `flattened` sub-key | An `object` parent exists when any sub-field has a value, a `nested` parent never matches (each nested object is a separate document), and a sub-key exists when that key is present | `Unknown column`: ES\|QL has no column for these | Not expressible |

## Fixes verified

These were tested on the live stack, with the same documents and both polarities.

- **M1.** Validate the literal before emitting it, and skip the item (so it stays on the DSL pre-filter) when it does not parse. For CIDR values use the range form in M4. Epoch milliseconds and values in the field's `format` need conversion to an ISO instant first.
- **M2.** For a year or month value, use the first day only: `[Y-01-01, Y-01-02)` and `[Y-MM-01, Y-MM-02)`. Day, hour, minute, and second values round to that whole unit, which the POC already does (verified for `date` and `date_nanos`).
- **M3.** `MV_IN_RANGE(field, lower, upper)` has any-element semantics. Its bounds are **inclusive on both ends**, so the half-open day `[2026-09-30, 2026-10-01)` becomes `MV_IN_RANGE(field, "2026-09-30T00:00:00.000Z"::date, "2026-09-30T23:59:59.999Z"::date)`, and `date_nanos` uses the last nanosecond. This reproduced the DSL for the first and last instants, an element outside, a multi-valued document, and a document without the field.
- **M4.** `MV_IN_RANGE(field, "10.0.0.0"::ip, "10.0.0.255"::ip)` (the first and last address of the CIDR) matches on any element and excluded the right documents, including a multi-valued one.
- **M5, W3.** ES|QL accepts `\n` and `\r` inside a string literal, so escaping the two characters fixes both. A tab and a backtick already work.
- **W1.** Passing the pattern's backslashes to `QSTR` unchanged (doubling them only for the ES|QL string literal) reproduced the DSL for `a\*b`, `a\?b`, `a\b*`, and `a\\`.
- **S1.** Two forms avoid the depth limit. `MV_INTERSECTS(field, ["a", "b", ...])` matches on any element, handled 5000 values in about 13 ms, and gave the right result on a multi-valued field and a missing field (verified for `keyword`). Splitting the list across several `WHERE NOT (...)` stages is equivalent (`NOT A AND NOT B` is `NOT (A OR B)`) and handled 1000 values with stages of 250, but it is limited by the number of stages (500) and by the same Lucene clause limit as the DSL. Beyond about 4468 values both paths fail.

Not fixable inside ES|QL: W2 (a product decision, since the DSL result looks unintended) and X1 (no column exists).

## `match_phrase` ("is" and "is one of")

ES|QL equivalent by field type:

| Field type | ES\|QL `WHERE` predicate |
|---|---|
| `keyword`, `wildcard` type, `constant_keyword` | `MV_CONTAINS(field, "value")` |
| `text`, `match_only_text`, `pattern_text` | `MATCH_PHRASE(field, "value")`, which ES\|QL allows only before `STATS` or `EVAL` |
| `long`, `integer`, `short`, `byte`, `unsigned_long` | `MV_CONTAINS(field, 42::long)`, with the literal cast to the column type |
| `double`, `float`, `half_float`, `scaled_float` | `MV_CONTAINS(field, 3.14::double)` (ES\|QL exposes all four as `double`) |
| `boolean` | `MV_CONTAINS(field, true)` |
| `ip`, `version` | `MV_CONTAINS(field, "value"::ip)` |
| `date`, `date_nanos` | a half-open range for a rounded value (see M2 and M3), `MV_CONTAINS` for a full-precision value |

Verified at parity, for both polarities:

- **`keyword`**: exact value, case sensitivity, a longer value that contains it, empty string, leading and trailing whitespace, multi-valued, double quotes, a backslash, non-ASCII text, a tab, a backtick, a lowercase normalizer (with a lowercase and an uppercase value), `ignore_above` (a value within and over the limit), `null_value`, and a field name with a hyphen, a leading digit, or a hyphenated path segment.
- **`text`**: a token inside the value, case-insensitive matching, a partial token (no match), phrase order and adjacency, the `english` analyzer (stemming and stopwords), multi-valued fields (any element, and no phrase across two elements), and quotes in the value.
- **Numbers**: `long` (including a string source `"42"`, the values `42.0` and `+42`, and values above 2^53), `integer`, `double`, `float` (3.14 and 0.1), `half_float`, `scaled_float` (including the value 3.141, which rounds to 3.14), and `unsigned_long` (the maximum and a small value).
- **Other types**: `boolean`, `ip` (IPv4, multi-valued, IPv6 in expanded form, an IPv4-mapped address), `version` (release and pre-release), and `constant_keyword` (value equal and not equal to the constant).
- **Dates**: day, hour, minute, and second values (each rounds to that whole unit), a full-precision value, a value with a UTC offset, and `date_nanos` for a day and a nanosecond value.
- **"is one of"**: two values on `keyword`, `text`, `long`, and `date`.

Differences: M1, M2, M3, M4, M5, M6, and S1 above.

## `wildcard` ("matches")

The ES|QL equivalent is `QSTR("field:pattern")`, which is full-text and allowed only before `STATS` or `EVAL`. `MV_LIKE` and `LIKE` were compared as well, because they work in any position:

| Candidate | Result |
|---|---|
| `QSTR` | At parity except W1, W2, and W3. Works on `keyword`, `wildcard` type, `constant_keyword`, `version`, and `text` (the glob applies to each token). |
| `MV_LIKE` | Any-element matching, but it compares the whole stored string. Wrong for `text` (the DSL globs tokens), wrong for a `keyword` with a normalizer when the pattern has uppercase letters, rejects `version`, and rejects a backslash that is not followed by `*`, `?`, or `\`. |
| `LIKE` | Everything `MV_LIKE` does wrong, and also `null` on a multi-valued field (the document is not excluded). |

So `QSTR` is the equivalent for the early position, and `MV_LIKE` is the best available form after `STATS` or `EVAL`.

Verified at parity for `QSTR`, for both polarities: a prefix, a leading, and an infix pattern; `*` alone (it matches the empty string, and a document without the field is excluded only by "does not match"); `?`; a space; the characters `- / :`; the characters `( ) ^ ~ !`; a double quote; non-ASCII text; a lowercase normalizer with a lowercase and an uppercase pattern; `ignore_above` (a pattern for a value within and over the limit); multi-valued `keyword`; `text` with a lowercase pattern, a leading wildcard, a pattern spanning two tokens (matches nothing in both), and multi-valued values; the `wildcard` type; `constant_keyword`; `version`; and field names with a hyphen, a leading digit, or a hyphenated path segment.

Differences: W1, W2, W3.

## `exists`

The ES|QL equivalent is `field IS NOT NULL`. Verified at parity, for both polarities: a normal value, an empty string, a whitespace-only string, `null`, an empty array, `[null]`, `[null, "x"]`, a text value made only of punctuation, a text value made only of stopwords, the number `0`, `false`, `null_value` (a `null` is indexed as the configured value, so the field exists), a keyword value over `ignore_above`, a number or date with `ignore_malformed` and an unparseable value (the document does not exist for the field), an `alias`, `geo_point`, a `flattened` root, and an `object` sub-field.

Difference: X1.

## Scale

The DSL joins "is one of" values and exception items in a `bool` query and is limited by the Lucene clause count (4468 in the tested cluster). A flat `OR` chain in an ES|QL `WHERE` fails at 294 terms, and a pipeline is limited to 500 stages (200 stages worked; at 1000 the error names a maximum query depth of 500).

| Case | DSL | Flat `OR` in one `WHERE` | `MV_INTERSECTS` | Stages of 250 |
|---|---|---|---|---|
| 50 values | works | works | not tested | not tested |
| 500 values | works | fails (depth 300) | not tested | not tested |
| 1000 values | works | fails | works | works |
| 5000 values | fails (clause limit) | fails | works | fails (clause limit) |
| 1000 items, one value each | works | fails | not applicable | not tested |

The 293 limit was found by bisection (293 works, 294 fails).

## Appendix: scenario results

Each row compares the ES|QL form with the DSL for the positive and the negative operator together: "same" means both excluded exactly the same documents. "ES|QL error" means the ES|QL form failed where the DSL ran. "differs" means the sets are not equal.

### "is" (`match_phrase`)

| Scenario | ES\|QL form: result |
|---|---|
| keyword: exact, case, substring, empty, whitespace | compiler: same |
| keyword: multi-valued | compiler: same |
| keyword: value with double quotes | compiler: same |
| keyword: value with a backslash | compiler: same |
| keyword: non-ASCII value | compiler: same |
| keyword: value with a newline | compiler: ES\|QL error |
| keyword with lowercase normalizer: value is lowercase | compiler: same |
| keyword with lowercase normalizer: value is uppercase | compiler: same |
| keyword ignore_above 10: value within the limit | compiler: same |
| keyword ignore_above 10: value over the limit | compiler: same |
| keyword null_value "NA" | compiler: same |
| wildcard type: exact | compiler: same |
| text: token inside, case, partial token | compiler: same |
| text: phrase order and adjacency | compiler: same |
| text with english analyzer: stemming | compiler: same |
| text with english analyzer: stopwords in the value | compiler: same |
| text multi-valued: phrase across two values | compiler: same |
| text multi-valued: token in one value | compiler: same |
| long: exact, multi-valued, string source | compiler: same |
| long: value "42.0" | compiler: same |
| long: value "+42" | compiler: same |
| long: value above 2^53 | compiler: same |
| integer: exact | compiler: same |
| double: exact | compiler: same |
| float: value 3.14 | compiler: same |
| float: value 0.1 | compiler: same |
| half_float: value 3.14 | compiler: same |
| scaled_float (scale 100): value 3.14 | compiler: same |
| scaled_float (scale 100): value 3.141 (rounds to 3.14) | compiler: same |
| unsigned_long: maximum value | compiler: same |
| unsigned_long: small value | compiler: same |
| boolean: value "true" | compiler: same |
| boolean: value "TRUE" | compiler: differs |
| ip: IPv4 exact, multi-valued | compiler: same |
| ip: IPv6 value written in expanded form | compiler: same |
| ip: IPv4 and its IPv4-mapped IPv6 form | compiler: same |
| ip: value in CIDR notation | compiler: differs; CIDR_MATCH: same |
| date: day value | compiler: differs |
| date: month value | compiler: differs |
| date: year value | compiler: differs |
| date: hour value | compiler: same |
| date: minute value | compiler: same |
| date: full-precision value | compiler: same |
| date: value with a UTC offset | compiler: same |
| date: value as epoch milliseconds | compiler: differs |
| date with format yyyy/MM/dd: value in that format | compiler: differs |
| date with format yyyy/MM/dd: value in ISO form | compiler: differs |
| date_nanos: day value | compiler: same |
| date_nanos: nanosecond value | compiler: same |
| version: release value | compiler: same |
| version: pre-release value | compiler: same |
| constant_keyword: value equals the constant | compiler: same |
| constant_keyword: value differs from the constant | compiler: same |
| date rounding: year value "2026" | compiler: differs |
| date rounding: month value "2026-09" | compiler: differs |
| date rounding: day value "2026-09-30" | compiler: same |
| date rounding: hour value "2026-09-30T14" | compiler: same |
| date rounding: minute value "2026-09-30T14:00" | compiler: same |
| date rounding: second value "2026-09-30T14:00:00" | compiler: same |
| date_nanos rounding: day value | compiler: same |
| date_nanos rounding: month value | compiler: differs |
| keyword: value with a tab | compiler: same |
| keyword: value with a carriage return | compiler: ES\|QL error |
| keyword: value with a backtick | compiler: same |
| text: value with double quotes | compiler: same |
| field name with a hyphen: match | compiler: same |
| field name starting with a digit: match | compiler: same |
| dotted path with a hyphenated segment: match | compiler: same |

### "is one of" (`match_phrase per value`)

| Scenario | ES\|QL form: result |
|---|---|
| keyword: two values | compiler: same |
| text: two values | compiler: same |
| long: two values | compiler: same |
| date: two day values | compiler: same |

### "matches" (`wildcard`)

| Scenario | ES\|QL form: result |
|---|---|
| keyword: prefix pattern | QSTR: same; MV_LIKE: same; LIKE: differs |
| keyword: uppercase pattern | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword: pattern "*" | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword: "?" pattern | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword: leading wildcard | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword: infix pattern | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword: escaped literal "*" in the pattern | QSTR: differs; MV_LIKE: same; LIKE: same |
| keyword: escaped literal "?" in the pattern | QSTR: differs; MV_LIKE: same; LIKE: same |
| keyword: pattern containing a space | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword: pattern with - / : characters | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword: pattern with ( ) ^ ~ ! characters | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword: pattern with a double quote | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword: non-ASCII pattern | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword with lowercase normalizer: lowercase pattern | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword with lowercase normalizer: uppercase pattern | QSTR: same; MV_LIKE: differs; LIKE: differs |
| keyword ignore_above 10: pattern matching a value over the limit | QSTR: same; MV_LIKE: same; LIKE: same |
| keyword ignore_above 10: pattern matching a value within the limit | QSTR: same; MV_LIKE: same; LIKE: same |
| text: lowercase pattern against a token | QSTR: same; MV_LIKE: differs; LIKE: differs |
| text: uppercase pattern against a token | QSTR: differs; MV_LIKE: same; LIKE: same |
| text: pattern spanning two tokens | QSTR: same; MV_LIKE: same; LIKE: same |
| text: leading wildcard | QSTR: same; MV_LIKE: differs; LIKE: differs |
| text multi-valued | QSTR: same; MV_LIKE: differs; LIKE: differs |
| wildcard type | QSTR: same; MV_LIKE: same; LIKE: differs |
| constant_keyword: pattern matches the constant | QSTR: same; MV_LIKE: same; LIKE: same |
| constant_keyword: pattern does not match the constant | QSTR: same; MV_LIKE: same; LIKE: same |
| version: pattern | QSTR: same; MV_LIKE: ES\|QL error; LIKE: ES\|QL error |
| keyword: wildcard value with a newline | QSTR: ES\|QL error; MV_LIKE: ES\|QL error |
| keyword: pattern with a backslash before a letter | QSTR: differs; MV_LIKE: ES\|QL error |
| keyword: pattern ending with an escaped backslash | QSTR: differs; MV_LIKE: same |
| field name with a hyphen: wildcard | QSTR: same; MV_LIKE: same |
| field name starting with a digit: wildcard | QSTR: same; MV_LIKE: same |
| dotted path with a hyphenated segment: wildcard | QSTR: same; MV_LIKE: same |

### "exists" (`exists`)

| Scenario | ES\|QL form: result |
|---|---|
| keyword: values, empty string, null, empty array | IS NOT NULL: same |
| text: values, empty string, punctuation only | IS NOT NULL: same |
| text with stop analyzer: value made only of stopwords | IS NOT NULL: same |
| long: zero, null, empty array | IS NOT NULL: same |
| boolean: false, true, null | IS NOT NULL: same |
| keyword null_value "NA": null value | IS NOT NULL: same |
| keyword ignore_above 5: value over the limit | IS NOT NULL: same |
| long with ignore_malformed: unparseable value | IS NOT NULL: same |
| date with ignore_malformed: unparseable value | IS NOT NULL: same |
| object: the parent field | IS NOT NULL: ES\|QL error |
| object: a sub-field | IS NOT NULL: same |
| nested: the parent field | IS NOT NULL: ES\|QL error |
| flattened: the root field | IS NOT NULL: same |
| flattened: a sub-key | IS NOT NULL: ES\|QL error |
| alias to keyword | IS NOT NULL: same |
| geo_point | IS NOT NULL: same |
| field name with a hyphen: exists | IS NOT NULL: same |
