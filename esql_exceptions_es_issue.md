<!--
Draft of a GitHub issue for elastic/elasticsearch.
Suggested labels: >enhancement, :Search Relevance/ES|QL, Team:Search Relevance, Team:Analytics
Related issue to link: https://github.com/elastic/elasticsearch/issues/130567
Verified on 9.6.0-SNAPSHOT.
-->

# ESQL: wildcard matching with `text` analyzer semantics after RENAME, EVAL or STATS

### Description

Kibana Security detection rules run an ES|QL query and create an alert for each row. Users can attach exceptions to a rule, and an exception can target any column of the query output, including a column that the query computes or renames. The exception operator "matches" (and its negative, "does not match") is a wildcard match: today Kibana sends it as a Query DSL `wildcard` query, which on an analyzed `text` field is evaluated against each indexed token (lowercased by the analyzer, while the pattern is not analyzed).

For a column that the query renames or aggregates, the exception has to run after the pipeline, as a `WHERE` stage at the end of the query. For a `text` column, ES|QL has no function that gives wildcard matching with the same token semantics at that point:

- `QSTR` and `KQL` support wildcards and use the analyzer, but are rejected after `RENAME`, `EVAL` and `STATS`.
- `MATCH`, `MATCH_PHRASE` and the `:` operator run after `RENAME`, `EVAL` and `STATS ... BY alias = field` and use the analyzer, but they do not support wildcards.
- `LIKE` and `MV_LIKE` support wildcards and run anywhere, but compare the whole value and are case-sensitive, so they give different results on `text`.

We therefore cannot support "matches" and "does not match" on `text` columns at the end of the query, and we report such exceptions as not applied.

### Reproduction

```
PUT zz_txt
{ "mappings": { "properties": { "message": { "type": "text" } } } }

POST zz_txt/_bulk?refresh=true
{"index":{"_id":"a"}}
{"message":"Connection to Good.com failed"}
{"index":{"_id":"b"}}
{"message":"good.com"}
{"index":{"_id":"c"}}
{"message":"other host"}
```

The Query DSL baseline (what exceptions do today on the source field). The index holds the lowercase tokens `connection`, `to`, `good.com`, `failed`:

| `wildcard` query on `message` | Matches |
|---|---|
| `*good*` | `a`, `b` |
| `good*` | `a`, `b` |
| `*Good*` | none (the pattern is not analyzed, and no token has an uppercase letter) |

ES|QL, right after `FROM`:

```
FROM zz_txt METADATA _id | WHERE QSTR("message:good*") | KEEP _id | SORT _id
```
returns `a`, `b`, same as the DSL.

ES|QL, after `RENAME`, `EVAL` or `STATS`:

```
FROM zz_txt METADATA _id | RENAME message AS msg | WHERE QSTR("msg:good*")
```
```
FROM zz_txt METADATA _id | RENAME message AS msg | WHERE QSTR("message:good*")
```
```
FROM zz_txt METADATA _id | RENAME message AS msg | WHERE KQL("msg: good*")
```
all fail with `[QSTR] function cannot be used after RENAME` (or `[KQL] ...`). The same functions fail after `EVAL msg = message` ("cannot be used after EVAL") and after `STATS` ("cannot be used after STATS").

`MATCH` and `MATCH_PHRASE` run on the alias and keep token semantics:

```
FROM zz_txt METADATA _id | RENAME message AS msg | WHERE MATCH_PHRASE(msg, "to good.com")
```
returns `a`. But there is no wildcard form:

```
FROM zz_txt METADATA _id | RENAME message AS msg | WHERE MATCH(msg, "good*")
```
returns no rows (`good*` is taken literally).

`LIKE` is not equivalent on `text`:

```
FROM zz_txt METADATA _id | WHERE message LIKE "good*"
```
returns only `b`: the pattern is compared with the whole value, so `Connection to Good.com failed` does not match, and the comparison is case-sensitive on the original value. Lowercasing the value (`TO_LOWER`) still does not reproduce the token semantics, because `good*` must match the token `good.com` inside `connection to good.com failed`.

There is also no scalar function that applies an analyzer to a column (`TOKENIZE` and `ANALYZE` are unknown functions), so `MV_LIKE(<tokens>, "good*")` cannot be built.

### What we need

Any one of the following would let us support the operator. We would like the ES|QL team to say which fits the engine best.

1. **Alias resolution for `QSTR` and `KQL`.** Allow them after `RENAME`, after an `EVAL` that only aliases a field, and after `STATS ... BY alias = field`, and resolve the field names inside the query string through those aliases (`msg:good*` is evaluated on `message`). This extends [#130567](https://github.com/elastic/elasticsearch/issues/130567), whose example keeps the source column and does not cover `RENAME` or `STATS`. A client cannot always rewrite the query string itself, because it only knows the output names of the query.
2. **A wildcard form of a column-based full-text function.** `MATCH` and `MATCH_PHRASE` already resolve an aliased `text` column. A wildcard option on `MATCH`, or a new function that takes a column and a wildcard pattern, would reuse that resolution.
3. **A scalar analyzer function.** For example a function that returns the tokens of a `text` value as a multi-valued `keyword`, with an argument to choose the analyzer. Then `MV_LIKE(tokens, "good*")` reproduces the token semantics on any column. This is the most general option but needs the analyzer of the original field, which a computed column does not carry.

### Expected semantics

For a `text` column that is an alias of an indexed `text` field, the chosen option should give the same result as the DSL `wildcard` query on the source field:

- The pattern is not analyzed and is compared with each analyzed token. The row matches when any token matches.
- A null or missing value does not match (returns false, not null), so that `WHERE NOT (...)` keeps the row. Kibana negates the condition for "does not match".
- It can be used inside `NOT`, and on a multi-valued column.
- It works after `STATS` when the column is a grouping key.

### Out of scope

- `keyword` columns: `MV_LIKE` already gives the right result.
- Phrase matching for the "is" operator on aliased `text` columns: `MATCH_PHRASE` after `RENAME` already works, so we only need the wildcard case.

### Related

- [#130567](https://github.com/elastic/elasticsearch/issues/130567): improved planning for full-text search functions.
