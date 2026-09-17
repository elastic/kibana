# ADR-0003 — Name addressing and shared step-child traversal

**Status:** Superseded by ADR-0007
**Date:** 2026-09-16
**Deciders:** @elastic/workflows-eng

## Context

### Name addressing

The POC uses `WorkflowStepInsertPath`, a positional address computed from one render and carried across the React/Redux boundary:

```ts
type WorkflowStepInsertPath = {
  parentStepName: string | null;
  branchKey: string;
  index: number;
};
```

This is fragile: the index is computed from one render and applied to a document that may have changed (by another tab, by a concurrent edit, by the debounced recompute arriving during the gesture). A step inserted between renders can silently shift the index.

The graph already owns the authoritative node-id → step-name map in `TransformResult.nodeRefs`. Step names are stable across rerenders as long as the user has not renamed the step — and `yaml_edit`'s `getStepNode` already addresses by name.

### Traversal inconsistency

Four pairwise-inconsistent child-slot enumerations exist:

| Enumeration | `steps` | `else` | `branches[]` | `cases[]`/`default` | `on-failure.fallback` | `iteration-on-failure` |
|---|---|---|---|---|---|---|
| `graph_layout/walk_step_tree.ts` `visitStepChildren` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `compute_topology_fingerprint.ts` `walkStepsWithSlot` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kbn-workflows-yaml` `NESTED_STEP_KEYS` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `transform_workflow_to_graph.ts` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

`getStepNode`'s `findInNode` descends only `isNestedStepKey` pairs (the `kbn-workflows-yaml` enumeration), so **`insertStep(yaml, step, '<a step inside a switch case>')` fails today** with `Step "..." not found` — the chosen mutation primitive cannot address a third of the graph.

## Decision

### Name addressing

Every graph gesture is addressed by step name, not by a positional path. The insertion context type:

```ts
type WorkflowGraphInsertionContext =
  | { mode: 'trigger' }
  | { mode: 'after';    stepName: string }
  | { mode: 'branch';   stepName: string; branch: BranchSlot }
  | { mode: 'fallback'; stepName: string };
```

`mode: 'branch'` is the one gesture that is not "after a step" — it addresses a bypass-lane node, giving those synthetic nodes a legitimate meaning (head of an empty branch) rather than an exclusion.

### Shared traversal

Extend `visitStepChildren` in [`walk_step_tree.ts`](../../../../packages/shared/kbn-workflows/graph_layout/walk_step_tree.ts) — the most complete of the four enumerations — with `on-failure.fallback` and `iteration-on-failure`, and give each callback its slot identity so callers can distinguish "case 2 of switch X" from "the `then` of if Y".

`kbn-workflows-yaml` imports this function and deletes `NESTED_STEP_KEYS`. `compute_topology_fingerprint.ts`'s `walkStepsWithSlot` and `transform_workflow_to_graph.ts` both route through it.

This lands as **spec 00** rather than inside spec 02, because changing what counts as a nested key affects `getStepNode`'s `findInNode` recursion, `buildWorkflowLookup`, and validation — non-graph consumers that deserve independent review.

## Alternatives considered

**Positional addressing (keep the POC's `WorkflowStepInsertPath`).** Rejected: brittle under concurrent edits and the debounced recompute cycle. Names survive recompute; indices don't.

**Path addressing (`steps[0].then[1]`).** Rejected: same brittleness as positional; also requires a path parser in the mutation layer.

**Keep four separate enumerations.** Rejected: any new slot (e.g., `iteration-on-failure`) must be added to all four. The known discrepancy between `NESTED_STEP_KEYS` and `visitStepChildren` already causes `insertStep` to fail for switch-case steps.

## Consequences

- `insertStep` can now address any step in the tree, including switch cases and parallel branches.
- The unique-naming requirement (ADR-0001's spec 04) is load-bearing: name addressing is only sound with unique names. `uniqueStepName(base, taken)` must be applied at insert time.
- Changing `visitStepChildren` changes what `buildWorkflowLookup` reports — review must include validation and the lookup, not only the graph.
- `workflowLookup.steps[x].branchKey` can now express a switch case rather than collapsing to `'steps'`.
