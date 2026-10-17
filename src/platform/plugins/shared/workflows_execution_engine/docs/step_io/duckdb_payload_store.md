# DuckDB (or SQLite) as Per-Execution Payload Store

An alternative to in-process LRU caching for step IO: store step outputs in an
embedded analytical database local to the Kibana process. The engine queries
for only the specific JSON fields each template needs, so V8 never holds the
full payload — it only receives the projected slice.

```
step writes output:
  INSERT INTO steps(id, output) VALUES (?, json(?))

context read:
  SELECT json_extract(output, '$.aggregations.by_rule.buckets')
  FROM steps WHERE id = ?
```

## What this eliminates

Everything the LRU approaches eliminate, plus V8 heap pressure entirely. The V8
heap holds only the extracted slice, not the full payload tree. No eviction
mechanism is needed because the database manages its own buffer pool.

## Where it gets complicated

**1. Async context reads.**  
DB reads are async. Context evaluation must be synchronous, so reads must be
pre-warmed before evaluation starts. The `prepareForRead` pattern is still
needed, just targeting DuckDB instead of ES. Static analysis already exists
(`extractReferencedStepIds`) and gives the exact JSON paths needed — those paths
feed directly into the projection query, so no new analysis layer is required.

**2. Durability and resume.**  
DuckDB's file is process-local. On Kibana restart or task boundary (workflow
suspend/resume), the file is gone. Step outputs must still be persisted to ES
for durability. The persistence path to ES therefore remains — DuckDB is a
read-optimised local store, not a replacement for ES. Writes go to both: DuckDB
for the current execution's hot reads, ES for durable storage.

Resume works the same as with LRU: metadata is loaded, IO fields are not. As
steps execute, outputs are fetched from ES on demand and inserted into DuckDB.
Subsequent references to the same output are DuckDB hits with projection, never
ES round-trips.

**3. Concurrency model.**  
DuckDB supports multiple concurrent readers but a single writer per connection.
Parallel step branches write outputs concurrently. A write queue or connection-
per-writer strategy is needed. The existing `pendingIoChanges` + periodic
`flush()` pattern in `StepIoService` already serialises writes and could be
adapted — DuckDB accepts batched inserts, so the flush loop maps naturally.

**4. File I/O per execution.**  
Each workflow execution gets its own DuckDB file (or a shared file with
execution-scoped tables). Files must be created on execution start and cleaned
up on completion/resume-handoff. This is manageable but adds operational surface
(disk space tracking, cleanup on crash recovery).

## Why DuckDB over SQLite here

SQLite is the obvious embedded DB and was proposed in
[security-team#17743](https://github.com/elastic/security-team/issues/17743).
SQLite's JSON functions (`json_extract`) exist but are less capable than
DuckDB's — DuckDB has first-class `STRUCT`, `LIST`, and JSON path extraction
that aligns well with nested workflow output shapes. For read-mostly,
analytical-style path projections on semi-structured data, DuckDB's query
planner is a better fit. SQLite is better for frequent small key-value reads
where projection is not the goal.

## Verdict

Strongly compelling for memory reduction when step outputs are large (MB-scale
connector responses, large ES query results). The key claim — static analysis
already extracts the needed paths, DuckDB on-disk stores the full payload, V8
only receives the projected slice — holds up. Full outputs never enter the V8
heap. No eviction mechanism needed. The TOCTOU class is eliminated.

The cost is operational: a new npm dependency, DuckDB file lifecycle, write
serialisation, and the persistence path to ES remains for durability.

This approach is complementary to the LRU variants in
`eviction_rehydration_simplification.md` — build either LRU variant first, then
add DuckDB projection as a drop-in replacement for the fetch-from-ES path if
large-payload OOM pressure demands it.
