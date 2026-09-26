
# ADR-0012 — Reserved side lanes

**Status:** Accepted
**Date:** 2026-09-22
**Deciders:** @elastic/workflows-eng

Supersedes ADR-0011 (post-dagre positioning pipeline).

## Context

Spec 03 added the fallback rendering in the workflow canvas. The five-pass pipeline from ADR-0011
treated failure lane nodes as ordinary spine nodes, running them through dagre. This produced two
kinds of wrong layout:

1. **Fallback nodes at wrong ranks.** Dagre places a fallback node beside the spine node that
   follows its owner, or even further down, because it sees the `owner→laneHead` edge like any
   other fork edge — dagre's tight-tree ranker tries to minimise the sum of rank-weighted edge
   lengths, which pushes `laneHead` toward the join.

2. **Owner off-column.** ADR-0011 pass 3 (`anchorFallbackOwnersSpeculative`) achieved 74.1% owner
   straightness. The remaining 25.9% had owners laterally displaced by the barycentre pass pulling
   them toward the average of `[spine successor, failure lane head]`, which are in different columns.

The reserved-lane model eliminates both problems by excluding failure lane nodes from dagre entirely.

## Decision

### Reserved lanes: exclude lane nodes from dagre, level them post-dagre

Each fallback lane is declared to `dagLayout` as a `reservedLane`. The layout engine:

1. Removes the lane's nodes from the dagre run; gives them to the owner instead.
2. Places lane nodes in the `+cross` margin starting at the owner's main-axis start.
3. Cascades nested lanes (depth > 0): `levelLaneCascade` drops each nested head immediately
   below its parent's last node (`parentEnd + rankSep`).
4. Pushes spine successors: after placing all lanes on an owner, measures the owner's lane
   cascade's main extent and shifts any spine successor that would collide downward.

Because the owner now has exactly one *spine* successor in dagre's view, the barycentre pass
centres it over the spine successor — achieving 100% owner straightness without a speculative
anchoring pass.

### Pipeline shape (replaces ADR-0011)

```
1  dagLayout(...)                        → snapshot node cross-axis centres
   (lane nodes excluded from dagre; placed at +cross via reservedLanes)
2  enforceForkLaneOrder                  → rank-aware packing (pass 1)
   (passes containerDescendants closure for transitive carry)
2b enforceForkBranchCompoundOrder        → fork branch packing (pass 1b)
   (passes containerDescendants closure)
3  enforceTriggerLaneOrder               → unchanged
4  separatePositionedOverlapsInPlace     → order-preserving repair (pass 2)
   (passes containerDescendants closure)
5  reconcileEdgePoints(snapshot)         → translate-or-clear, once (pass 3)
```

Pass 3 (speculative anchoring, `anchorFallbackOwnersSpeculative`) from ADR-0011 is **deleted**.
Owner straightness is now a structural property of the reserved-lane model, not a correction pass.

### §3.5 shortcut-edge guard (`layout_graph_with_lanes.ts`)

After dagre runs, §3.5 aligns fork heads onto a shared main-axis rank (correcting dagre's
tight-tree ranker skew). This pass was previously lane-gated and is now unconditional, which
exposes a correctness gap: in a graph `a→b`, `a→c`, `b→c`, `c` is a transitive successor of `b`
rather than a sibling fork head. Aligning it onto `b`'s rank collapses two ranks and destroys
dagre's non-overlap guarantee.

Fix: before aligning, filter out any target that is reachable from a sibling target (via
`getTransitiveSuccessors` on the spine adjacency, which is built from `spineEdges` and was already
required for the D7 spine push). Only mutually-exclusive branch heads are aligned.

### Container descendants (`buildContainerDescendants`)

`ForeachGroup.innerNodes` holds **direct members** only. A nested container pushes its body as a
separate sibling entry in the `foreachGroups` array. Any pass that moves a container must carry
**all descendants** transitively, or the grandchildren's parent-relative coordinates shift and
React Flow renders them outside their container box.

