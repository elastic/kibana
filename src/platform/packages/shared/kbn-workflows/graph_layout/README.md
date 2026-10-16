# `graph_layout/` — Workflow logical-graph construction

This directory builds the **logical graph** used by the read-only visualisation editor.
It is framework-free (no React, no Redux) and accepts a raw `WorkflowYaml` definition as input.

See [`CONTEXT.md`](../CONTEXT.md) for domain terminology (logical graph, node refs, bypass lane
nodes, layout key, etc.).

---

## Layout pipeline

```
WorkflowYaml
  → transformWorkflowToGraph()     # domain → logical graph  (nodes, edges, nodeRefs)
  → dagLayout()                    # logical graph → positioned graph   (@kbn/dag-layout)
  → useWorkflowLayout()            # positioned graph → ReactFlow nodes + edges (via workflow_layout_pipeline)
  → WorkflowGraphCanvas            # ReactFlow render
```

---

## Adding a new flow-control (structural) step type

Structural steps (control-flow steps such as `if`, `foreach`, `switch`, …) require updates
across **seven touch-points** to keep the graph, traversal, and execution
semantics in sync. Work top-down through this checklist.

### 1 · Schema — `spec/schema.ts`

Declare `XStepSchema` (the zod shape) and a `getXStepSchema(stepSchema, loose)` builder, then
add the new type to the `StepSchema` union. The `Step` type in that file derives from the union.

### 2 · Types — `graph_layout/types.ts`

- If the step renders as a **container group** (like `foreach`/`while`): add to
  `CONTAINER_STEP_TYPES`.
- If it introduces new visual node kinds beyond `'step' | 'trigger' | 'foreachGroup'`:
  extend `PreLayoutNodeBase.type`.
- If it needs new edge branch-label semantics: extend `EdgeBranchType`.

### 3 · Child-slot traversal — `graph_layout/walk_step_tree.ts`

Add the new child-property slot to `StepChildSlot` / `visitStepChildSlots` (and
`STEP_CHILD_CONTAINER_KEYS`). `visitStepChildSlots` is the single source of truth for "which
properties hold nested steps"; `walkStepTree` is built on it. Without it, the graph transform and
tree walkers won't recurse into the new step's children.

### 4 · Graph transform — `graph_layout/transform_workflow_to_graph.ts`

Choose one of two paths based on the step's rendering model:

| Rendering model | Where to add |
|---|---|
| **Container group** (step body shown as an EUI panel, children laid out inside) — like `foreach`/`while` | Add type to `CONTAINER_STEP_TYPES` (step 2); `transformInternal` recurses automatically. |
| **Diamond / branching** — like `if`/`switch`/`parallel` | Add an explicit `else if (step.type === 'x')` arm alongside the existing `if` / `parallel` / `switch` / `merge` arms in `transformInternal`, defining: edge labels, `branchType`, bypass-lane synthesis for missing branches. |

Bypass-lane nodes (1×1 invisible nodes) are synthesised by the bypass-lane helper in
`transformInternal` when a branch has no steps. They keep dagre's lane allocation balanced. Always synthesise one
for each missing optional branch.

### 5 · Step icon — `kbn-workflows-ui/src/components/step_icons/get_step_icon_type.ts`

Add icon case(s) to `getStepIconType`, including the "flow control nodes" block that covers the
execution-engine `enter-*`/`exit-*` node kinds the debug graph emits. The visualisation editor's
step and foreach-group nodes both resolve their icon through `getStepIconType`, so there is a
single icon map to update.

### 6 · ReactFlow node registry — `kbn-workflows-ui/.../workflow_graph_canvas.tsx`

If you introduced a new visual node `type` in step 2 (beyond `step`, `trigger`,
`foreachGroup`, `bypassLane`), register its React component in `NODE_TYPES`.

### 7 · Execution-engine graph — `graph/build_execution_graph/build_execution_graph.ts`

A structural step with real execution semantics needs `Enter*`/`Exit*` node kinds in the
separate **execution-engine IR** (this graph is distinct from the logical graph — see
`CONTEXT.md`). The existing `Enter*`/`Exit*` imports show the pattern.

---

## Notes for the future

Steps **3 and 4** share child-slot logic across two files. A future **step-type registry** of
the shape `{ childSlots, renderKind, icon, edgeLabelStrategy, isContainer }` could collapse them
into a single declaration per type, with `CONTAINER_STEP_TYPES` derived automatically. This is
out of scope today — the checklist above is the lightweight interim that keeps the seven
touch-points discoverable.
