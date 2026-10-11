# Eviction / Rehydration Bugs — Root Cause Analysis

Issues in the `@contextual-security-project` board related to the `StepIoService`
eviction and rehydration mechanism. All six bugs share the same architectural
pressure: the rehydration planner must perfectly predict *which* step outputs to
fetch from ES *just-in-time*, under a concurrent background eviction loop, across
fresh runs, loop iterations, and task-resume paths.

---

## Issues

| Issue | Repo | Status | Title |
|-------|------|--------|-------|
| [security-team#17766](https://github.com/elastic/security-team/issues/17766) | security-team | CLOSED | `foreach` over an evicted large step output yields a blank item (TOCTOU eviction race) |
| [security-team#17768](https://github.com/elastic/security-team/issues/17768) | security-team | CLOSED | `while` loop over an evicted large source crashes / exits early |
| [security-team#17494](https://github.com/elastic/security-team/issues/17494) | security-team | CLOSED | Workflow `foreach.item` blanks after output eviction |
| [kibana#277820](https://github.com/elastic/kibana/issues/277820) | kibana | CLOSED | `foreach` reads `undefined` for output evicted between an `if:` guard and loop entry |
| [security-team#17554](https://github.com/elastic/security-team/issues/17554) | security-team | CLOSED | Parent workflow cannot read child output after resume (stale rehydration) |
| [security-team#17743](https://github.com/elastic/security-team/issues/17743) | security-team | **OPEN** | [Discuss] Use `node:sqlite` as per-execution step IO cache to replace eviction entirely |

---

## Root Cause 1 — TOCTOU race between the background eviction loop and context reads

**Issues:** #17766, #17768, #277820

The persistence/eviction loop fires every ~500 ms as a background macrotask.
Each step calls `prepareForRead()` before building its context.

**The race:**

```
prepareForRead() → sees nothing evicted → fast-path return (no ES call)
  ↑ macrotask gap ↑
eviction loop fires → evicts source output from memory
  ↓
step re-evaluates source expression synchronously → output is gone → undefined / blank
```

The synchronous context reads (`buildForeachContext`, `ExitWhileNodeImpl`
condition re-eval) happen *after* `prepareForRead` returns. If the eviction loop
fires in that 500 ms window, the source is gone by the time the code reads it.

**Manifestations:**

- `foreach` blank `foreach.item` (#17766): source evicted between one iteration's
  `prepareForRead` and the next iteration's `buildForeachContext` re-evaluation.
- `while` crash / early exit (#17768): condition source evicted between
  `prepareForRead` (saw nothing → skipped) and the synchronous condition re-read.
- `if:` guard → `foreach` entry gap (#277820): the guard rehydrated the output;
  eviction fired in the 2–3 s gap before the foreach node established its own pin
  at loop entry.

**Fix in codebase:**

- Loop-lifetime pin (`pinnedOutputIdsByScope`,
  [`step_io_service.ts:201`](../server/workflow_context_manager/step_io_service.ts#L201))
  set unconditionally at loop entry (`pinLoopSource`).
- Read-pins are set **before** the fast-path early-return
  ([`step_io_service.ts:661`](../server/workflow_context_manager/step_io_service.ts#L661))
  so even a currently-resident output is protected during the async gap.

---

## Root Cause 2 — Static analysis blind spots in `extractReferencedStepIds`

**Issues:** #17494, #17768

The rehydration planner statically scans node templates to determine which
predecessor outputs to fetch. It had two gaps.

**Gap A — KQL-format conditions were invisible.**  
`scanForTemplateVariables` only reads Liquid `{{ }}` expressions. Many workflow
conditions are bare KQL (e.g. `steps.get_topologies.output._source.keep : true`).
With no `{{ }}` markers, the scanner returned an empty reference set. The
conservative fallback (`fallbackToPredecessors`) only fires when *some* predecessor
is already evicted — if the referenced step was still resident, the fallback was
skipped and the dependency was silently missed.

**Gap B — Fields rendered outside `node.configuration` were invisible.**  
Analysis originally scanned only `configuration`. Two node shapes stored
renderable fields elsewhere:

- `exit-while.condition` is a top-level graph node field, not under `configuration`.
- `switch` `case[].match` templates are rendered by `EnterSwitchNodeImpl` at
  runtime but are not in the node's `configuration`.

**Fix in codebase:**

[`extractReferencedStepIds`](../server/workflow_context_manager/extract_referenced_step_ids.ts#L76)
now:

1. KQL-parses condition strings for all `CONDITION_BEARING_NODE_TYPES`
   ([`extract_referenced_step_ids.ts:20`](../server/workflow_context_manager/extract_referenced_step_ids.ts#L20)).
2. Scans the **full graph node object** (not just `configuration`) so top-level
   fields like `exit-while.condition` are picked up automatically
   ([`extract_referenced_step_ids.ts:104`](../server/workflow_context_manager/extract_referenced_step_ids.ts#L104)).

---

## Root Cause 3 — Loop pin was Liquid-only, pinning nothing for bare-KQL `while` conditions

**Issues:** #17768

`pinLoopSource` (née `pinForeachSource`) extracts referenced step IDs from a
loop's source expression to decide what to keep resident. When first introduced for
`foreach`, it used only Liquid scanning. For `while` loops with bare-KQL
conditions this resolved to an empty set — the pin was a no-op and the source
could still be evicted mid-loop even while the pin appeared to be active.

**Fix in codebase:**

`pinLoopSource`
([`step_io_service.ts:702`](../server/workflow_context_manager/step_io_service.ts#L702))
now calls `extractReferencedStepIdsFromConditionValue` for string source values,
which runs both KQL and Liquid parsing, so bare-KQL `while` conditions are pinned
correctly.

---

## Root Cause 4 — Stale rehydration on task resume overwrites a freshly-written output

**Issues:** #17554

On resume, `load()` calls `markDeferredAfterLoad()`, which marks all non-pinned
step executions as evicted. If a `workflow.execute` step then completes and writes
the child output in-memory *before* the next step's `prepareForRead` runs,
`prepareForRead` sees the step as "evicted" and fetches its doc from ES — but ES
may still have the pre-child-output version if the flush hasn't landed yet. The
freshly-written in-memory value is overwritten by the stale ES doc.

**Fix in codebase:**

`setStepOutput`
([`step_io_service.ts:388`](../server/workflow_context_manager/step_io_service.ts#L388))
calls `clearEvicted` before writing — a freshly-written output is never considered
evicted, so `prepareForRead` will not attempt an ES fetch for it.
`forgetTransientRehydration` prevents the deferred transient-release from
re-evicting it before the flush lands.

---

## Summary table

| Bug | Where the plan went wrong |
|-----|--------------------------|
| TOCTOU race (#17766, #17768, #277820) | Eviction fired *after* the plan ran, before the read |
| KQL blind spot (#17494, #17768) | Planner didn't see the reference — it only spoke Liquid |
| Loop pin Liquid-only (#17768) | Pin resolved to empty set for bare-KQL `while` |
| Stale resume rehydration (#17554) | Plan fetched from ES when fresh in-memory data already existed |

---

## Architectural context

All fixes are local patches to the same ~1300-line orchestration layer in
[`step_io_service.ts`](../server/workflow_context_manager/step_io_service.ts).
The open discussion ticket
[security-team#17743](https://github.com/elastic/security-team/issues/17743)
proposes replacing the ES round-trip mechanism with a `node:sqlite` per-execution
IO cache. A local file-backed store would eliminate the need for precise static
reference analysis and make the TOCTOU window irrelevant — the entire class of
bugs described here would become structurally impossible.
