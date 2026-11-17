# Exceptions as data in ES|QL rules

Status: exploration. Nothing here is implemented. Nothing in this file changes the proposal in `esql_exceptions_proposal.md`.

The Elasticsearch team suggested storing exceptions as documents in an index. The rule query would then apply them with ES|QL itself, for example with `WHERE ... IN (subquery)`. Today the compiler turns each exception item into text and appends it to the rule query. In the data model the query text would hold only a few fixed lines, and the exception values would live in an index that Elasticsearch reads while it runs the query.

Everything below was measured on the local stack (Elasticsearch `9.7.0-SNAPSHOT`, build `1381b62`, trial license), with test indices that are not related to the demo data. The queries are in the sections that use them.

## What ES|QL offers

Three mechanisms apply an index to the rows of a query.

| Mechanism | What it does | Where an exception fits |
|---|---|---|
| `WHERE col IN (FROM idx \| KEEP f)` and `NOT IN` | Keeps the rows whose `col` is in the values of one column of the subquery | One column, equality. Works in `WHERE` and in `EVAL`, so it combines with `AND`, `OR`, `NOT` and with literal conditions |
| `LOOKUP JOIN idx ON a == x AND b == y` | Adds the fields of the matching documents to each row, or nulls when nothing matches | Several columns at once (the entries of one exception item), and comparisons other than equality |
| `ENRICH` | Same idea with a policy that must be executed again after each change | Not explored. A policy is a snapshot, so the exceptions would not apply as soon as they are saved |

The lookup index of a join needs `index.mode: lookup` (one shard). `IN (subquery)` also reads regular indices.

## What each entry type becomes

| Entry in the UI | As data | Verified |
|---|---|---|
| `is` on `keyword`, `ip`, `long` | One document with the value. `IN (subquery)` for an item of one entry, a join key for several entries | Yes |
| `is one of` | One document per value | Yes |
| `is` with a CIDR range (`ip`) | A document with `low` and `high`, and the join `ON col >= low AND col <= high` | Yes |
| `is not`, `is not one of` | `col != x` in a join, or `NOT IN (subquery)` as the condition that the item matches | Yes, see the notes on null |
| Several entries in one item (AND) | One document with one field per entry, joined on all the fields | Yes |
| `list` (value list) | `col IN (FROM <value list index>)`. The value list already is one document per value | Same mechanism as `is one of`. I did not try a real value list index |
| Expiry of an item | A filter inside the subquery: `WHERE expire IS NULL OR expire > NOW()`. It is evaluated at each run | Yes |
| Exceptions of one list or of one rule | A filter inside the subquery: `WHERE list_id == "L1"`, or a join key on a constant column | Yes |
| `matches` (wildcard) | Not possible as data. `LIKE` needs a constant pattern (`[LIKE] pattern must be a constant`) | Yes, it fails |
| `exists`, `does not exist` | No condition of a join or of `IN` tests that a column is null. The few items of this kind stay as text | Not possible |
| `nested` | Outside the scope, as in the text design | Not tested |

A wildcard can be approximated with `STARTS_WITH` and `ENDS_WITH`, which accept a column as second argument. The condition needs every row paired with every document (a join on a constant key), so the cost is rows times documents. I measured that it returns the right rows on 4 documents and I did not measure it at size. It is not a candidate for large lists.

## How a whole rule would look

Items that are one column and equality go to `IN (subquery)`. Items with several entries or with a comparison go to a join, one join for each shape (the set of columns that the item tests), with a flag column in each lookup index. Whatever is left (wildcards, `exists`) stays as text, as today. One `WHERE` stage combines them.

```
FROM demo-network
| STATS b = SUM(network.bytes) BY host = host.name, domain = destination.domain
| LOOKUP JOIN exc-shape-c ON host == c_host
| EVAL m1 = host IN (FROM exc-shape-a | WHERE a_host IS NOT NULL | KEEP a_host),
       m2 = c_hit IS NOT NULL,
       m3 = domain LIKE "*.corp.example.com"
| WHERE NOT COALESCE(m1 OR m2 OR m3, false)
| DROP c_*, m1, m2, m3
```

