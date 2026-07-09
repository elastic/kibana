---
name: capture-incident-snapshot
description: >-
  Author an incident capture config from incident documentation for the
  @kbn/es-snapshot-loader capture-incident command. Reads all incident docs
  (rootly_incidents entry, RCA doc, Slack channel), probes the source (Overview)
  logs to locate the affected entity and all log datasets it spans, derives a
  narrow "symptom" query and a broad entity-scoped "snapshot" query (both plain
  Query DSL — any shape; the remote reindex accepts Query DSL only, not ES|QL),
  writes a commented <id>.incident.yml, then runs capture-incident to reindex all
  those datasets and snapshot the logs to GCS. Use when capturing a
  real-world incident log snapshot for Nightshift evals, converting an incident
  summary into an .incident.yml, or when the user pastes incident documentation
  and asks to snapshot its logs.
---

# Capture incident snapshot

Turn incident documentation into a `<id>.incident.yml` config for the
`capture-incident` command, then run capture-incident to snapshot a broad,
real-world log slice that can be replayed to reproduce and analyze what happened.

Read this first for context on the command the config feeds:
`x-pack/platform/packages/shared/kbn-es-snapshot-loader/scripts/capture_incident/README.md`.

## Two queries, all log datasets

Every incident config carries two queries, **both plain Query DSL query objects**
(write whatever DSL fits — `query_string`, `term`/`terms`, `bool`, …) — the remote
`_reindex` that moves the data accepts Query DSL only, not ES|QL:

- **`query.symptom`** (narrow) — symptom keywords + noise filters. Used to locate
  and confirm the incident and count symptom hits. Stored only, not snapshotted.
  Replay it against the restored full-log index to isolate the error lines.
- **`query.snapshot`** (broad) — the same time window scoped by the affected
  **ENTITY** (not by dataset), with the symptom filter and noise-exclusion removed
  (noise INCLUDED). This is what actually gets reindexed and snapshotted. Empty
  (`{}`) means "the whole `source.index` within `timeRange`".

To make the snapshot a real-world reproducible environment, point `source.index`
at the broad `<remote>:logs-*` and scope `query.snapshot` by an entity key that
appears in EVERY dataset (`serverless.project.id`, or a k8s node/pod `host.name`),
so the capture spans ALL `logs-*` datasets that entity emitted — `kibana.log`,
`elasticsearch.server`, `container_logs`, `system.syslog`, … — not just the one
dataset where the symptom string matched. There is no `dest` config: each doc is
reindexed into a local index named after its ORIGINAL source data stream (e.g.
`logs-elasticsearch.server-default`), and the tool snapshots exactly that set, so
restore reproduces the original names. Use `source.exclude` to drop datasets a
broad `logs-*` would pull in but that the source key can't read or that are too
large (e.g. `logs-elasticsearch.gc-*`).

Both are combined with `query.timeRange` automatically, so don't repeat the time
range inside them.

Why keep noise: "Cleaning up noise is only applicable when finding logs related
to an incident. When we are snapshotting these logs, we should include noise in
the snapshot." A narrow error-only slice is too thin to reproduce the incident.

## Credentials

All keys live in one file the user fills in from
[secrets.env.example](secrets.env.example). Copy it to `secrets.env`
(gitignored) and source it before running:

```bash
source .agents/skills/capture-incident-snapshot/secrets.env
```

It sets, in one place:

- `OVERVIEW_ES_URL` / `OVERVIEW_ES_API_KEY` — the Overview cluster where the
  incident logs live (also exported as `ELASTICSEARCH_URL` / `ELASTICSEARCH_API_KEY`
  for the `esql.js` probe and as `OVERVIEW_API_KEY` for the capture-incident
  remote reindex — same key, three names).
- `ROOTLY_ES_URL` / `ROOTLY_ES_API_KEY` — the incident-data cluster for
  `rootly_incidents`. To probe it, re-export the `ELASTICSEARCH_*` pair to these.
- `KIBANA_URL` / `KIBANA_AUTH` — the local Kibana for the `kibana-api` skill.
- `LOCAL_ES_URL` — the local Elasticsearch snapshot target, used as
  capture-incident `--es-url`.
- `GCS_CREDENTIALS_FILE` — absolute path to the GCS service-account JSON, loaded
  into the local ES keystore at ES startup.

Slack is the Slack MCP (OAuth via Cursor MCP auth), not in this file.

If keys are missing, do the offline pass: derive everything from the pasted
documentation and skip the live probe (Step 2).

## Workflow

Copy this checklist and track progress:

```
- [ ] Step 1: Gather incident context
- [ ] Step 2: Find the datasets + entity key (discovery probe)
- [ ] Step 3: Derive the two queries
- [ ] Step 4: Write <id>.incident.yml (commented)
- [ ] Step 5: Dry-run validation
- [ ] Step 6: Capture the snapshot (run capture-incident)
- [ ] Step 7: Summarize + data-handling + Resources used report
```

