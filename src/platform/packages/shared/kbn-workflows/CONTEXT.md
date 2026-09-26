# Workflows domain glossary

This file is the canonical vocabulary for the `@kbn/workflows` package family and the `workflows_management` plugin. It is a glossary only — no implementation detail, no spec content. Link here from READMEs and ADRs when introducing a term; update it when a term sharpens.

> This file was linked (but not yet written) by [`graph_layout/README.md`](graph_layout/README.md#L6), which declares its scope: _"logical graph, node refs, bypass lane nodes, topology fingerprint"_. That scope is preserved and extended below.

---

## Core graph concepts

**logical graph**
The output of `graph_layout/transform_workflow_to_graph.ts`. A placement-independent description of nodes and edges derived from the workflow YAML. Does not know about pixel coordinates. Distinct from the _execution graph_.

**execution graph**
The output of `graph/build_execution_graph/build_execution_graph.ts`. A compiled step graph used by the execution engine. The `EnterTryBlock`/`ExitTryBlock` diamond pattern for `on-failure.fallback` lives here, not in the logical graph.

**topology fingerprint**
A stable hash of the logical graph's shape (node ids, edges, branch structure). Used as the memo key for `useWorkflowLayout`; recomputed by `compute_topology_fingerprint.ts`. Layout is recalculated only when the fingerprint changes.

**node ref**
An entry in `TransformResult.nodeRefs` mapping a graph node id to a workflow step name and position. The canonical bridge between the rendering layer (which knows node ids) and the mutation layer (which knows step names).

**bypass lane node**
A synthetic node with no corresponding YAML step, emitted by `transform_workflow_to_graph.ts` when a branch of an `if`/`switch`/`parallel` is empty. It renders as a dashed placeholder. _Not_ excluded from all operations: a bypass-lane node is a legitimate insertion target (its position in the graph encodes which empty branch it heads) and maps to `{ mode: 'branch', stepName: '<owner>', branch: BranchSlot }` in `WorkflowGraphInsertionContext`.

**lane**
The cross-axis extent occupied by the nodes reachable exclusively via **one out-edge of a fork**,
within one laid-out graph. A fallback owner is a fork: its spine edge and its failure edge each
have a lane, even though only the latter is a child slot.

Lanes of one fork are **ordered** in slot declaration order (the order the slot's edge appears in
the graph's edge list), not dagre's output. That order is enforced only between boxes that share a
rank band — lanes occupying disjoint ranks may interleave on the cross axis. Lanes are **not**
disjoint intervals.

A lane is not a set of nodes: nodes reachable from more than one sibling lane (joins) belong to no
lane. `bypass lane node` and `fallback lane` are specialisations.

**isMerge (edge property)**
An _edge_ tag, not a node type. Set to `true` on edges whose target has in-degree > 1 **and** whose source is a bypass-lane node or a fallback-lane leaf (i.e., edges that participate in the fan-in matching a synthetic fork bus). Computed in `use_workflow_layout.ts`; drives `buildMergeBusPath` routing. There is no join node in the logical graph — `transform_workflow_to_graph.ts` wires branch leaves directly to the next sibling via `exitIds = dedupeIds(branchExits)`. Widening this to plain in-degree > 1 is deferred (ADR-0012; the nested-`continue` rejoin is the motivating shape, tracked in [security-team#19542](https://github.com/elastic/security-team/issues/19542)).

**container step**
A step whose body renders as a group box on the canvas. The set is `CONTAINER_STEP_TYPES = new Set(['foreach', 'while'])`. The React Flow node type literal `'foreachGroup'` is a legacy misnomer: it also covers `while` steps.

**container members vs container descendants**
`ForeachGroup.innerNodes` holds **members** — the direct children of the container's body. A nested container (a `foreach` inside a `foreach`) contributes its *container node* to the parent's `innerNodes` and pushes its own body as a **sibling** entry in `foreachGroups` (see `transform_workflow_to_graph.ts`). Any layout pass that moves a container must carry **all descendants** transitively (the `containerDescendants` closure from `buildContainerDescendants`), not just members. Carrying only members moves the nested container node while leaving its body behind, displacing grandchildren by the shift delta and rendering them outside their box.

**fork head**
A direct target of a source node with two or more outgoing spine edges, where the target is *not* reachable from any sibling target. Fork heads are mutually exclusive branch heads and are aligned onto a shared main-axis rank by §3.5 of `layout_graph_with_lanes.ts`. A node that *is* reachable from a sibling target is a **transitive successor** of that sibling and must not be aligned — aligning it collapses two ranks and destroys the non-overlap guarantee.

---

## Authoring concepts (inline graph editing)

**port**
The interactive attachment point on a node: a rest dot, an expanded blue pin, and a hit box. This is the affordance the user interacts with. A port _renders_ one or more ReactFlow `Handle` primitives but is not the same thing.

**handle**
Strictly the ReactFlow `<Handle>` primitive. Every port renders at least one handle. Named handles (`then` / `else` / `step` / `fallback`) are required once a node has more than one handle of a given type.

**anchor step**
The step that an insertion is addressed _relative to_ in `WorkflowGraphInsertionContext`. Always qualified ("the anchor step"), never bare "anchor" (to avoid confusion with the retired POC concept `WorkflowGraphAnchorRect`, which is dead scope).

**`BranchSlot`**
The subset of `StepChildSlot` that a user can address as a branch:
`Extract<StepChildSlot, { kind: 'steps' | 'else' | 'branch' | 'case' | 'default' }>`. Excludes
`fallback` and `iteration-fallback`, which `WorkflowGraphInsertionContext` addresses via
`mode: 'fallback'`. Used as the `branch` field in the `mode: 'branch'` insertion context.

**`WorkflowGraphInsertionContext`**
The typed address for a graph gesture:
```ts
type WorkflowGraphInsertionContext =
  | { mode: 'trigger' }
  | { mode: 'after';    stepName: string }
  | { mode: 'branch';   stepName: string; branch: BranchSlot }
  | { mode: 'fallback'; stepName: string };
```
`mode: 'after'` covers any flow port. `mode: 'branch'` addresses the head of an empty branch (the bypass-lane node). `mode: 'fallback'` addresses the red failure port.

**snippet**
Generated step YAML produced by `generateBuiltInStepSnippet` / `generateConnectorSnippet`. Not "template" (that term is taken by the POC's out-of-scope template-recommendation feature) and not "fragment".

**`canAuthor`**
The single boolean gate for all graph editing affordances: `!useWorkflowEditorReadOnly() && definition !== undefined`. Ports vanish (not gray out) when false.

---

## Fallback / failure concepts

**fallback steps**
The steps listed under `on-failure.fallback` in the YAML. Retires: "error handling steps", "error route".

**failure edge**
The graph edge traversed _on failure_, connecting a step to the head of its fallback steps. `GraphEdge.isFailure: true`. Retires: "error edge".

**fallback lane**
The placed row or column holding a step's fallback steps in the rendered graph. Retires: "error branch".

**`on-failure` vs `fallback`**
Both appear in the schema: `on-failure` is the container map (which also holds `retry`, `continue`, etc.); `fallback` is the key inside that map holding the list of fallback steps. The `error`/`failure` split follows this: `GraphEdge.isFailure` describes traversal; `fallback` and `fallbackTarget`/`fallbackConnected` describe the steps and their authoring state.

**`continue` (boolean or string)**
A key inside `on-failure` that, when `true` (or a template expression that evaluates to a truthy value), suppresses re-throwing after the fallback path has run. Writing `fallback` without `continue` leaves the workflow still failing after fallback — the execution graph's `ExitTryBlock` re-throws. Writing `continue: true` converts "notify on failure" into "swallow the failure". These are separate operations with different semantics; the graph authoring surface writes them separately.

**fallback lane shape (two variants)**
The rendered layout has two shapes depending on `continue`:
- `fallback` alone → terminating lane. `ExitTryBlock` re-throws; no return corridor is drawn. The fallback steps are a side column with no edge back to the spine.
- `fallback` + `continue: true` (or any truthy template) → rejoining lane, re-entering the owner's next sibling. Reuses `isMerge` / `buildMergeBusPath` on the join edge.

---

## Code / copy divergence (intentional)

Internal vocabulary is schema-aligned (`fallback`, `isFailure`, `fallbackTarget`) regardless of what design settles on for user-facing copy ("Add error handling" vs "Add fallback steps" — pending design sign-off per ADR-0004). `CONTEXT.md` records the mapping so the divergence is intentional rather than rot.
