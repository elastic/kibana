
# ADR-0009 — `alignmentIgnoredEdges`: excluding failure edges from cross-axis alignment

**Status:** Accepted
**Date:** 2026-09-18
**Deciders:** @elastic/workflows-eng

## Context

`dagLayout` runs a barycentre pass inside `alignDagreCrossAxisInPlace` to centre each node over its
children (or under its parents). For a fallback owner with two out-edges — one spine edge and one
failure edge — the barycentre pass centres the owner over the *average* of its two successors: one
in the spine column and one in the failure lane. This produces a lateral jog (measured: 175 px in
the reported YAML) and puts every node on the spine *above* the owner off-column too.

`alignmentIgnoredEdges` was added to `dagLayout` / `applyDagre` to exclude the failure edge from
the barycentre calculation, keeping the owner on the spine column during dagre's own run.

## Decision

Pass `alignmentIgnoredEdges: edges.filter(e => e.isFailure).map(e => e.id)` to `dagLayout` in
`computeWorkflowLayout`. This list is used by `applyDagre` in two places:

1. **`alignDagreCrossAxisInPlace`** — excluded edges are not counted when computing the barycentre
   of a node's children or parents. The owner aligns with the spine successor instead of the
   average of `[spine, failure]`.

2. **`applyDagre` waypoint decision** — `successorCount` / `predecessorCount` are computed from
   non-ignored out-/in-edges. Without this filter, a fallback owner always has `successorCount === 2`
   and its spine-edge waypoints are cleared (treated as a fan-out). With the filter, the spine edge
   is treated as a normal edge and keeps its waypoints.

The ignored edges still participate in dagre's ranking pass (they still determine ranks), and
`separateRankOverlapsInPlace` still runs on the full graph — the non-overlap guarantee inside
dagre's own run is preserved.

## Alternatives considered

**Edge `weight`.** Fractional weights on the failure edge (1 → 0.01) are inert in the barycentre
pass; `weight: 0` flips the entire layout by switching ranks, widening the owner's jog from
−175 px to +366 px. Not a viable lever.

**Post-dagre centering only (no option, move in `enforceForkLaneOrder`).** Possible but redundant:
the barycentre pass already does the right thing if the failure edge is excluded — there is no reason
to first let dagre mis-centre and then correct it.

## Consequences

- The owner stays on the spine column through dagre's own run in the common case (single
  non-failure successor). Step 3 of the post-dagre pipeline (speculative anchoring) closes any
  residual mis-centering.
- Measured limit: `alignmentIgnoredEdges` stops *our* barycentre pass from centring the owner over
  `[spine, lane]`. It does not guarantee perfect alignment, because dagre's internal positioning
  phase runs *before* the barycentre correction and already used the failure edge. Step 3
  (speculative anchoring) is what achieves 74.1% owner straightness across 587 generated owners;
  `alignmentIgnoredEdges` alone achieves only 7.8% (same as raw dagre without the option).
- `layoutCompoundGroup` in `@kbn/dag-layout` calls `applyDagre` without `alignmentIgnoredEdges`,
  so the barycentre pass is unprotected for a fallback lane inside a `foreach` body. Bounded to a
  quality gap, not a correctness one: the corpus includes in-`foreach` fallbacks and reports 0
  overlaps and 0 order violations.
