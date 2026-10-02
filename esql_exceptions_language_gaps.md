# ES|QL language limitations behind native exceptions

What ES|QL cannot do, or does differently, that shapes how exceptions work on an ES|QL rule (`siem.esqlRule`). The design is described in `esql_exceptions_proposal.md`; in short:

- An exception on a **source field** keeps running as part of the DSL filter on the `_query` request, as it does today.
- An exception on a **computed column** (a `STATS` output, an `EVAL` value, a renamed column) is compiled into a `| WHERE` stage appended at the end of the query.

The document has two parts. The first lists the limitations that the end-of-query stage has to work around today, with how the implementation handles each. The second lists the limitations that only matter for future work: they make some source fields unusable as ES|QL columns, so they cannot be evaluated in ES|QL, which is the reason those exceptions stay in the DSL filter and the reason they would matter again for early inlining or for value lists evaluated with `LOOKUP JOIN`.

A detection exception **excludes** alerts, so in every example the exception is on a benign value (`good...`) that we want excluded while a threat value (`bad...`) still alerts. The baseline behavior the examples compare against is catalogued, per operator and field type, in `esql_exceptions_v1_inventory.md`. The comparison of the DSL filter with a `WHERE` stage right after `FROM`, the other option that was evaluated, is in `esql_exceptions_operator_parity.md`.

The reproductions use ES|QL queries that run on their own, or standalone Node.js scripts (Node 18+, global `fetch`) against a running Kibana and Elasticsearch:

```bash
ES_USER=elastic ES_PASS=changeme node <script>.mjs
```

