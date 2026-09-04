# Data-stream execution storage: maturity

**Status:** Do not ship. Keep opt-in (`workflowsExecutionEngine.storage.source: data_stream`). Default stays `plain_index`.

**Date:** 2026-09-03

---

## Call

Do not move forward with data-stream storage as the execution store. Local / opt-in testing is useful. Flipping the default or treating this as the migration path is not.

Execution documents are a **mutable** workload: status, cursor, step IO, many writes per run. Data streams are **append-only**. Logs and trigger events belong there. This adapter is trying to make an append-only store behave like an index (version cache, upsert→create, backing-index updates, soft delete). That pattern can work. This one is not there yet.

---

## How upsert actually works

The step repository always sends `operation: 'upsert'`.

On a **plain index**, `sharedBulk` turns that into `update` + `doc_as_upsert`, which can create or patch.

On a **data stream**, `DataStreamDataClient` rewrites first:

- version found → `update` on the backing index
- version **not** found → `create` on the stream

`create` cannot patch. If the version lookup misses and the document already exists, Elasticsearch returns `version_conflict_engine_exception` / `document already exists (current version [1])`. Until 2026-09-03, `sharedBulk` retried that same `create`, which cannot succeed.

That is not a SHA-256 collision. Step execution IDs are deterministic (`executionId` + scope path including foreach index + `stepId`). Foreach iterations get distinct IDs. The failure is create-on-existing-id.

A large-payload foreach hits this because the persistence loop (every 500ms) and the execution path can flush at the same time. Both miss the version cache, both `create`. The second bulk dies. Large payloads widen the window.

Mitigations now in tree (still unproven in production):

1. Serialize `flushStepChanges` so overlapping flushes do not both drain-and-create the same new step docs.
2. On create-already-exists, mget the backing index named in the ES error and retry as `update` with `if_seq_no` / `if_primary_term`.

That closes one hole. These remain.

---

## What is actually fine

- Single-node happy path after the create→update fallback: create, then update via the version cache.
- Dual-read from the old `.workflows-executions` / `.workflows-step-executions` indexes (`additionalIndexesToQuery`).
- Template retention (`dataRetention`, default `90d`).

---

## Blockers

### Will break on real product paths

- **Delete is a soft `deleted: true` flag.** Search/get never filter it. Deleting a workflow leaves executions visible.

### Not production-shaped

- **`DataStreamDataClient` has no unit tests.** Plain index does. The client that does the hard rewrite is untested except the bulk retry added with the create→update fallback.
- **Mapping rollover covers logs and events, not execution/step streams.** `ensureWorkflowsDataStreamsRolledOver` does not include `.workflows-executions-data-stream` / `.workflows-step-executions-data-stream`. Mapping changes will not roll.
- **`getByIds` only mgets the last two backing indexes**, then a non-realtime search. Resume after rollover can miss.

Engine integration tests mock the repositories. There is no ES-backed data-stream coverage for the execution loop.

---

## What is needed before this is a real option

1. Filter `deleted` on search and get, or stop pretending soft-delete is delete.
2. Unit tests on `DataStreamDataClient` (create/update rewrite, version lookup, delete, getByIds across backing indexes).
3. Include execution/step streams in mapping-version rollover.
4. Mget all backing indexes (or otherwise make get-by-id realtime after rollover), not only the last two plus a refresh-dependent search.

Until then: opt-in only. Do not flip `storage.source` default.
