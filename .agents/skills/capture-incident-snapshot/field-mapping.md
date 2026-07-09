# Incident query → config field mapping

An incident's canonical query (from the docs / dashboard link, often ES|QL with a
`KQL(...)` filter, or a Discover KQL/Lucene search) carries most of what the
config needs. Both config queries are **plain Query DSL query objects** — write
whatever DSL fits the incident (`query_string`, `term`/`terms`, `bool`, …).

## Example incident query (ES|QL from a dashboard link)

```esql
FROM logging-ap-southeast-2:logs-system.syslog-* METADATA _index
| WHERE @timestamp >= "2026-05-28T00:00:00Z" AND @timestamp < "2026-05-30T00:00:00Z"
  AND KQL("\"Failed to pull image\" OR \"short read\" OR ImagePullBackOff OR ErrImagePull")
| KEEP @timestamp, host.name, message
| SORT @timestamp ASC
| LIMIT 100
```

## Mapping

| Incident query element                        | Config field                                              |
| --------------------------------------------- | --------------------------------------------------------- |
| `FROM <indices>` target(s)                    | `source.index` (one pattern, or a YAML list for multiple) |
| segment before the first `:` in a FROM target | `source.cluster` (provenance; optional, may be omitted)   |
| `@timestamp >= "X"` (also `>`)                | `query.timeRange.gte`                                     |
| `@timestamp < "Y"` (also `<=`)                | `query.timeRange.lt`                                      |
| the symptom `WHERE` predicate                 | `query.symptom` (any Query DSL — see operator table)      |
| the affected ENTITY (project id / node)       | `query.snapshot` (spans all datasets — see below)         |

For `source.index`, prefer the BROAD all-datasets pattern (`<clusterAlias>:logs-*`)
rather than the single symptom dataset, so the capture spans every `logs-*`
dataset the affected entity emitted. `METADATA _index`, `KEEP`, `SORT`, `LIMIT`,
and `STATS` are display / aggregation concerns — translate only the `WHERE`. Do
NOT copy the `@timestamp` range into `query.symptom`/`query.snapshot`; the tool
adds it from `query.timeRange` (which is required — derive a window from the
incident date if the query has no `@timestamp` bound).

## Choosing an entity key that spans datasets

`query.snapshot` should scope by an **entity** rather than by dataset, so the same
filter matches across `kibana.log`, `elasticsearch.server`, `container_logs`,
`system.syslog`, … Pick a field present in every relevant dataset:

- **Serverless project incidents** → `serverless.project.id` (a `term`). Present on
  all serverless project logs regardless of dataset.
- **Kubernetes node / pod incidents** → `host.name` (a `term`/`terms`). Node-level
  datasets (`system.syslog`) and pod stdout (`container_logs`) both carry it.
- **Orchestration namespace** → `orchestrator.namespace` or `kubernetes.namespace`
  when the incident is namespace-scoped.

Verify the chosen key actually appears across datasets in the Step 2 probe (run the
`STATS ... BY data_stream.dataset` with the entity predicate, not the symptom
predicate). If pods are identified differently per dataset (`host.name` vs
`kubernetes.pod.name`), use the field that is common, or list both in a `bool.should`.
With the broad `logs-*` source + an entity-scoped `snapshot` query, each doc is
reindexed into a local index named after its ORIGINAL source data stream (no `dest`
config); the tool snapshots exactly that set.

## Operator translation (ES|QL / KQL `WHERE` → Query DSL)

There is no required shape — pick whatever expresses the predicate. Common
translations:

| Incident predicate                   | Query DSL                                                             |
| ------------------------------------ | --------------------------------------------------------------------- |
| `KQL("a OR b")` / Lucene phrase ORs  | `{ query_string: { query: 'a OR b' } }`                               |
| `field == "x"`                       | `{ term: { field: 'x' } }`                                            |
| `field : "x"` (KQL match)            | `{ match: { field: 'x' } }`                                           |
| `field IN ("a","b")`                 | `{ terms: { field: ['a','b'] } }`                                     |
| `field IS NOT NULL`                  | `{ exists: { field: 'field' } }`                                      |
| `STARTS_WITH(field,"x")`             | `{ prefix: { field: 'x' } }`                                          |
| `LIKE "*x*"` / `CONTAINS(field,"x")` | `{ wildcard: { field: '*x*' } }` (or `match_phrase` on analyzed text) |
| `RLIKE "<regex>"`                    | `{ regexp: { field: '<regex>' } }`                                    |
| several predicates joined by `AND`   | `{ bool: { filter: [ … ] } }`                                         |
| `a OR b` on structured clauses       | `{ bool: { should: [ … ], minimum_should_match: 1 } }`                |

Wildcard/`CONTAINS`/`LIKE` need a `keyword` field (or a `.keyword` subfield); on
analyzed `text` (e.g. `message`) prefer `match`/`match_phrase`.

## symptom vs snapshot

- **`query.symptom`** is the narrow query (symptom keywords + any noise filters).
  It confirms the incident and gives the symptom hit count. Stored for replay —
  never executed by the loader.
- **`query.snapshot`** is the broad slice actually reindexed and snapshotted. Drop
  the symptom filter and any noise-exclusion (`node-debug*`, `teleport*`,
  `"Round trip completed"`) so the full real-world context is preserved. Scope it
  by an ENTITY key that spans datasets (see above) so it captures all `logs-*`
  datasets for that entity, not just the symptom dataset. Empty `snapshot: {}`
  means "the whole `source.index` within `timeRange`".

Both are plain Query DSL query objects — use whichever shape fits. For example, a
keyword-OR symptom vs a multi-field one:

```yaml
query:
  # simple keyword symptom
  symptom:
    query_string:
      query: '"Failed to pull image" OR ImagePullBackOff'
  # scope the snapshot by the affected node(s) — spans all datasets on those nodes
  snapshot:
    terms:
      host.name: ['<node-a>', '<node-b>']
```

```yaml
query:
  # multi-field symptom (e.g. an entity-extraction failure)
  symptom:
    bool:
      filter:
        - term: { 'log.level': 'ERROR' }
        - prefix: { 'log.logger': 'plugins.entityStore' }
        - wildcard: { message: '*verification_exception*' }
  # scope the snapshot by the affected project — spans kibana.log + elasticsearch.server + …
  snapshot:
    term:
      serverless.project.id: '<project-id>'
```

## Caveats

- **KQL vs Lucene.** A `{ query_string: { query: '…' } }` uses Lucene syntax, not
  KQL. For simple quoted-phrase ORs (as above) a `KQL(...)` body works verbatim as
  Lucene. For anything more complex (nested fields, ranges, wildcards on specific
  fields) verify it, or use a structured DSL query (`term`/`terms`/`range`/`bool`).
- **Reproducing in Discover.** A `query_string` query pastes into Discover's
  Lucene search bar (switch the bar to Lucene), or translate it to KQL. Structured
  DSL queries go in via **Add filter → Edit as Query DSL**.
- **Twinned remotes.** Logging remotes are twinned (`logging-*` +
  `serverless-logging-*`). Pick ONE in `source.index` to dedupe.
- **Frozen indices.** Older windows sit in `partial-` frozen indices — still
  searchable, but snapshot them soon.
- **Dataset location.** The symptom is often not in `container_logs`. Always run
  the `STATS ... BY data_stream.dataset, _index` probe to find the real dataset
  before setting `source.index`.