### Step 1: Gather incident context

Collect everything about the incident from all available sources:

- The incident documentation the user pasted.
- The `rootly_incidents` index on the incident-data cluster — `rootly.title`,
  `rootly.summary`, the incident date, and `rootly.google_drive_url` (the RCA
  doc). Query it with the `elasticsearch-esql` skill (`node scripts/esql.js raw
"FROM rootly_incidents | WHERE ... | KEEP ..."`) or the `kibana-api` skill.
- The RCA doc at `rootly.google_drive_url` — read it if accessible.
- The Slack channel `#incident-<id>-...` via the Slack MCP — responders often
  post the log links, dashboards, and exact error strings there.

Extract: incident `id`, `title`, `date`, `slackChannel`, the **symptom** (however
the incident expresses it — error strings/image names like `"Failed to pull image"`
or `ImagePullBackOff`, and/or field predicates like `log.level == "ERROR"`,
`serverless.project.id`, `trace.id`, `log.logger`), and a candidate time window
bracketing the incident. Some incidents have no usable log trail (e.g. logs never
located) — if so, note it and stop; there is nothing to capture.

### Step 2: Find the datasets + entity key (discovery probe)

Two things to find: (a) which dataset the SYMPTOM lives in (to confirm the
incident + count hits + anchor the time window), and (b) an ENTITY key present
across ALL datasets that entity emitted (to scope the broad snapshot). The symptom
is often NOT in `container_logs` — image-pull failures live in `system.syslog`
(kubelet), OOM/breaker trips in `elasticsearch.server`, task failures in
`kibana.log`.

First, locate the symptom and its window. Adapt `FROM` and the `WHERE` predicate
to the incident (`LIKE`/`RLIKE`, `CONTAINS`, `STARTS_WITH`, `==`, `:`,
`IS NOT NULL`, `KQL(...)`):

```esql
FROM logs-* METADATA _index
| WHERE @timestamp >= "<gte>" AND @timestamp < "<lt>"
  AND <predicate matching the incident symptom>
| STATS count = COUNT(*), earliest = MIN(@timestamp), latest = MAX(@timestamp)
    BY data_stream.dataset, _index, serverless.project.id, host.name
| SORT count DESC
```

The extra `BY serverless.project.id, host.name` reveals the affected ENTITY. Then
probe by that entity (NOT the symptom) to enumerate every dataset it spans and
size the capture:

```esql
FROM logs-* METADATA _index
| WHERE @timestamp >= "<gte>" AND @timestamp < "<lt>"
  AND <entity predicate, e.g. serverless.project.id == "<id>" OR host.name IN (...)>
| STATS count = COUNT(*) BY data_stream.dataset
| SORT count DESC
```

From the results, record:

- the broad source index pattern — prefer `<clusterAlias>:logs-*` so the capture
  spans all datasets (CCS-prefixed for remotes; a YAML list only when the entity
  spans several remotes). Put it under `source.index`;
- the source cluster alias for provenance (segment before the first `:`, if any) —
  optional, may be a wildcard or omitted;
- the **entity key + value** that spans the datasets (feeds `query.snapshot`);
- the confirmed symptom hit count (feeds `snapshot.expectedSymptomDocCount`) and
  the entity-scoped TOTAL across datasets (feeds `snapshot.expectedDocCount`);
- the **first and last symptom `@timestamp`** — the overall `MIN(earliest)` and
  `MAX(latest)`. These anchor `query.timeRange` (Step 3). Use a wide enough initial
  `<gte>`/`<lt>` probe window that these are the true first/last hits, not clipped.

If the entity-scoped total is impractically large to reindex + snapshot, narrow
the entity set (fewer nodes) or tighten the window, and note the tradeoff in the
config header. This probe runs `node scripts/esql.js` against the Overview cluster,
using `ELASTICSEARCH_URL` / `ELASTICSEARCH_API_KEY` from the sourced `secrets.env`
(see Credentials). To probe `rootly_incidents` in Step 1, re-export that pair to
the `ROOTLY_ES_*` values first.

### Step 3: Derive the two queries

Both are **plain Query DSL query objects** — translate the incident's canonical
query (ES|QL / KQL / Lucene) into ANY equivalent DSL. There is no required shape:
use `query_string`, `match`/`match_phrase`, `term`/`terms`, `prefix`, `wildcard`,
`exists`, `range`, or a `bool` combining them — whatever expresses the filter. Do
NOT put the `@timestamp` range in either (the tool adds it from `query.timeRange`),
and translate only the `WHERE` — `STATS`/`KEEP`/`SORT`/`LIMIT` are display-only.

- **`query.symptom`** = the symptom filter (+ any noise filters), as whatever DSL
  matches the incident. This is the query that confirmed the incident in Step 2.
