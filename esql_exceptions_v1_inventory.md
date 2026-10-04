# Exception behavior inventory (ES|QL rule type)

How detection exceptions behave today on an ES|QL rule (`siem.esqlRule`), for every exception operator across every field type, including multi-valued fields, `flattened`, and `nested`. This is the baseline that a native ES|QL translation has to reproduce.

Every case was run the way an ES|QL rule runs it: the exception filter is built by Kibana's exception filter builder and sent as the `filter` of a `POST _query` request, in front of the rule's ES|QL query. A document that the exception filter matches is excluded (no alert); a document it does not match still alerts. The method was cross-checked with real ES|QL rules (non-aggregating and aggregating), whose alerts matched the predictions.

## How an exception is applied

On an ES|QL rule, exceptions are not part of the ES|QL text. The executor builds one Query DSL filter from the rule's exception items and sends it as the `filter` of the `_query` request, so Elasticsearch applies it to the source documents before the rule's ES|QL pipeline runs:

```
POST _query
{
  "query": "<rule ES|QL query> | limit <size>",
  "filter": { "bool": { "filter": [ <time range>, { "bool": { "must_not": [ <exception clauses> ] } } ] } }
}
```

Two consequences follow. The exception sees only fields of the source indices, never a column that the pipeline computes with `EVAL`, `STATS`, or `RENAME`. And a document that the filter matches is removed before the pipeline runs, so it does not take part in `STATS` either.

Each exception item compiles to a Query DSL clause, and the rule excludes the documents that match it. So "excluded" below means "matches the exception clause."  The UI presents each entry type and polarity under a plain-language operator name; the `included` form of a type is its positive label, the `excluded` form is its negative label. Each maps to one clause type:

| Entry type | UI operator (`included` / `excluded`) | DSL clause | Meaning |
|---|---|---|---|
| `match` | "is" / "is not" | `match_phrase` | the field matches a single value |
| `match_any` | "is one of" / "is not one of" | `match_phrase` per value, OR-ed | the field matches any of several values |
| `wildcard` | "matches" / "does not match" | `wildcard` query | the field matches a glob (`*`, `?`) |
| `exists` | "exists" / "does not exist" | `exists` query | the field is present |
| `list` | "is in list" / "is not in list" | `terms` (or ranges for `ip_range`) | the field matches a value in a value list |
| `nested` | (container, no operator of its own) | `nested` query wrapping inner clauses | inner predicates hold within one nested object |

Two behaviors are uniform across all operators and types:

- **Multi-valued fields match element-wise (any value).** If any one value of the field matches, the document is excluded. Verified for `match`, `match_any`, `wildcard`, and `list`.
- **The negative operators ("is not", "is not one of", "does not match", "does not exist", "is not in list") are the complement, and they also exclude documents where the field is absent.** The `excluded` polarity wraps the clause in `must_not`, so it excludes every document the positive form does not, including documents that lack the field entirely.


## Which Elasticsearch field types each operator accepts

Each operator compiles to one Elasticsearch query (see the table above), and Elasticsearch decides, per field type, whether that query runs. Every operator was run against a field of each type in the [mapping reference](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/field-data-types) that could be created. A cell has one of four outcomes:

- **works**: the query runs and matches a document that holds the value.
- **every document**: the query runs and matches every document (only `constant_keyword`, whose value is the same for all documents).
- **never matches**: the query runs without error but cannot match, so the exception silently does nothing.
- **error**: Elasticsearch rejects the query for that field.

The negative operators ("is not", "is not one of", "does not match", "does not exist") wrap the same query in `must_not`, so they error exactly where the positive form errors. This held for every cell of "is", "is one of", "matches", and "exists". "is one of" gives the same outcome as "is" for every type, because it is the same query repeated per value.

