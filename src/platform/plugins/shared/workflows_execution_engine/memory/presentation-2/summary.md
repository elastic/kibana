# Summary: Rolled-Over Execution Indexes with ILM

## Problem

The workflow execution engine currently stores all execution data (active + historical) in two flat Elasticsearch indexes. This leads to unbounded growth, degrading query performance, and the only cleanup option (`delete_by_query`) is expensive.

### Document relationships

A **workflow execution** is the top-level orchestrator document. Each workflow execution owns many **step execution** documents (one per step run — including multiple executions of the same step in loops or retries). Both document types share the same lifecycle (pending, running, completed, failed, cancelled) and largely the same fields.

The workflow execution document maintains a `stepExecutionIds` array — an ordered manifest of all its child step execution IDs. Step execution IDs are deterministic (SHA-256 of `executionId + scopePath + stepId`), so they are known upfront without searching. This enables loading the entire execution tree (workflow + all steps) in a single `mget` call using only the workflow document's data.

All updates to workflow and step execution documents are sequential — the execution engine processes steps one at a time, so there are no concurrent writes to the same execution's documents. Documents are written via upsert (create-or-update), as the execution engine needs to both create new documents and update existing ones through the same write path.

## Proposed solution

Replace flat indexes with **rollover aliases backed by ILM (Index Lifecycle Management)**. The core execution logic (upserts, separate workflow/step indexes) stays unchanged — only the underlying index infrastructure evolves.

## Key design elements

1. **Rollover aliases** — An alias points to a series of time-based backing indexes (e.g., one per day). ILM automatically creates new backing indexes and manages lifecycle transitions (hot -> warm -> cold -> delete).

2. **Index pinning** — When a workflow execution starts, the current write index is resolved and "pinned" to that workflow execution document. All documents for that workflow execution (workflow/step doc) always land in the same backing index, even if a rollover happens mid-execution.

3. **Encoded execution IDs** — Execution IDs embed the backing index suffix, enabling direct O(1) document lookups without searching across all indexes. The execution engine's hot path never needs search queries.

4. **ILM lifecycle** — Data automatically ages through phases (hot/warm/cold/delete) with no application-level cleanup tasks needed. Exact thresholds and retention periods are to be decided with the product team.