`buildContainerDescendants` builds the transitive closure once in `computeWorkflowLayout`; all
three consumers (`enforceForkLaneOrder`, `enforceForkBranchCompoundOrder`,
`separatePositionedOverlapsInPlace`) receive the same map instead of rebuilding a shallow copy.

### `failure` → `fallback` handle rename

React Flow resolves edge source coordinates by `id` on the source node's `<Handle>` elements. The
named handle for failure edges is renamed from `id="failure"` to `id="fallback"` to match the YAML
authoring term (`on-failure.fallback`) and the `handle` entry in CONTEXT.md, which already named
the set as `(then / else / step / fallback)`.

`id="failure"` was also ambiguous with `ChipOutcome = 'none' | 'success' | 'failure'`
([step_chip_palette.ts](../../../../../packages/shared/kbn-workflows-ui/src/components/workflow_graph/step_chip_palette.ts)),
which is an execution-outcome concept in the same directory.

The same named handle is added to `WorkflowGraphForeachGroupNode`; without it, failure edges
sourced from a `foreach` or `while` container were silently dropped by React Flow.

## Superseded claims from ADR-0011

| ADR-0011 claim | Superseded by |
|---|---|
| 6-step pipeline including `anchorFallbackOwnersSpeculative` | 5-step pipeline; anchoring pass deleted |
| 74.1% owner straightness via speculative anchoring | 100% — structural consequence of reserved lanes |
| ADR-0010 Decision 2 (asymmetric lane sets, `failureHead` parameter on `buildLaneSets`) | Failure edges are filtered out before `buildLaneSets` runs (`enforce_lane_order.ts:232`); failure targets never reach the lane-set builder. `buildLaneSets` signature no longer includes `failureHead`. |

## Known residuals

**Nested `continue` backward rejoin** ([security-team#19542](https://github.com/elastic/security-team/issues/19542)):
A fallback with `continue: true` inside a parent lane produces a backward-pointing rejoin edge when
the fallback owner has a following sibling inside the parent lane. The lanes are in different cross
columns so nothing overlaps — the defect is a single arrow pointing the wrong direction. Deferred:
the required shape is a depth-2 fallback whose owner has `continue` *and* a following sibling in
the parent lane, which is rare in authored workflows. The fix is ~30–40 lines inside
`levelLaneCascade` using `laneInternalEdges` (already partitioned in scope).

## Alternatives considered

**Keep dagre, fix with layout constraints.** Dagre has no rank-pinning API. Emulating it with
dummy nodes and weighted edges proved brittle across the 400-shape corpus.

**Keep `anchorFallbackOwnersSpeculative`, strengthen it.** Speculative anchoring is inherently
repair-based: it cannot exceed the 74.1% mark without risking order violations, because the repair
pass (PAVA) runs after it and may re-displace the owner. Reserved lanes solve the root cause
(dagre's barycentre using the failure edge) rather than treating the symptom.

**Separate the failure-lane placement into `enforce_lane_order.ts`.** The correct placement
position (owner's main-axis start) is derivable only after dagre runs. `dagLayout` already owns
the `reservedLanes` input path; extending it avoids duplicating the owner-position logic.

## Consequences

- Fallback lane nodes are no longer processed by dagre; their positions are computed in
  `layout_graph_with_lanes.ts` using `levelLaneCascade`.
- `anchorFallbackOwnersSpeculative` is deleted. Any code referencing this symbol is stale.
- The three post-dagre enforcement passes now receive a `containerDescendants` closure built once
  in `computeWorkflowLayout`; the previous per-function shallow `containerInnerIds` maps are removed.
- `dagLayout`'s `DagLayoutOptions.reservedLanes` is the only API surface change in `@kbn/dag-layout`.
- The shortcut-edge guard in §3.5 adds a reachability filter; for workflows with no transitive
  triangle shapes (which covers all currently valid YAML), the filter is a no-op.