This returned the expected two rows. Three shapes joined one after the other (`host AND domain`, `domain`, `host`) removed the right four rows. Separately, 40 joins in one query ran without error. I did not look for the maximum.

The values of an exception never appear in the query text. No value can be a piece of syntax, so the escaping and the injection review of the compiler have nothing to protect in this part.

## Which limits go away

| Limit of the text design | With data |
|---|---|
| 200 comparisons in total | Gone. Measured with 100,000 documents in the subquery |
| 500 left parentheses in one stage | Almost gone. Each `IN (FROM ...)` adds one parenthesis for each subquery, and the values add none |
| 1,000,000 characters in the query | Gone for the values. The query holds one clause for each subquery or join |
| Lucene clauses that the filter needs | Not hit at 100,000 values, because the values are not clauses of the query |
| Splitting into several `WHERE` stages | Not needed |

## Scale

100,000 source rows, exceptions on an `ip` column, one run each, on a laptop node.

| Exceptions | `IN (subquery)` | `LOOKUP JOIN` |
|---|---|---|
| 20,000 | 0.2 to 0.3 s | 2.8 s |
| 100,000 | 0.1 s | 5.4 s |

Both returned the correct counts: `NOT IN` kept 0 rows when every address was an exception, and `IN` kept 100,000. The subquery returned all 100,000 values with no cap that I could see. The join is slower by one order of magnitude. A multi-entry item pays that price, and a single-column item does not.

