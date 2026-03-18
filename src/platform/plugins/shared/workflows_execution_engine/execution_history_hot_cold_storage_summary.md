# Summary: Tiered Execution State & History Architecture

## Problem

The workflow execution engine currently stores all execution data (active + historical) in two flat Elasticsearch indexes. This leads to unbounded growth, degrading query performance, and the only cleanup option (`delete_by_query`) is expensive.

### Document relationships

A **workflow execution** is the top-level orchestrator document. Each workflow execution owns many **step execution** documents (one per step run — including multiple executions of the same step in loops or retries). Both document types share the same lifecycle (pending, running, completed, failed, cancelled) and largely the same fields.

The workflow execution document maintains a `stepExecutionIds` array — an ordered manifest of all its child step execution IDs. Step execution IDs are deterministic (SHA-256 of `executionId + scopePath + stepId`), so they are known upfront without searching. This enables loading the entire execution tree (workflow + all steps) in a single `mget` call using only the workflow document's data.

All updates to workflow and step execution documents are sequential — the execution engine processes steps one at a time, so there are no concurrent writes to the same execution's documents. Documents are written via upsert (create-or-update), as the execution engine needs to both create new documents and update existing ones through the same write path.

## Proposed solution

Split storage into two tiers — **execution state** and **execution history** — following a CQRS-like pattern:

1. **Execution state** (regular ES index, `.workflows-execution-state`) — A single mutable index holding all **active** workflow and step execution documents (unified by a `type` field). Supports upsert, delete, and `mget`. The execution engine reads/writes here exclusively during execution. This index stays small because completed executions are migrated out.

2. **Execution history** (two append-only ES data streams) — Completed workflow and step executions are stored in separate data streams with ILM-managed retention. Optimized for time-series queries, reporting, and auditing.

3. **Automated migration** — A single scheduled Task Manager task (daily by default) reindexes terminal executions from the state index into the history data streams, then cleans them up from the state index after a safety delay (2x the lifecycle interval). The process is idempotent and safe against partial failures.

## Key design decisions

- **Single unified state index** instead of two separate indexes for workflows and steps — enables single `mget` calls, single bulk upserts, and simpler cleanup.
- **Data streams rejected for active state** — they don't support updates or `mget`, both of which the execution engine requires for correctness (not just performance).
- **Event sourcing rejected** — unbounded events per execution, consumers need materialized objects, and replaying event logs on every read is not viable at execution-engine frequency.
- **Cross-tier querying** — Get-by-ID uses a waterfall (check state first, fall back to history). Search queries span both tiers in a single ES call with field collapsing for dedup during the overlap window.

## Trade-offs

- Increased query complexity (two tiers + dedup logic vs. single index).
- Eventual consistency for history (configurable delay, default 1 day, before completed executions appear in history data streams).
- Additional infrastructure (two data streams, a scheduled task, a separate state index).

## Open questions

- Tuning the lifecycle interval (default `1d` — too aggressive or too conservative?).
- Large step input/output/error fields (pre-existing concern, not introduced by this architecture).
- Data stream mapping evolution (new searchable fields require explicit mapping + version bump).
- Catch-up reindex behavior after extended Task Manager downtime.