- **`query.snapshot`** = the ENTITY filter from Step 2 (e.g. `term` on
  `serverless.project.id`, or `terms` on `host.name`), with the symptom filter and
  noise-exclusion removed. This scopes the broad slice by entity so it spans all
  `logs-*` datasets that entity emitted. Use `{}` only to capture the whole
  `source.index` within the window. Do NOT drop `node-debug*`, `teleport*`, or
  `"Round trip completed"` here — that cleanup is only for the symptom query.

`query.timeRange` is required. Anchor it on the symptom timestamps from Step 2:

- `gte` = **1 hour before** the first symptom log (`MIN(earliest) - 1h`).
- `lt` = **1 hour after** the last symptom log (`MAX(latest) + 1h`).

The 1-hour buffers on each side capture the lead-up and recovery context around
the incident. When the incident's query has no `@timestamp` bound (it scopes by
fields like `serverless.project.id`/`trace.id` instead) and Step 2 yields no
symptom timestamps, fall back to a sensible window from the incident date / RCA.

See [field-mapping.md](field-mapping.md) for translating each ES|QL / KQL operator
(`CONTAINS`, `STARTS_WITH`, `LIKE`, `==`, `:`, `IS NOT NULL`, `KQL(...)`) into Query
DSL, plus the multi-index, twinned-remote, and frozen-index notes.

### Step 4: Write the config

Write `<id>.incident.yml` from [template.incident.yml](template.incident.yml).
The file is the deliverable — a human-readable, COMMENTED YAML:

- A header comment block summarizing the incident: title, date, severity,
  summary, root cause, resolution, RCA doc link, Slack channel.
- Inline comments explaining the `symptom` (narrow, stored for replay) and
  `snapshot` (broad, full logs, snapshotted) queries — both Query DSL — and why
  noise is kept.

Set `source.index` (broad `<remote>:logs-*`, plus `source.exclude` for
unreadable/huge datasets) / `source.cluster` from Step 2, both queries from
Step 3, and `snapshot.expectedSymptomDocCount` (+ optional `expectedDocCount`
TOTAL) from the probe. There is no `dest` block — captured indices keep their
original data-stream names. YAML comments are ignored by the loader, so they are
safe.

### Step 5: Dry-run

```bash
node scripts/es_snapshot_loader capture-incident \
  --config <path-to-<id>.incident.yml> \
  --es-url "$LOCAL_ES_URL" \
  --dry-run
```

Confirm the printed reindex body reflects the BROAD `query.snapshot` filter (only
the time range when it is empty), and that prerequisites pass.

### Step 6: Capture the snapshot

Once the dry-run looks right, run it for real to reindex the broad slice and
snapshot it to GCS:

```bash
node scripts/es_snapshot_loader capture-incident \
  --config <path-to-<id>.incident.yml> \
  --es-url "$LOCAL_ES_URL"
```

Prerequisites (see the capture-incident README): `OVERVIEW_API_KEY` is set (from
`secrets.env`), the source host is in the local ES `reindex.remote.whitelist`,
and the GCS credentials from `$GCS_CREDENTIALS_FILE` are loaded into the local ES
keystore. If a prerequisite fails, report the exact error — do not silently skip.

### Step 7: Summarize + data-handling note

Report: the symptom hit count (from the Step 2 probe), the total snapshotted doc
count and its per-index breakdown (`captured_indices` / `doc_counts`, the indices
named after their original source data streams), the snapshot name, and the GCS
path. Because the broad `query.snapshot` slice
includes raw production noise across every dataset, flag any anonymization /
data-handling that the destination requires before the snapshot is shared or used
in evals.

Then end the reply with a **Resources used** report so the user can confirm the
work touched the right sources — and see anything that failed or was skipped
(transparency matters: never hide a failed lookup, command, or a guessed value).
List each source/step with its status:

```
Resources used
- rootly_incidents (<ELASTICSEARCH_URL / cluster>): <ok — pulled title/date/RCA | FAILED: <error> | skipped: <why>>
- RCA doc (<url>): <ok — read | FAILED: <error> | skipped: no access>
- Slack #incident-<id>-... (Slack MCP): <ok — N messages | FAILED: <error> | skipped>
- Log probe (<ELASTICSEARCH_URL>, index <pattern>): <ok — <n> symptom hits in <dataset> | FAILED: <error>>
- Dry-run validation: <ok | FAILED: <error> | not run>
- Snapshot capture (<LOCAL_ES_URL> -> GCS <gcs path>): <ok — <n> docs, snapshot <name> | FAILED: <error>>

Any field in <id>.incident.yml derived from the pasted docs rather than a live
lookup (because a source failed or was unavailable) — call it out here so the
user knows what to double-check.
```

## Reference files

- [template.incident.yml](template.incident.yml) — copyable, fully-commented
  two-query config.
- [field-mapping.md](field-mapping.md) — incident query → config field mapping,
  ES|QL/KQL → Query DSL operator translation, and caveats.