An error is a failure of the whole `_query` request (HTTP 400), not a missed match, and it stops the rule: see [What the rule does when the exception query errors](#what-the-rule-does-when-the-exception-query-errors).

### Supported field types per entry type

"Supported" means the query runs and can match a document. Each list is followed by the types that are not supported (they error or never match); the detail tables below give the reasons.

**`match` ("is" / "is not") and `match_any` ("is one of" / "is not one of")** (same list for both)

- Whole string, compared exactly: `keyword`, `wildcard`, and `completion` (the whole input string; `connection` does not match `connection to good.com allowed`)
- Constant: `constant_keyword` (matches every document when the value equals the constant, none otherwise)
- Analyzed text, matching a token or phrase inside the value: `text`, `match_only_text`, `pattern_text`, `search_as_you_type`
- Version: `version` (compared as a version, so `1.2.3` does not match `1.2.30`)
- Relation name: `join` (matches the document's relation name, such as `question` or `answer`; it does not match the parent id)
- Numbers: `long`, `integer`, `short`, `byte`, `double`, `float`, `half_float`, `scaled_float`, `unsigned_long`, and `token_count` (compared with the number of tokens, not the text)
- Other scalars: `boolean`, `ip`, `date`, `date_nanos`
- Ranges: `long_range`, `integer_range`, `float_range`, `double_range`, `date_range`, `ip_range`
- `flattened`: the root and any sub-key
- `alias` to a supported type (tested with a `keyword` target)
- `index: false` fields that keep doc values (tested on `keyword` and `long`)

Not supported: `semantic_text`, `binary`, `geo_point`, `geo_shape`, `point`, `shape`, `dense_vector`, `rank_vectors`, `rank_feature`, `histogram`, `exponential_histogram`, `tdigest`, `percolator`, and fields with neither an index nor doc values (all error); `object`, `nested`, and `passthrough` parents, `sparse_vector`, `rank_features`, `aggregate_metric_double`, and unmapped fields (never match).

**`wildcard` ("matches" / "does not match")**

- Whole string: `keyword`, `wildcard`, `constant_keyword` (the glob applies to the whole value)
- `version` (the glob applies to the version string: `1.2.*` matches `1.2.3` and `1.2.30`)
- `join` (the glob applies to the relation name)
- Analyzed text: `text`, `match_only_text`, `pattern_text`, `search_as_you_type` (the glob applies to each analyzed token)
- `flattened` root (not a sub-key)
- `alias` to a string type (tested with a `keyword` target)
- `keyword` mapped with `index: false`

Not supported: every other type. All numeric types (including `token_count`), `boolean`, `ip`, `date`, `date_nanos`, the range types, `completion`, a `flattened` sub-key, and the spatial, vector, histogram, and `percolator` types error. The parents and unmapped fields never match.

**`exists` ("exists" / "does not exist")**

Supported on every type in the matrix below except:

- `rank_features` (error)
- `binary` without `doc_values`, a `nested` parent used as a plain entry, an `object` with `enabled: false`, a field with neither an index nor doc values, and an unmapped field (never match)

This includes the `object` parent (true when any sub-field has a value), the spatial types, the vector types, `sparse_vector`, `aggregate_metric_double`, the histogram family, `percolator`, and `semantic_text`.

**`list` ("is in list" / "is not in list")**

The `terms` clause the builder emits runs on the same types as `match`, with two differences: `completion` runs but never matches, and `text` matches only a value equal to an indexed token. The value lists themselves are narrower: the exception filter processes only lists of type `keyword`, `ip`, and `ip_range`, and only up to a size limit.

**`nested`**

- The path must be mapped as `nested` in every index in the rule's `FROM`. A plain `object`, a `keyword`, or an unmapped path errors.
- Inner entries are limited to `match`, `match_any`, and `exists`.
- An inner entry is supported on the child types that its entry type supports above. Tested children: `keyword`, `text`, `long`, `double`, `boolean`, `ip`, `date`, `ip_range`, and `flattened` (all supported for `match`, `match_any`, and `exists`); `geo_point` (`exists` only).

### "is" and "is one of" (`match_phrase`)

| Outcome | Field types |
|---|---|
| works | `keyword`, `wildcard`, `version`, `text`, `match_only_text`, `pattern_text`, `search_as_you_type`, `completion`, `token_count`, `long`, `integer`, `short`, `byte`, `double`, `float`, `half_float`, `scaled_float`, `unsigned_long`, `boolean`, `ip`, `date`, `date_nanos`, `long_range`, `integer_range`, `float_range`, `double_range`, `date_range`, `ip_range`, `flattened` (root and sub-key), `alias` (to a searchable field), `join`, and `keyword` / `long` with `index: false` (doc values answer the query) |
| every document | `constant_keyword` when the value equals the constant (it matches no document otherwise) |
| never matches | `object` parent, `nested` parent used as a plain entry, `passthrough` parent, `sparse_vector`, `rank_features`, `aggregate_metric_double`, an `object` with `enabled: false`, and a field that is not in the mapping |
| error | `semantic_text`, `binary`, `geo_point`, `geo_shape`, `point`, `shape`, `dense_vector`, `rank_vectors`, `rank_feature`, `histogram`, `exponential_histogram`, `tdigest`, `percolator`, and any field that is neither indexed nor has doc values |

The error text is `Field [x] of type [T] does not support match_phrase queries`, or `Cannot search on field [x] since it is not indexed nor has doc values` for an unsearchable field.

### "matches" (`wildcard`)

| Outcome | Field types |
|---|---|
| works | `keyword`, `wildcard`, `version`, `text`, `match_only_text`, `pattern_text`, `search_as_you_type`, `flattened` (root only), `alias` (to a string field), `join`, `keyword` with `index: false` |
| every document | `constant_keyword` |
| never matches | `object`, `nested`, and `passthrough` parents, an `object` with `enabled: false`, and a field that is not in the mapping |
| error | every other type: all numeric types including `token_count`, `boolean`, `ip`, `date`, `date_nanos`, all range types, `completion`, `semantic_text`, `binary`, the spatial types, `dense_vector`, `sparse_vector`, `rank_vectors`, `rank_feature`, `rank_features`, `aggregate_metric_double`, `histogram`, `exponential_histogram`, `tdigest`, `percolator`, a `flattened` sub-key, and any field that is neither indexed nor has doc values |

The error text is `Can only use wildcard queries on keyword, text and wildcard fields - not on [x] which is of type [T]`, or `[wildcard] queries are not currently supported on keyed [flattened] fields` for a `flattened` sub-key. A numeric field with `index: false` still errors, because the restriction is on the type, not on how it is indexed.

### "exists" (`exists`)

`exists` is accepted by almost every type.

| Outcome | Field types |
|---|---|
| works | every type in the matrix below except the rows listed next. This includes the `object` parent (true when any sub-field has a value), the spatial types, the vector types, `sparse_vector`, `aggregate_metric_double`, the histogram family, `percolator`, and `semantic_text` |
| every document | `constant_keyword` |
| never matches | a `nested` parent used as a plain entry (each nested object is a separate hidden document), `binary` without `doc_values`, a field that is neither indexed nor has doc values, an `object` with `enabled: false`, and a field that is not in the mapping |
| error | `rank_features` (`[rank_features] fields do not support [exists] queries`) |

### "is in list" (`terms`)

This column shows the `terms` clause the builder emits, run directly against each type. It accepts the same types as "is" with two differences: `completion` runs but never matches, and `text` matches only a value equal to an indexed token. Error text differs by type (`Binary fields do not support searching`, `Geometry fields do not support exact searching`, `[histogram] field do not support searching`, and similar).

What a user can attach is narrower than what `terms` accepts. The exception filter processes only value lists of type `keyword`, `ip`, and `ip_range`, and only up to a size limit; any other list is reported as an unprocessed exception. `ip_range` lists produce `range` clauses (plus `terms` for CIDR entries) instead of one `terms` clause.

### Full matrix

| Field type | "is" / "is one of" | "matches" | "exists" | "is in list" |
|---|---|---|---|---|
| `keyword` | works | works | works | works |
| `constant_keyword` | every document | every document | every document | every document |
| `wildcard` | works | works | works | works |
| `version` | works | works | works | works |
| `text` | works | works | works | works |
| `match_only_text` | works | works | works | works |
| `pattern_text` | works | works | works | works |
| `search_as_you_type` | works | works | works | works |
| `completion` | works | error | works | never matches |
| `semantic_text` | error | error | works | error |
| `token_count` | works | error | works | works |
| `long` | works | error | works | works |
| `integer` | works | error | works | works |
| `short` | works | error | works | works |
| `byte` | works | error | works | works |
| `double` | works | error | works | works |
| `float` | works | error | works | works |
| `half_float` | works | error | works | works |
| `scaled_float` | works | error | works | works |
| `unsigned_long` | works | error | works | works |
| `boolean` | works | error | works | works |
| `ip` | works | error | works | works |
| `date` | works | error | works | works |
| `date_nanos` | works | error | works | works |
| `binary` | error | error | never matches | error |
| `binary (doc_values)` | error | error | works | error |
| `long_range` | works | error | works | works |
| `integer_range` | works | error | works | works |
| `float_range` | works | error | works | works |
| `double_range` | works | error | works | works |
| `date_range` | works | error | works | works |
| `ip_range` | works | error | works | works |
| `object (parent)` | never matches | never matches | works | never matches |
| `nested (parent, plain entry)` | never matches | never matches | never matches | never matches |
| `flattened (root)` | works | works | works | works |
| `flattened (sub-key)` | works | error | works | works |
| `passthrough` | never matches | never matches | works | never matches |
| `alias (to keyword)` | works | works | works | works |
| `join` | works | works | works | works |
| `geo_point` | error | error | works | error |
| `geo_shape` | error | error | works | error |
| `point` | error | error | works | error |
| `shape` | error | error | works | error |
| `dense_vector (index: false)` | error | error | works | error |
| `dense_vector (indexed)` | error | error | works | error |
| `sparse_vector` | never matches | error | works | never matches |
| `rank_vectors` | error | error | works | error |
| `rank_feature` | error | error | works | error |
| `rank_features` | never matches | error | error | never matches |
| `aggregate_metric_double` | never matches | error | works | never matches |
| `histogram` | error | error | works | error |
| `exponential_histogram` | error | error | works | error |
| `tdigest` | error | error | works | error |
| `percolator` | error | error | works | error |
| `keyword (index: false)` | works | works | works | works |
| `keyword (index: false, doc_values: false)` | error | error | never matches | error |
| `long (index: false)` | works | error | works | works |
| `long (index: false, doc_values: false)` | error | error | never matches | error |
| `object (enabled: false)` | never matches | never matches | never matches | never matches |
| `unmapped field` | never matches | never matches | never matches | never matches |

`annotated_text`, `murmur3`, and `semantic` could not be created in the test environment (the first two need a plugin, `semantic` needs an inference endpoint to be mapped), so they are not in the matrix.

### Values that must parse

The filter builder does not validate the value. Elasticsearch parses it into the field type when it runs the query, and the search fails if it cannot:

| Field type | Value tried | Result |
|---|---|---|
| `ip`, `ip_range` | `not-an-ip` | error: `'not-an-ip' is not an IP string literal` |
| `long`, `double`, `long_range` | `abc` | error: `For input string: "abc"` |
| `boolean` | `maybe` | error: `Can't parse boolean value [maybe], expected [true] or [false]` |
| `date` | `not-a-date` | error: `failed to parse date field` |
| `version` | `x.y` | runs, matches nothing |
| `keyword`, `text` | any string | runs |

### Searchability and mapping variants

- A field with `index: false` but doc values still works for "is", "exists", and "is in list", and `wildcard` still works on a `keyword` with `index: false`.
- A field with neither `index` nor doc values errors for "is", "matches", and "is in list", and "exists" never matches.
- A field that is not in the mapping never errors and never matches. Because the negative operators are the complement, "is not", "is not one of", and "does not match" on such a field **exclude every document**, and so does "does not exist". The same holds for every field on which the positive operator never matches: "is not" excludes every document on an `object`, `nested`, or `passthrough` parent, on `sparse_vector`, on `aggregate_metric_double`, and on an `object` with `enabled: false`; "does not exist" excludes every document wherever "exists" never matches (an unmapped field, a `nested` parent, an `object` with `enabled: false`).

### `nested` entries

A nested entry builds a `nested` query, then applies the inner entry to a child of that path.

- The path must be mapped as `nested` in every index in the rule's `FROM`. A plain `object`, a `keyword`, and an unmapped path all error with `[nested] failed to find nested object under path [x]`. When only some of the indices map the path as `nested`, the whole request fails, the same as any other error.
- The inner entry follows the rules above for the child's type. Inner "is" and "is one of" worked on `keyword`, `text`, `long`, `double`, `boolean`, `ip`, `date`, `ip_range`, and `flattened` children and errored on a `geo_point` child; inner "exists" worked on all of them.
- The schema allows only "is", "is one of", and "exists" (and their negatives) inside a nested entry. "matches", value lists, and a nested entry inside a nested entry are rejected.

### What the rule does when the exception query errors

When Elasticsearch rejects the exception filter for any field in the `FROM` indices (for example "is" on a `geo_point` field), the rule fails and creates no alerts. Observed on real ES|QL rules with the exception `loc` is `41.12,-71.34`, where the rule reads either one index with `loc` mapped as `geo_point`, or several indices where `loc` is a `geo_point` in one and a `keyword` in another:

| ES\|QL query | Indices in `FROM` | Rule status | Alerts |
|---|---|---|---|
| non-aggregating (`... \| KEEP id, _id`) | one, `loc` is `geo_point` | failed | none |
| aggregating (`... \| STATS c = COUNT(*) BY id`) | one, `loc` is `geo_point` | failed | none |
| non-aggregating | several, `loc` is `geo_point` in one and `keyword` in another | failed | none |
| aggregating | several, `loc` is `geo_point` in one and `keyword` in another | failed | none |
| non-aggregating, control (`loc` is `keyword`) | one | succeeded | one (the document the exception does not match) |
| aggregating, control (`loc` is `keyword`) | one | succeeded | one |

- The rule status message is Elasticsearch's error, for example `Error while performing ES|QL search: query_shard_exception ... Field [loc] of type [geo_point] does not support match_phrase queries`.
- One incompatible index fails the request for every index in the `FROM`. The index where the field is a `keyword` produces no alerts either, although the same `FROM` without the exception filter returns all of its documents.
- Partial results do not help. The rule asks for partial results on a non-aggregating query and not on an aggregating one, and the request fails with HTTP 400 in both modes, so the outcome is the same for both query shapes.
- While the rule fails, documents that the exception never targeted stop alerting too. The only signal is the failed rule status.

### What the UI offers per field type

For an ES|QL rule, the builder takes its field list from the index patterns named in the query's `FROM` (source fields only), so a column that the query computes is not offered. From the builder code, the operators offered depend on the field type:

| Field | Operators offered |
|---|---|
| a field whose type is `boolean` | is, is not, exists, does not exist |
| a string-kind field (`string`, `text`, `match_only_text`, `keyword`, `version`, `_id`, `_type`) | all ten: is, is not, is one of, is not one of, exists, does not exist, is in list, is not in list, matches, does not match |
| any other field type | the eight operators without "matches" and "does not match" |
| the nested parent (field picker of a nested entry) | is |
| a child inside a nested entry | is, is one of, exists (boolean: is, exists) |

So the UI never offers "matches" for numeric, `ip`, `date`, or `boolean` fields, which avoids the `wildcard` errors above. It does not restrict "is" or "is one of" by type, so a `geo_point`, `binary`, or vector field can be selected and fails at search time. Types that Elasticsearch accepts for `wildcard` but that are not in the string-kind list (for example the `wildcard` type itself and `constant_keyword`) are not offered "matches" by this rule, though the API accepts it.

## Matching semantics by field type

Where the previous section says which types run, this one says what a run means.

| Class | Field types | "is" / "is one of" matches | "matches" (wildcard) |
|---|---|---|---|
| Exact string | `keyword`, `wildcard` | the exact whole value | glob over the whole value |
| Version | `version` | the exact version (`1.2.3` does not match `1.2.30`) | glob over the version string (`1.2.*` matches both) |
| Relation name | `join` | the document's relation name (`question`, `answer`), not the parent id | glob over the relation name |
| Constant | `constant_keyword` | every document when the value equals the constant, none otherwise | every document when the glob matches the constant, none otherwise |
| Exact non-string | `ip`, numeric types, `boolean` | the exact value (parsed into the field type) | error |
| Token count | `token_count` | the number of tokens, not the text | error |
| Date | `date`, `date_nanos` | a term **rounded to the value's unit** for a day, hour, minute, or second value (`2026-09-30` matches the whole day), to the **first day** for a month or year value (`2026-09` matches 2026-09-01 only), and to that instant for a full-precision value | error |
| Analyzed text | `text`, `match_only_text`, `pattern_text`, `search_as_you_type` | an analyzed token or phrase **inside** the value | glob over analyzed tokens |
| Completion | `completion` | the exact whole input string, not tokenized (`good.com` does not match `connection to good.com allowed`) | error |
| Range | `long_range`, `integer_range`, `float_range`, `double_range`, `date_range`, `ip_range` | whether the value is **contained in** the range | error |
| Flattened sub-key | `labels.domain` | the exact value of that sub-key | error |
| Flattened root | `labels` | **any** leaf of the object equals the value | glob over any leaf |
| Alias | `alias` | behaves as the target field | as the target |
| Never matches | `object`, `nested`, `passthrough` parents, `sparse_vector`, `rank_features`, `aggregate_metric_double` | nothing | nothing or error (see above) |
| Error | `semantic_text`, `binary`, the spatial types, `dense_vector`, `rank_vectors`, `rank_feature`, `histogram`, `exponential_histogram`, `tdigest`, `percolator` | error | error |

Notes:

- **Analyzed text** (`text`, `match_only_text`, `pattern_text`, `search_as_you_type`) is the only class where matching is tokenized. "is" `good.com` on `text` excludes `"connection to good.com allowed"` (a token inside the value), and "matches" `good*` does too because it globs the analyzed token; on `keyword` neither matches that document.
- **Range** matching is containment, not equality: "is" `15` on a `long_range` of `[10, 20]` excludes the document. `2026-09-15` on a `date_range` and `10.0.0.5` on an `ip_range` behave the same.
- **Date rounding** is a property of the date term query, not of the exception. A day value covers the half-open day `[00:00:00, next 00:00:00)`, and hour, minute, and second values cover that whole unit. A month or year value does not cover the month or year: `2026-09` covers only 2026-09-01, and `2026` covers only 2026-01-01. The same holds for `date_nanos`.
- **Flattened** differs at root and sub-key: the root matches when **any** leaf equals the value and allows "matches"; a sub-key matches only that key and errors on "matches".
- **Alias** carries no behavior of its own (verified: "is" and "matches" both behaved as the target `keyword`).

## `nested` semantics

A `nested` exception entry applies all of its inner predicates **within a single nested object**. With inner predicates `user.name` is `svc` and `user.role` is `admin`:

- a document with one object `{name: svc, role: admin}` is excluded,
- a document where `svc` and `admin` appear in **different** objects of the `user` array is **not** excluded,
- a document matching only one inner predicate is not excluded.

An inner negative operator is also evaluated per object. With `name` is `svc` and `role` is not `admin`, a document is excluded when **some** object is `svc` and not `admin`; it does not mean that no object is `admin`. A document with `[{svc, user}, {bob, admin}]` is excluded, because its first object alone satisfies both predicates.

## `list` (value list)

A `list` entry compiles to a `terms` query over the list's values (for `ip_range` lists, to range clauses). It is exact set membership, element-wise on multi-valued fields, and its negative form ("is not in list") is the complement including absent-field documents, the same as "is one of" with the list's values. On an ES|QL rule it runs through the same DSL filter as the other entries; a list that cannot be processed (a type other than `keyword`, `ip`, or `ip_range`, or one over the size limit) is skipped and reported as a warning on the rule. Value lists are out of scope for the native ES|QL translation and continue to run through the DSL path.

## Implications for the ES|QL translation

- Exact-value types (`keyword`, `ip`, numeric, `boolean`, `version`, `flattened` sub-key) reduce to exact equality, which `MV_CONTAINS` reproduces with element-wise parity.
- `text` / `match_only_text` need analyzed matching, which only full-text (`MATCH_PHRASE`) provides, and full-text is position-restricted after `STATS` / `EVAL`.
- `date` needs precision rounding, which a cast does not provide.
- `flattened` sub-keys and cross-index type conflicts are not addressable or resolvable in ES|QL.
- "matches" maps to `QSTR` early and `MV_LIKE` late. Elasticsearch itself rejects `wildcard` on every non-string type, so there is nothing to reproduce there.
- Types where the current query errors (`semantic_text`, `binary`, the spatial types, the vector types, the histogram family, `percolator`) have no working behavior to reproduce. Types where it never matches (the parents, `sparse_vector`, `rank_features`, `aggregate_metric_double`) have none either, but note that their negative operators exclude every document today.

These are detailed, with runnable examples, in `esql_exceptions_language_gaps.md`.

## Coverage against the Elasticsearch field type reference

Every type named in the [mapping reference](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/field-data-types), and how it is accounted for. "Tested" means the operators were run against a field of that type.

| Type(s) | Status |
|---|---|
| `keyword`, `constant_keyword`, `wildcard`, `version`, `join` | tested |
| `text`, `match_only_text`, `pattern_text`, `search_as_you_type`, `completion`, `token_count` | tested |
| `semantic_text` | tested: "is", "matches", and "is in list" error; "exists" works |
| `long`, `integer`, `short`, `byte`, `double`, `float`, `half_float`, `scaled_float`, `unsigned_long` | tested |
| `boolean`, `ip`, `date`, `date_nanos` | tested |
| `long_range`, `integer_range`, `float_range`, `double_range`, `date_range`, `ip_range` | tested |
| `flattened` (root and sub-key) | tested |
| `nested` (as a plain entry and as a nested entry) | tested |
| `object`, `passthrough` | tested (parents never match; leaf sub-fields behave as their own type) |
| `alias` | tested (behaves as the target) |
| `geo_point`, `geo_shape`, `point`, `shape` | tested ("is" and "is in list" error; "exists" works) |
| `binary` | tested (errors; "exists" works only with `doc_values`) |
| `dense_vector`, `rank_vectors`, `rank_feature` | tested (error; "exists" works) |
| `sparse_vector`, `rank_features` | tested (never match; "exists" works on `sparse_vector`, errors on `rank_features`) |
| `aggregate_metric_double` | tested (never matches; "exists" works) |
| `histogram`, `exponential_histogram`, `tdigest`, `percolator` | tested (error; "exists" works) |
| `annotated_text`, `murmur3`, `semantic` | not tested: the first two need an Elasticsearch plugin and `semantic` needs an inference endpoint to be mapped |