There is an open Elasticsearch issue about `IN (subquery)` above 100 values: the planner can choose a hash join that scans the whole outer source instead of filtering ([#165551](https://github.com/elastic/elasticsearch/issues/165551), with a proposed fix in [#165616](https://github.com/elastic/elasticsearch/pull/165616), not merged when I searched). It affects a query on source documents. A rule that ends with an aggregation filters computed rows, so the effect there should be small. I did not measure it, and the local test of `IN (subquery)` before an aggregation (`FROM demo-network | WHERE ... IN (...) | STATS`) ran correctly on 60 documents only.

## Pitfalls found

1. **A null in the subquery removes every row of a `NOT IN`.** `col NOT IN (subquery)` is null when the subquery returns a null and the row is not in the list, so the row is dropped. A document of the exceptions index without the field (an item of another shape) is enough. Every subquery needs `WHERE f IS NOT NULL`. I confirmed that without the filter the test returned 0 rows instead of 6.
2. **A null on the row side removes the row.** `NULL NOT IN (subquery)` is null. The text design already wraps its tests in `COALESCE(..., false)`, and the same wrapper works with a subquery (`NOT COALESCE(col IN (subquery), false)`).
3. **A document that lacks a join key never matches.** That is the right behavior for shapes (the shape of an item selects itself), and the wrong one for an item that wants "any value".
4. **Field names of the lookup index land in the row.** A lookup field with the same name as a column of the query is ambiguous or overwrites the column (`Found ambiguous reference`, and a column that silently took the lookup value in one test). The fields of the exceptions index need a prefix that no column uses, and the query has to `DROP` them before the alerts are built, because the executor writes the output columns into the alert.
5. **One column and the same type on both sides.** `IN (subquery)` and a join key fail when the types differ (`left field [host.name] of type [KEYWORD] is incompatible with right field [source_network] of type [IP]`). The `column_type` that each entry declares today already tells the type of the field to write.
6. **A join on a missing index fails the query** (`Unknown index`). The indices have to exist, even with zero documents, before a rule uses them.
7. **Index names have to be lowercase.** List ids and shape names need a normalization.
8. **A row that matches several documents appears several times** after a join. For an exclusion this is harmless, because all the copies are dropped. A rule must not read a join column after that stage.
9. **Join conditions mix fields only.** `ON l == x_list AND now < x_expire` works. `ON list_id AND ...` fails with `JOIN ON clause only supports fields or AND of Binary Expressions`, and a function such as `NOW()` has to be computed in an `EVAL` first.

## Where the documents would live and who writes them

| Option | What it means | Cost |
|---|---|---|
| Write when an exception item changes | The Lists plugin keeps a derived document (or a few) in a lookup index next to the item. The rule reads it at once | Another write path next to the one for the items, with repair when the two disagree. The same plugin is where the value lists move to lookup indices (the POC of the value list proposal), so the code and the migration could be shared |
| Write at each rule run | The executor writes the items that the rule uses before it runs the query | One bulk request at each run, and the cleanup of documents that no rule needs. Two runs of one rule at the same time must not remove each other's documents |
| Read the stored items directly | The query reads `.items-*` | Not possible. The items store `entries` as a nested array, and neither a join nor `IN (subquery)` reads nested fields |

Whatever the option, the rule API key needs read access to the new indices. Value lists already have that problem and the POC found it (per-index privileges apply at run time, and the snapshot of the key does not follow role edits).

## Maturity of the features

- `WHERE ... IN (subquery)` and `NOT IN` are a technical preview since Elasticsearch 9.5, with GA tracked in [elastic/roadmap#686](https://github.com/elastic/roadmap/issues/686). The exceptions would depend on a preview feature, and on its syntax staying as it is.
- `LOOKUP JOIN`, with the comparison operators in `ON`, is the feature that the value list POC and the range test already used. I have not checked in which release each form of the condition (`>=`, `!=`) shipped.
- None of this was run on a released version, on serverless, or across clusters (CCS, CPS). The earlier results of this branch changed from one `9.7.0-SNAPSHOT` build to another (the 500 parentheses limit), so every number here needs a new measurement on the oldest version that the rule type supports.

## Comparison with the text design

| | Text (today) | Data |
|---|---|---|
| Values in the query text | Yes. Escaped by the compiler | No |
| Number of exceptions | 200 comparisons | Measured to 100,000 |
| All entry types | All except `list` and `nested` | No wildcard, no `exists` (they would stay as text, so two code paths) |
| Exceptions apply the moment they are saved | Yes | Yes if the documents are written with the item. A policy of `ENRICH` would not |
| Needs the final query to be readable in the log | Yes, the log shows the stage | The log would show the clauses and the index names, not the values. The values are in the index |
| Failure when a value does not fit the column | Before the query runs, with the item named | At the query: Elasticsearch names the types, not the item. The check would have to stay in the compiler |
| Feature maturity | Plain `WHERE` | Technical preview (`IN` subquery) |
| New code | Compiler (exists) | Compiler for the shapes, a writer of the documents, the cleanup, the privileges |

## What I would take from this

The data model removes the limits that cost us the most design effort (comparisons, parentheses, length, the stage packer). It fits the exceptions that people create in large numbers: `is one of` with many values, CIDR ranges, and value lists. Those are one column, so `IN (subquery)` handles them at full speed. A hybrid is possible in one `WHERE` stage, because the pieces combine with `OR` and `NOT`.

I would not replace the text design with the data design for all the entry types. Wildcards and `exists` need text. Multi-entry items need a join, which is ten times slower at 100,000 documents and needs one lookup index (or one set of fields) for each shape. The preview status of `IN (subquery)` is the other reason to wait.

A small first step that uses what exists: apply `list` entries (value lists) to ES|QL rules with `IN (FROM <list index>)`. The compiler does not support them today, and the value list POC already moves the lists to indices that the subquery can read. That step needs no new write path.

Questions for the Elasticsearch team:

1. Is `IN (subquery)` planned for GA in a version that we can target, and does it keep the same syntax?
2. Is there a cap on the number of values that a subquery can return (I found none up to 100,000), and on the number of subqueries and joins in one query?
3. Can `LIKE` or `RLIKE` take a non-constant pattern in a later version? It would remove the wildcard exception.
4. Does a left key with several values match any of them in a join? It would let a row carry its own suffixes, and a wildcard that starts with `*` could become an equality.
5. Can a join test that a field is null or missing, so that `exists` fits?

## Not tested

- `IN (subquery)` before an aggregation, at the scale of the performance issue above.
- Rules with alert suppression and an exception index that changes during the run.
- Cross-cluster search and serverless.
- A join on keys of the type `date` or on a multi-valued key.
- The cost when 100 rules use the same exceptions index.