`KBN_URL` defaults to `http://localhost:5601/kbn` (Kibana's `/kbn` base path) and `ES_URL` to `http://localhost:9200`; override them if yours differ. All behavior was observed on an Elasticsearch 9.6 snapshot.

---

# Part 1: limitations that shape the end-of-query stage

| # | Limitation | How the implementation handles it |
|---|---|---|
| 1 | [Comparing a multi-valued column returns `null`](#1-comparing-a-multi-valued-column-returns-null) | `MV_CONTAINS`, `MV_LIKE` and `MV_IN_RANGE`, which return a real boolean and match on any element |
| 2 | [A literal must be cast to the column type, and a failed cast excludes every row](#2-a-literal-must-be-cast-to-the-column-type) | The value is validated and cast before the clause is written; an invalid value is not applied |
| 3 | [No term-level rounding for dates](#3-no-term-level-rounding-for-dates) | A range with `MV_IN_RANGE` that covers the unit of the value |
| 4 | [Full-text matching on a `text` column](#4-full-text-matching-on-a-text-column) | `MATCH_PHRASE` for "is" and "is one of" when the query allows it; "matches" is not applied |
| 5 | [Expression depth and stage limits](#5-expression-depth-and-stage-limits) | At most 250 values per "is one of" and 100 items at the end of the query |
| 6 | [A `WHERE` on a column that does not exist is an error](#6-a-where-on-a-column-that-does-not-exist-is-an-error) | `_field_caps` and the output columns of the query classify every item before it is placed |
| 7 | [Column types that cannot be compared](#7-column-types-that-cannot-be-compared) | The item is not applied and the reason is reported |
| 8 | [`float` and `half_float` widen to `double`](#8-float-and-half_float-widen-to-double) | Listed as unsupported for computed columns |
| 9 | [Column names that are not plain identifiers](#9-column-names-that-are-not-plain-identifiers) | Backquoting per dotted segment |
| 10 | [No runtime fields in `_query`](#10-no-runtime-fields-in-_query) | None needed; unchanged from today |

## 1. Comparing a multi-valued column returns `null`

The DSL queries behind an exception (`match_phrase`, `wildcard`, `exists`) match a document when any value of a multi-valued field matches. In ES|QL, `==`, `IN` and `LIKE` do not compare element by element: on a multi-valued value they return `null`, and `WHERE NOT (null)` is `null`, so the row is not excluded.

```
ROW a = ["a", "b"] | EVAL eq = a == "a", i = a IN ("a", "c"), l = a LIKE "a*"
```
returns `eq`, `i` and `l` all `null`, while `MV_CONTAINS(a, "a")` returns `true`. ES|QL has no per-element filter, and `MV_EXPAND` would change the number of rows. Tracked in [elastic/elasticsearch#154852](https://github.com/elastic/elasticsearch/issues/154852).

The stage uses `MV_CONTAINS` for equality, `COALESCE(MV_LIKE(...), false)` for wildcards and `COALESCE(MV_IN_RANGE(...), false)` for dates. A missing value gives `false`, so a positive operator keeps the row and a negative one excludes it, as the DSL does.

## 2. A literal must be cast to the column type

`MV_CONTAINS(column, value)` needs the value to have exactly the type of the column, so the value is cast: `42::long`, `"10.0.0.1"::ip`. A value that cannot be cast becomes `null`, and `MV_CONTAINS(column, null)` is `true`, so the exception would exclude every row:

```
ROW n = 5 | EVAL bad = "abc"::integer, m = MV_CONTAINS(n, "abc"::integer)
```
returns `bad = null` and `m = true`. The implementation validates each value against the type first (integer range, finite double, `true` or `false`, a single IP address without CIDR, a version, the date formats in the next entry) and does not apply an item with a value that does not parse. The DSL has the opposite behavior for the same input: it fails the search, and the rule with it.

## 3. No term-level rounding for dates

A `match` entry on a `date` field runs as a term query that Elasticsearch rounds to the unit of the value: `2026-09-30` covers the whole day, a full-precision value matches only that instant, and a month or year value covers only its first day. ES|QL has no such comparison: `MATCH_PHRASE` rejects `date`, and `==` with a date literal matches only the instant.

```
ROW ts = "2026-09-30T14:00:00.000Z"::date | EVAL m = ts == "2026-09-30"::date
```
returns `m = false`.

The stage writes the range explicitly: `COALESCE(MV_IN_RANGE(col, "2026-09-30T00:00:00.000Z"::date, "2026-09-30T23:59:59.999Z"::date), false)`. The bounds of `MV_IN_RANGE` are inclusive, so the upper bound is the last instant of the unit (`.999999999Z` for `date_nanos`), and the function matches on any element of a multi-valued column. A year or month value covers its first day only, a value with a fraction is an exact `MV_CONTAINS`, and offsets, epoch milliseconds and other formats are not applied.

The script below reproduces the baseline on a rule: a day-granularity exception excludes every event of that day and only that day.

```js
const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const auth = 'Basic ' + Buffer.from(`${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`).toString('base64');
const kbn = (p, m, b, internal) => fetch(`${KBN}${p}`, { method: m, headers: { Authorization: auth, 'Content-Type': 'application/json', 'kbn-xsrf': 'x', ...(internal ? { 'x-elastic-internal-origin': 'kibana' } : { 'elastic-api-version': '2023-10-31' }) }, body: b && JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.text().then((t) => (t ? JSON.parse(t) : null)) }));
const es = (p, m, b, nd) => fetch(`${ES}${p}`, { method: m, headers: { Authorization: auth, 'Content-Type': nd ? 'application/x-ndjson' : 'application/json' }, body: nd ? b : b && JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.text().then((t) => (t ? JSON.parse(t) : null)) }));
const SRC = 'lim3_src';
const LIST = 'lim3-exc';
async function main() {
  await kbn(`/api/detection_engine/rules?rule_id=lim3-rule`, 'DELETE');
  await kbn(`/api/exception_lists?list_id=${LIST}&namespace_type=single`, 'DELETE');
  await es(`/${SRC}`, 'DELETE');
  await es(`/${SRC}`, 'PUT', { mappings: { properties: { '@timestamp': { type: 'date' }, id: { type: 'keyword' }, 'event.start': { type: 'date' } } } });
  const now = new Date().toISOString();
  await es(`/${SRC}/_bulk?refresh=true`, 'POST', [
    JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'benign', 'event.start': '2026-09-30T14:00:00.000Z' }),
    JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'alert', 'event.start': '2026-08-01T09:00:00.000Z' }),
  ].join('\n') + '\n', true);
  const { body: list } = await kbn('/api/exception_lists', 'POST', { list_id: LIST, name: LIST, description: 'x', type: 'detection', namespace_type: 'single' });
  await kbn('/api/exception_lists/items', 'POST', { list_id: LIST, item_id: `${LIST}-i`, name: 'x', description: 'x', type: 'simple', namespace_type: 'single', entries: [{ field: 'event.start', operator: 'included', type: 'match', value: '2026-09-30' }] });
  const { body: rule } = await kbn('/api/detection_engine/rules', 'POST', { rule_id: 'lim3-rule', name: 'lim3', description: 'x', type: 'esql', language: 'esql', query: `FROM ${SRC} METADATA _id | KEEP id, _id`, risk_score: 21, severity: 'low', from: 'now-1h', interval: '1m', enabled: true, exceptions_list: [{ id: list.id, list_id: LIST, type: 'detection', namespace_type: 'single' }] });
  await kbn(`/internal/alerting/rule/${rule.id}/_run_soon`, 'POST', undefined, true);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let hits = [];
  for (let i = 0; i < 20 && hits.length === 0; i++) {
    await sleep(1500);
    await es(`/.alerts-security.alerts-default/_refresh`, 'POST');
    const { body: res } = await es(`/.alerts-security.alerts-default/_search?size=50`, 'POST', { query: { term: { 'kibana.alert.rule.uuid': rule.id } }, _source: ['id'] });
    hits = res?.hits?.hits || [];
  }
  const survivors = hits.map((h) => h._source.id).sort();
  console.log('Documents: benign event.start=2026-09-30T14:00Z, alert event.start=2026-08-01T09:00Z');
  console.log('Exception: exclude the day "2026-09-30"');
  console.log('Surviving alert(s):', survivors.join(', ') || '(none)');
  console.log(survivors.join() === 'alert' ? '=> the 2026-09-30 event is excluded (day rounding); the other day still alerts. Baseline parity OK.' : '=> UNEXPECTED');
}
main().catch((e) => { console.error(e); process.exit(1); });
```

## 4. Full-text matching on a `text` column

The DSL compares a `text` field by analyzed token: the text is lowercased and split at index time, the pattern or phrase of the exception is not analyzed, and the comparison runs on the tokens. A `text` column reaches the end of the query only when the query passes a `text` field through (`RENAME`, `EVAL c = field`, a `STATS ... BY alias = field` key); every function that takes `text` returns `keyword`. What ES|QL offers for that column:

| Function | After `RENAME`, `EVAL` alias, `STATS ... BY alias` | Wildcards | Result on a `text` column |
|---|---|---|---|
| `MATCH_PHRASE`, `MATCH`, `:` | Run, and resolve the alias to the source field | No (`MATCH(msg, "good*")` takes the star literally and matches nothing) | Token semantics, same as the DSL `match_phrase` |
| `QSTR`, `KQL` | Rejected: `[QSTR] function cannot be used after RENAME` (also after `EVAL` and `STATS`) | Yes | Not usable |
| `LIKE`, `MV_LIKE` | Run anywhere | Yes | Compare the whole value, case-sensitive |

For the documents `Connection to Good.com failed`, `connection to good.com`, `bad.com`:

```
FROM idx METADATA _id | RENAME message AS msg | WHERE MATCH_PHRASE(msg, "to good.com")
```
returns the first two, as the DSL does. A wildcard has no equivalent: the DSL `wildcard` query for `good*` matches the token `good.com` in the first two documents, `LIKE "good*"` matches only a document whose whole value starts with `good`, and `QSTR("msg:good*")` is rejected. Lowercasing the value (`TO_LOWER`) does not fix it, because `good*` must match a token in the middle of the value. No ES|QL function applies a `text` analyzer to a column (`TOKENIZE` and `ANALYZE` do not exist; `SPLIT` cuts on a fixed delimiter).

**Position.** A full-text function is accepted only at some positions of a query: after `EVAL`, `RENAME`, `KEEP`, `DROP`, `WHERE`, `SORT` without `LIMIT`, `DISSECT`, `GROK` and `MV_EXPAND` it runs; after `LIMIT` it is rejected (`[MatchPhrase] function cannot be used after LIMIT when it targets an indexed field`); after `STATS` it depends on the commands that follow (`STATS ... BY message | RENAME message AS msg | KEEP msg` is accepted, `STATS ... BY message | EVAL msg = message` is rejected). A `LIMIT 0` skips this check, so a probe with `LIMIT 0` does not reveal it. Related: [elastic/elasticsearch#130567](https://github.com/elastic/elasticsearch/issues/130567) asks the planner to accept a full-text function after `EVAL` or `LOOKUP JOIN` when the filter can still be pushed down; its example keeps the source column and it does not mention `RENAME` or `STATS`.

The implementation applies "is", "is one of" and their negatives to a `text` column with `MATCH_PHRASE`, and only when every command of the rule query is one of the accepted ones above. "matches" and "does not match" on a `text` column are not applied and are reported on the rule. The request to the ES|QL team is drafted in `esql_exceptions_es_issue.md`.

## 5. Expression depth and stage limits

A flat chain of `OR` comparisons fails at 294 terms (`exceeded the maximum expression depth of 300`; 293 works), and a pipeline is limited to 500 stages. The DSL has only the Lucene clause limit (4468 on the tested cluster) and works with hundreds of values.

The implementation caps an "is one of" list at 250 values and the end of the query at 100 items, one `WHERE` stage per item. `MV_INTERSECTS(field, ["a", "b", ...])` matched 5000 `keyword` values in one call and would lift the 250 cap for `keyword` columns; it was verified for `keyword` only.

## 6. A `WHERE` on a column that does not exist is an error

ES|QL fails a query that names a column absent from every index of the `FROM`. Defaults do not work around it: `EVAL` with a default value errors or overwrites a real value, and `RENAME` or `DROP` of an absent column errors. `SET unmapped_fields="nullify"` works but only from 9.5, and it also hides typos in the user's own query. The ES|QL schema of the source also hides object parents, `nested` sub-fields and `flattened` sub-keys, which the DSL searches without trouble.

So the implementation never writes a `WHERE` for a field it has not seen. It asks `_field_caps` (limited to the fields of the exception items and their parent prefixes) which fields are source fields, treats a key below a `flattened` field as a source field, and runs the rule query with `| LIMIT 0` to get the output columns. An item whose fields are in neither set is not applied and is logged.

## 7. Column types that cannot be compared

Eleven output column types can be compared at the end of the query: `keyword`, `text` (with the limits in entry 4), `integer`, `long`, `unsigned_long`, `double`, `boolean`, `ip`, `version`, `date` and `date_nanos`. The others cannot:

- They surface as `unsupported`, so no predicate can reference the column: `search_as_you_type`, `completion`, `join`, `binary`, `long_range`, `integer_range`, `float_range`, `ip_range`, `sparse_vector`, `rank_*`, `percolator`, and a field mapped with different types across the indices.
- The column exists but accepts no value comparison: `geo_*`, `cartesian_*`, `dense_vector`, `double_range`, `date_range`, the root of a `flattened` field, the histogram family and `aggregate_metric_double`. "exists" could be supported on these.
- There is no column at all: `nested` sub-fields, object parents, `flattened` sub-keys and `passthrough` parents.

## 8. `float` and `half_float` widen to `double`

A `float` or `half_float` column reaches ES|QL as a `double` that keeps the precision of the original type, so equality with a typed decimal such as `0.1` fails. They are listed as unsupported for computed columns. A source field of these types stays in the DSL filter, where the comparison works.

## 9. Column names that are not plain identifiers

A name such as `host-name` or a segment that starts with a digit has to be backquoted, and a backquoted dotted path is not the same as the path. The implementation quotes each dotted segment that needs it (`` a.`b-c` ``). This is a syntax requirement, not a missing feature.

## 10. No runtime fields in `_query`

ES|QL exposes runtime fields that are mapped in the index, but the `_query` request has no `runtime_mappings`, so a field that a data view defines at query time is unknown to an ES|QL rule. An exception on it matches nothing today and is skipped with a log entry now (its field is in neither the source nor the output).

---

# Part 2: limitations that matter only for future work

Each entry below is a **source field** that ES|QL cannot expose as a usable column. They are not blockers for what ships: the DSL filter runs on the source documents, matches all of them, and keeps parity. They would matter again if source-field exceptions were inlined right after `FROM` (rejected, see "Why source-field exceptions stay in the DSL filter" in the proposal) or if value lists were evaluated in ES|QL with `LOOKUP JOIN`, because a join key has to be a usable column. They never affect the end-of-query stage, because a computed column does not have these source-only shapes; if a computed column has one of these types, entry 7 applies.

---

## Conflicting types across indices (`unsupported`)

The exception is a `match` entry: `source.ip` is `10.0.0.1`, and the rule reads a pattern (`lim4_*`) whose indices map `source.ip` as `ip` in one and `keyword` in another. v1 translates it to a `match_phrase` query that runs inside the rule's `_search`, where each field is resolved per shard, so the query matches in the `ip` index and the `keyword` index independently, with no single-type requirement across the pattern.

This cannot be translated to ES|QL. `FROM lim4_*` requires one resolved column type for the whole pattern, so a field mapped as two types collapses to `unsupported` and no predicate on it (even an inline cast) matches in either index.

```js
const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const auth = 'Basic ' + Buffer.from(`${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`).toString('base64');
const kbn = (p, m, b, internal) => fetch(`${KBN}${p}`, { method: m, headers: { Authorization: auth, 'Content-Type': 'application/json', 'kbn-xsrf': 'x', ...(internal ? { 'x-elastic-internal-origin': 'kibana' } : { 'elastic-api-version': '2023-10-31' }) }, body: b && JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.text().then((t) => (t ? JSON.parse(t) : null)) }));
const es = (p, m, b, nd) => fetch(`${ES}${p}`, { method: m, headers: { Authorization: auth, 'Content-Type': nd ? 'application/x-ndjson' : 'application/json' }, body: nd ? b : b && JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.text().then((t) => (t ? JSON.parse(t) : null)) }));
const A = 'lim4_a';
const B = 'lim4_b';
const LIST = 'lim4-exc';
async function main() {
  await kbn(`/api/detection_engine/rules?rule_id=lim4-rule`, 'DELETE');
  await kbn(`/api/exception_lists?list_id=${LIST}&namespace_type=single`, 'DELETE');
  await es(`/${A}`, 'DELETE');
  await es(`/${B}`, 'DELETE');
  await es(`/${A}`, 'PUT', { mappings: { properties: { '@timestamp': { type: 'date' }, id: { type: 'keyword' }, 'source.ip': { type: 'ip' } } } });
  await es(`/${B}`, 'PUT', { mappings: { properties: { '@timestamp': { type: 'date' }, id: { type: 'keyword' }, 'source.ip': { type: 'keyword' } } } });
  const now = new Date().toISOString();
  await es(`/${A}/_bulk?refresh=true`, 'POST', [JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'benign-a', 'source.ip': '10.0.0.1' }), JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'alert', 'source.ip': '10.0.0.2' })].join('\n') + '\n', true);
  await es(`/${B}/_bulk?refresh=true`, 'POST', [JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'benign-b', 'source.ip': '10.0.0.1' })].join('\n') + '\n', true);
  const { body: list } = await kbn('/api/exception_lists', 'POST', { list_id: LIST, name: LIST, description: 'x', type: 'detection', namespace_type: 'single' });
  await kbn('/api/exception_lists/items', 'POST', { list_id: LIST, item_id: `${LIST}-i`, name: 'x', description: 'x', type: 'simple', namespace_type: 'single', entries: [{ field: 'source.ip', operator: 'included', type: 'match', value: '10.0.0.1' }] });
  const { body: rule } = await kbn('/api/detection_engine/rules', 'POST', { rule_id: 'lim4-rule', name: 'lim4', description: 'x', type: 'esql', language: 'esql', query: `FROM lim4_* METADATA _id | KEEP id, _id`, risk_score: 21, severity: 'low', from: 'now-1h', interval: '1m', enabled: true, exceptions_list: [{ id: list.id, list_id: LIST, type: 'detection', namespace_type: 'single' }] });
  await kbn(`/internal/alerting/rule/${rule.id}/_run_soon`, 'POST', undefined, true);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let hits = [];
  for (let i = 0; i < 20 && hits.length === 0; i++) {
    await sleep(1500);
    await es(`/.alerts-security.alerts-default/_refresh`, 'POST');
    const { body: res } = await es(`/.alerts-security.alerts-default/_search?size=50`, 'POST', { query: { term: { 'kibana.alert.rule.uuid': rule.id } }, _source: ['id'] });
    hits = res?.hits?.hits || [];
  }
  const survivors = hits.map((h) => h._source.id).sort();
  console.log('Documents: source.ip=10.0.0.1 in lim4_a (ip) and lim4_b (keyword); source.ip=10.0.0.2 in lim4_a');
  console.log('Exception: exclude source.ip "10.0.0.1"');
  console.log('Surviving alert(s):', survivors.join(', ') || '(none)');
  console.log(survivors.join() === 'alert' ? '=> 10.0.0.1 is excluded in both indices; 10.0.0.2 still alerts. Baseline parity OK.' : '=> UNEXPECTED');
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Missing in ES|QL: per-shard type resolution for a conflicting field. `FROM lim4_* | LIMIT 0` reports `source.ip` as `unsupported`; an inline cast plans but matches nothing (verified):

```
FROM lim4_* | WHERE source.ip::ip == "10.0.0.1" | STATS c = COUNT(*)
```

returns `c = 0`. `_search` matched `10.0.0.1` in both the `ip` and the `keyword` index; ES|QL matches it in neither.

---

## `flattened` fields (root and sub-keys)

The exception is a `match` entry: `labels.domain` is `good.com`, where `labels` is a `flattened` field. v1 translates it to a `match_phrase` query on `labels.domain`, which `_search` addresses directly because a `flattened` field indexes each leaf as a `root.subkey` keyword term, so the sub-key matches as an exact term. (v1 also matches on the root `labels`: a `match` there is true when any leaf equals the value.)

This cannot be translated to ES|QL, at the sub-key or the root. ES|QL exposes only the root `labels` column, typed `flattened`, and has no way to reference `labels.domain` (it is an unknown column). The root column itself is not matchable with a scalar either: `MV_CONTAINS(labels, "good.com")` is rejected because its second argument must be `flattened`, not a string. So neither the sub-key match nor the root any-leaf match can be written.

```js
const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const auth = 'Basic ' + Buffer.from(`${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`).toString('base64');
const kbn = (p, m, b, internal) => fetch(`${KBN}${p}`, { method: m, headers: { Authorization: auth, 'Content-Type': 'application/json', 'kbn-xsrf': 'x', ...(internal ? { 'x-elastic-internal-origin': 'kibana' } : { 'elastic-api-version': '2023-10-31' }) }, body: b && JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.text().then((t) => (t ? JSON.parse(t) : null)) }));
const es = (p, m, b, nd) => fetch(`${ES}${p}`, { method: m, headers: { Authorization: auth, 'Content-Type': nd ? 'application/x-ndjson' : 'application/json' }, body: nd ? b : b && JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.text().then((t) => (t ? JSON.parse(t) : null)) }));
const SRC = 'lim5_src';
const LIST = 'lim5-exc';
async function main() {
  await kbn(`/api/detection_engine/rules?rule_id=lim5-rule`, 'DELETE');
  await kbn(`/api/exception_lists?list_id=${LIST}&namespace_type=single`, 'DELETE');
  await es(`/${SRC}`, 'DELETE');
  await es(`/${SRC}`, 'PUT', { mappings: { properties: { '@timestamp': { type: 'date' }, id: { type: 'keyword' }, labels: { type: 'flattened' } } } });
  const now = new Date().toISOString();
  await es(`/${SRC}/_bulk?refresh=true`, 'POST', [
    JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'benign', labels: { domain: 'good.com' } }),
    JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'alert', labels: { domain: 'bad.com' } }),
  ].join('\n') + '\n', true);
  const { body: list } = await kbn('/api/exception_lists', 'POST', { list_id: LIST, name: LIST, description: 'x', type: 'detection', namespace_type: 'single' });
  await kbn('/api/exception_lists/items', 'POST', { list_id: LIST, item_id: `${LIST}-i`, name: 'x', description: 'x', type: 'simple', namespace_type: 'single', entries: [{ field: 'labels.domain', operator: 'included', type: 'match', value: 'good.com' }] });
  const { body: rule } = await kbn('/api/detection_engine/rules', 'POST', { rule_id: 'lim5-rule', name: 'lim5', description: 'x', type: 'esql', language: 'esql', query: `FROM ${SRC} METADATA _id | KEEP id, _id`, risk_score: 21, severity: 'low', from: 'now-1h', interval: '1m', enabled: true, exceptions_list: [{ id: list.id, list_id: LIST, type: 'detection', namespace_type: 'single' }] });
  await kbn(`/internal/alerting/rule/${rule.id}/_run_soon`, 'POST', undefined, true);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let hits = [];
  for (let i = 0; i < 20 && hits.length === 0; i++) {
    await sleep(1500);
    await es(`/.alerts-security.alerts-default/_refresh`, 'POST');
    const { body: res } = await es(`/.alerts-security.alerts-default/_search?size=50`, 'POST', { query: { term: { 'kibana.alert.rule.uuid': rule.id } }, _source: ['id'] });
    hits = res?.hits?.hits || [];
  }
  const survivors = hits.map((h) => h._source.id).sort();
  console.log('Documents: benign labels.domain=good.com, alert labels.domain=bad.com');
  console.log('Exception: exclude labels.domain "good.com"');
  console.log('Surviving alert(s):', survivors.join(', ') || '(none)');
  console.log(survivors.join() === 'alert' ? '=> good.com is excluded via the flattened sub-key; bad.com still alerts. Baseline parity OK.' : '=> UNEXPECTED');
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Missing in ES|QL: addressable `flattened` subfields, and a scalar predicate on the root. `FROM lim5_src | LIMIT 0` lists only `labels` (typed `flattened`); there is no `labels.domain` column:

```
FROM lim5_src | WHERE labels.domain == "good.com"
```

fails with `Unknown column [labels.domain]`, and the root

```
FROM lim5_src | WHERE MV_CONTAINS(labels, "good.com")
```

fails with `second argument of [MV_CONTAINS(labels, "good.com")] must be [flattened]`.

---

## Range field types

The exception is a `match` entry: `port_range` is `15`, where `port_range` is a `long_range` field. v1 translates it to a `match_phrase` query on the range field, which Elasticsearch runs as a containment test: a document matches when its range contains the value. The same holds for `date_range`, `ip_range`, and the `integer` / `float` / `double` range types.

This cannot be translated to ES|QL. `long_range`, `integer_range`, `float_range`, and `ip_range` surface as `unsupported`, so the column carries no readable value and no predicate can reference it. `double_range` and `date_range` surface as typed columns that can be read and tested with `IS NULL`, but they accept no containment predicate: `MV_CONTAINS` rejects a range as its first argument, and `==` requires a range on both sides. So no range type can express "the range contains this value". For a source field this item can stay on the DSL pre-filter path (so parity is kept), but it cannot be evaluated in ES|QL.

```js
const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const auth = 'Basic ' + Buffer.from(`${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`).toString('base64');
const kbn = (p, m, b, internal) => fetch(`${KBN}${p}`, { method: m, headers: { Authorization: auth, 'Content-Type': 'application/json', 'kbn-xsrf': 'x', ...(internal ? { 'x-elastic-internal-origin': 'kibana' } : { 'elastic-api-version': '2023-10-31' }) }, body: b && JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.text().then((t) => (t ? JSON.parse(t) : null)) }));
const es = (p, m, b, nd) => fetch(`${ES}${p}`, { method: m, headers: { Authorization: auth, 'Content-Type': nd ? 'application/x-ndjson' : 'application/json' }, body: nd ? b : b && JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.text().then((t) => (t ? JSON.parse(t) : null)) }));
const SRC = 'lim6_src';
const LIST = 'lim6-exc';
async function main() {
  await kbn(`/api/detection_engine/rules?rule_id=lim6-rule`, 'DELETE');
  await kbn(`/api/exception_lists?list_id=${LIST}&namespace_type=single`, 'DELETE');
  await es(`/${SRC}`, 'DELETE');
  await es(`/${SRC}`, 'PUT', { mappings: { properties: { '@timestamp': { type: 'date' }, id: { type: 'keyword' }, port_range: { type: 'long_range' } } } });
  const now = new Date().toISOString();
  await es(`/${SRC}/_bulk?refresh=true`, 'POST', [
    JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'good', port_range: { gte: 10, lte: 20 } }),
    JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'bad', port_range: { gte: 100, lte: 200 } }),
  ].join('\n') + '\n', true);
  const { body: list } = await kbn('/api/exception_lists', 'POST', { list_id: LIST, name: LIST, description: 'x', type: 'detection', namespace_type: 'single' });
  await kbn('/api/exception_lists/items', 'POST', { list_id: LIST, item_id: `${LIST}-i`, name: 'x', description: 'x', type: 'simple', namespace_type: 'single', entries: [{ field: 'port_range', operator: 'included', type: 'match', value: '15' }] });
  const { body: rule } = await kbn('/api/detection_engine/rules', 'POST', { rule_id: 'lim6-rule', name: 'lim6', description: 'x', type: 'esql', language: 'esql', query: `FROM ${SRC} METADATA _id | KEEP id, _id`, risk_score: 21, severity: 'low', from: 'now-1h', interval: '1m', enabled: true, exceptions_list: [{ id: list.id, list_id: LIST, type: 'detection', namespace_type: 'single' }] });
  await kbn(`/internal/alerting/rule/${rule.id}/_run_soon`, 'POST', undefined, true);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let hits = [];
  for (let i = 0; i < 20 && hits.length === 0; i++) {
    await sleep(1500);
    await es(`/.alerts-security.alerts-default/_refresh`, 'POST');
    const { body: res } = await es(`/.alerts-security.alerts-default/_search?size=50`, 'POST', { query: { term: { 'kibana.alert.rule.uuid': rule.id } }, _source: ['id'] });
    hits = res?.hits?.hits || [];
  }
  const survivors = hits.map((h) => h._source.id).sort();
  console.log('Documents: good port_range=[10,20], bad port_range=[100,200]');
  console.log('Exception: "port_range" is 15 (matches ranges containing 15)');
  console.log('Surviving alert(s):', survivors.join(', ') || '(none)');
  console.log(survivors.join() === 'bad' ? '=> good excluded (its range contains 15); bad still alerts. Baseline parity OK.' : '=> UNEXPECTED');
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Missing in ES|QL: a containment predicate on range types. `FROM lim6_src | LIMIT 0` reports `port_range` as `unsupported`, and any predicate on it fails:

```
FROM lim6_src | WHERE NOT (MV_CONTAINS(port_range, 15))
```

fails with `Cannot use field [port_range] with unsupported type [long_range]`. On a `double_range` column the same predicate fails with `first argument of [MV_CONTAINS(...)] must be [any type except counter types, ...]`.

---

## `nested` sub-fields

The exception is a `nested` entry on `user`, with two inner predicates: `name` is `svc-scan` and `role` is `admin`. v1 translates it to a `nested` query, so a document matches only when a single `user` object satisfies both predicates; the same two values split across different objects do not match.

This cannot be translated to ES|QL. ES|QL does not expose the sub-fields of a `nested` field: the schema lists no `user.name` or `user.role` column, so neither the per-object correlation nor even the individual predicates can be written. For a source field this item can stay on the DSL pre-filter path (so parity is kept), but it cannot be evaluated in ES|QL.

```js
const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const auth = 'Basic ' + Buffer.from(`${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`).toString('base64');
const kbn = (p, m, b, internal) => fetch(`${KBN}${p}`, { method: m, headers: { Authorization: auth, 'Content-Type': 'application/json', 'kbn-xsrf': 'x', ...(internal ? { 'x-elastic-internal-origin': 'kibana' } : { 'elastic-api-version': '2023-10-31' }) }, body: b && JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.text().then((t) => (t ? JSON.parse(t) : null)) }));
const es = (p, m, b, nd) => fetch(`${ES}${p}`, { method: m, headers: { Authorization: auth, 'Content-Type': nd ? 'application/x-ndjson' : 'application/json' }, body: nd ? b : b && JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.text().then((t) => (t ? JSON.parse(t) : null)) }));
const SRC = 'lim7_src';
const LIST = 'lim7-exc';
async function main() {
  await kbn(`/api/detection_engine/rules?rule_id=lim7-rule`, 'DELETE');
  await kbn(`/api/exception_lists?list_id=${LIST}&namespace_type=single`, 'DELETE');
  await es(`/${SRC}`, 'DELETE');
  await es(`/${SRC}`, 'PUT', { mappings: { properties: { '@timestamp': { type: 'date' }, id: { type: 'keyword' }, user: { type: 'nested', properties: { name: { type: 'keyword' }, role: { type: 'keyword' } } } } } });
  const now = new Date().toISOString();
  await es(`/${SRC}/_bulk?refresh=true`, 'POST', [
    JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'good', user: [{ name: 'svc-scan', role: 'admin' }] }),
    JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, id: 'bad', user: [{ name: 'svc-scan', role: 'user' }, { name: 'intruder', role: 'admin' }] }),
  ].join('\n') + '\n', true);
  const { body: list } = await kbn('/api/exception_lists', 'POST', { list_id: LIST, name: LIST, description: 'x', type: 'detection', namespace_type: 'single' });
  await kbn('/api/exception_lists/items', 'POST', { list_id: LIST, item_id: `${LIST}-i`, name: 'x', description: 'x', type: 'simple', namespace_type: 'single', entries: [{ field: 'user', type: 'nested', entries: [{ field: 'name', operator: 'included', type: 'match', value: 'svc-scan' }, { field: 'role', operator: 'included', type: 'match', value: 'admin' }] }] });
  const { body: rule } = await kbn('/api/detection_engine/rules', 'POST', { rule_id: 'lim7-rule', name: 'lim7', description: 'x', type: 'esql', language: 'esql', query: `FROM ${SRC} METADATA _id | KEEP id, _id`, risk_score: 21, severity: 'low', from: 'now-1h', interval: '1m', enabled: true, exceptions_list: [{ id: list.id, list_id: LIST, type: 'detection', namespace_type: 'single' }] });
  await kbn(`/internal/alerting/rule/${rule.id}/_run_soon`, 'POST', undefined, true);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let hits = [];
  for (let i = 0; i < 20 && hits.length === 0; i++) {
    await sleep(1500);
    await es(`/.alerts-security.alerts-default/_refresh`, 'POST');
    const { body: res } = await es(`/.alerts-security.alerts-default/_search?size=50`, 'POST', { query: { term: { 'kibana.alert.rule.uuid': rule.id } }, _source: ['id'] });
    hits = res?.hits?.hits || [];
  }
  const survivors = hits.map((h) => h._source.id).sort();
  console.log('Documents: good user=[{name:svc-scan,role:admin}], bad user=[{svc-scan,user},{intruder,admin}]');
  console.log('Exception: nested user where name is "svc-scan" AND role is "admin" (same object)');
  console.log('Surviving alert(s):', survivors.join(', ') || '(none)');
  console.log(survivors.join() === 'bad' ? '=> good excluded (one object matches both); bad still alerts (match split across objects). Baseline parity OK.' : '=> UNEXPECTED');
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Missing in ES|QL: addressable `nested` sub-fields. `FROM lim7_src | LIMIT 0` lists `@timestamp` and `id` only, no `user.*` columns, and the inline attempt

```
FROM lim7_src | WHERE NOT (MV_CONTAINS(user.name, "svc-scan") AND MV_CONTAINS(user.role, "admin"))
```

fails with `Unknown column [user.name]` and `Unknown column [user.role]`.

---

## Other types that ES|QL surfaces as `unsupported`

Three more types accept an "is" exception today and surface as `unsupported` in ES|QL, so no predicate can reference them:

| Type | What the current implementation matches | ES\|QL |
|---|---|---|
| `search_as_you_type` | a token or phrase inside the value, as for `text` | `unsupported`; `MATCH_PHRASE` fails with `Cannot use field [v] with unsupported type` (`QSTR("v:good*")` still runs) |
| `completion` | the exact whole input string | `unsupported` |
| `join` | the document's relation name (for example `question` or `answer`), not the parent id | `unsupported` |

Like the other blockers in this section, these can stay on the DSL pre-filter for a source field and cannot be evaluated in ES|QL. No runnable script is included: the behavior is the same schema probe (`FROM idx | LIMIT 0` shows the column as `unsupported`).

---
