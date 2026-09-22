
# ADR-0008 — Post-dagre fork and trigger lane order

**Status:** Superseded by ADR-0011
**Date:** 2026-09-17
**Deciders:** @elastic/workflows-eng

## Context

Dagre orders same-source lanes by subtree shape (depth-first, heavier subtrees left). Concretely:
growing the `else` branch of an `if` by one step can swap the `true`/`false` lanes in the rendered
graph. In an authoring surface, the port a user clicks must correspond to the branch that grows — a
layout that re-orders lanes on every edit is unusable.

`transform_workflow_to_graph.ts` already emits fork edges in declaration order (`then` → `else`,
`branches[0]` → `branches[1]` → …, `cases[0]` → … → `default`). So the expected lane order is
unambiguous without any new metadata: it is the order in which a fork's outgoing edges appear in the
graph's edge list.

Triggers are the degenerate case: all fan into the first step from rank 0 and each is a single-node
lane. The same declaration-order invariant applies.

## Decision

Two pure post-dagre passes added to `computeWorkflowLayout` in
[workflow_layout_pipeline.ts](../../../../../packages/shared/kbn-workflows-ui/src/components/workflow_graph/workflow_layout_pipeline.ts),
implemented in
[enforce_lane_order.ts](../../../../../packages/shared/kbn-workflows-ui/src/components/workflow_graph/enforce_lane_order.ts).

### One pass per laid-out graph

`enforceForkLaneOrder` runs once per graph: once over the outer graph (`transformed.edges`) and once
per `foreachGroup` body (`group.innerEdges`). Within each run, containers are opaque — a container
node is moved as a unit; the pass does not descend into it.

Why per-graph rather than one flat pass: `transform_workflow_to_graph.ts` deliberately emits no
edges from a `foreachGroup` to its inner steps (the body lives in a separate `innerEdges` graph).
A flat BFS from a lane head can never reach a container's inner nodes. If the container moved
without its body, `use_workflow_layout.ts:318-327` would compute `pos.x - parentPos.x` using the
new container position but the unmoved body positions, sliding every inner node out of its box.
Running one pass per graph makes this structurally impossible.

When a container is in a lane that moves, its inner nodes move with it via the `containerInnerIds`
map, which maps each group id to the flat set of all its inner node ids (including bypass-lane
nodes). Nested groups are already flattened into `foreachGroups` by
`transformWorkflowToGraph`; translations compose, and run order is irrelevant.

### Per-fork algorithm

For each fork (source with out-degree > 1):

1. Build each lane's *exclusive reachable set*: BFS from the head, then subtract any node reachable
   from a sibling head. Shared join nodes (in-degree > 1) belong to no lane and stay put.
2. Compute each lane's cross-axis interval `[min, max]` from the exclusive nodes' bounding boxes
   (inner container nodes included when the lane contains a container).
3. Sort lanes by current cross-axis position → current order. Compare against declaration order.
   Equal → no-op.
4. Permute: `declarationOrder[i]` takes `sortedStarts[i]`. Each interval keeps its size; only the
   starting position changes. This preserves the overall span.
5. Translate nodes and edges inside each moved lane by `newStart − oldStart`. Edges with both
   endpoints in one moved lane have their `points` translated by the same delta. Edges crossing a
   lane boundary get `points: []` (straight-line fallback). Return the original object for untouched
   edges — `workflow_graph_edge.tsx:159` memo-compares `points` by reference.

### The permutation rule

The correct packing is:

```ts
const sortedStarts = sorted.map(h => laneIntervals.get(h)!.min);
currentOrder.forEach((head, i) => newMins.set(head, sortedStarts[i]));
```

An earlier formulation used a cursor that advanced by `interval.size + gaps[sortedIdx]`, where
`sortedIdx` was the head's position in the *sorted* (current) order. For a symmetric two-lane
parallel where dagre placed the lanes in the wrong order, this produced `gaps[sortedIdx=1]` (the
last slot → no gap) and then `gaps[sortedIdx=0]` (after the last element → no effect), dropping the
inter-lane gap entirely. The merge node was 25 px off-centre (exactly `WORKFLOW_NODE_SEP / 2`).
The correct rule uses the positional index `i` in declaration order, not the index from the sorted
arrangement.

### Trigger lane order

`enforceTriggerLaneOrder` permutes trigger cross-axis positions using the same
`declarationOrder[i] ← sortedStarts[i]` rule. Expected order comes from
`transformed.nodeRefs[id].triggerIndex`. Trigger-to-first-step edges already have `points: []`
(multi-source in-degree > 1), so no edge handling is needed.

## Alternatives considered

**Constrain dagre's input order.** Would require either sorting the node list (dagre does not
guarantee that input order maps to output position for nodes of equal rank) or inserting dummy
edges to bias the layout. Fragile: dagre's rank assignment and crossing-minimisation are
independent; no input ordering guarantee exists in the graphlib API. Rejected.

**One flat pass over all nodes.** Rejected: moving a container without its inner nodes breaks
parent-relative coordinate derivation in `use_workflow_layout.ts:318-327`. A flat pass cannot know
which inner nodes belong to a container without additional bookkeeping that duplicates `foreachGroups`.

**Re-run PAVA after reordering.** The overlap-prevention algorithm (`separateRankOverlapsInPlace`)
is unnecessary because permuting disjoint intervals preserves disjointness for equal-width lanes
(each interval gets a start position that was previously occupied by an interval of the same size).
For unequal-width lanes the invariant holds as long as the wider lane does not swap into a slot too
narrow to contain it without overlap — no such fixture exists in the test suite, and the no-overlap
assertion in `workflow_layout_pipeline.test.ts` guards against it in any future fixture.

## Consequences

- Fork and trigger lane order is stable across YAML edits: growing one branch never visually swaps
  it with a sibling lane.
- The pass is a no-op when dagre already agrees with declaration order (one `Array.every` check
  per fork), so the common single-branch and already-sorted cases add no translation work.
- Layout output array order is unchanged — coordinates are permuted, not array positions — so
  React Flow's `parentId` parent-before-child ordering and `derivedEdges` paint-order sorting
  remain intact.
- The topology fingerprint is unaffected (lane order is a rendering concern, not a topology
  concern).
- Unequal-width lanes that would overlap after permutation produce no known fixture today; the
  no-overlap assertion will surface any regression.
