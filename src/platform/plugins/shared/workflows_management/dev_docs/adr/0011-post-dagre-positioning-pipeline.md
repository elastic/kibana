
# ADR-0011 — Post-dagre positioning pipeline

**Status:** Accepted
**Date:** 2026-09-18
**Deciders:** @elastic/workflows-eng

Supersedes ADR-0008 (post-dagre fork and trigger lane order).

## Context

Spec 02 added the fallback lane. After it landed, certain workflow configurations produced
dramatically wrong layouts — nodes overlapping by up to 232 px. Root-cause analysis on the reported
YAML (TB, `nodeSep: 50`, `rankSep: 70`) found several interacting defects in `enforceForkLaneOrder`
and `transformInternal`, all triggered by the first graph shape that combines a nested fallback lane
with an asymmetric `if` (a `foreach` container in `then`, a single step in `else`).

A property-based harness over **400 generated workflows** (`if` / `switch` / `foreach` / `fallback`
/ `continue`, depth ≤ 3) measured the pre-fix state:

| Defect | Measured impact |
|---|---|
| `enforceForkLaneOrder` permutes lane *starts* — only safe for equal-width lanes | 110 / 400 shapes overlapping after packing |
| Nested `fallbackOf` overwritten | `fallbackOf` wrong for 100% of nested owners |
| Nested failure edges emitted mid-edge-list | 13 / 400 shapes with lanes on the wrong side |
| Edge waypoints decided too early | 19.5% of waypointed edges go stale after post-dagre passes |
| Owner off spine column | dagre puts owner on spine column only 7.8% of the time across 587 owners |

`dagLayout` output was overlap-free in all 400 shapes — the regression was introduced entirely by
the post-dagre pass.

## Decision

Replace the single-pass permutation (ADR-0008) with a five-pass pipeline in
`computeWorkflowLayout` ([workflow_layout_pipeline.ts](../../../../packages/shared/kbn-workflows-ui/src/components/workflow_graph/workflow_layout_pipeline.ts)).

### Pipeline shape

```
1  dagLayout(...)                        → snapshot node cross-axis centres
2  enforceForkLaneOrder                  → rank-aware packing (pass 1)
3  enforceTriggerLaneOrder               → unchanged (see below)
4  separatePositionedOverlapsInPlace     → order-preserving repair (pass 2)
5  anchorFallbackOwnersSpeculative       → speculative anchoring (pass 3)
6  reconcileEdgePoints(snapshot)         → translate-or-clear, once (pass 4)
```

**Pass order is load-bearing.** Anchoring only survives if it runs after the repair pass:
anchoring before repair scores 2.0% owner straightness (repair re-spaces ranks independently,
destroying alignment); a pack/anchor/repair loop oscillates and 21.5% of shapes fail to converge in
4 iterations with span growth reaching 7.8×.

### Pass 1 — rank-aware profile packing (`enforceForkLaneOrder`)

Replaces the start-permutation from ADR-0008, which was only overlap-safe for equal-width lanes.

For each fork, in topological order:

1. Build each lane's exclusive reachable set. For fallback forks: a node shared between the failure
   lane and the spine lane belongs to the *spine* lane (asymmetric exclusion — ADR-0010 decision 2).
2. Pack lanes in edge-list declaration order. Anchor the first lane at the union-min of all lane
   cross positions. For each subsequent lane, compute the no-fit offset:

   ```
   offset = max over all placed-box / lane-box pairs that share a main-axis interval
              of  (placed.crossEnd + nodeSep) − lane.crossStart
   ```

   Because this consults only pairs with overlapping main-axis extents, it handles both
   interleaved-lane intervals (where a single global interval would be unsound) and
   container-vs-step mismatches uniformly.
3. Apply translations lane-by-lane, updating positions before the next lane's no-fit computation.

**Trigger lane order** (`enforceTriggerLaneOrder`) is unchanged and still uses the
start-permutation. The permutation is sound for trigger lanes because all triggers use
`DEFAULT_NODE_STYLE` — equal-width lanes. This invariant must be preserved if trigger styles
diverge.

### Pass 2 — order-preserving overlap repair (`separatePositionedOverlapsInPlace` in `@kbn/dag-layout`)

This pass is load-bearing: packing constrains a fork only against its own lanes; nested forks grow
rightward into nodes that belong to no lane of theirs, leaving 110 / 400 shapes overlapping after
pass 1 alone.

The repair pass sweeps the main axis. At each distinct node start, the set of boxes straddling the
scanline is a clique of potentially overlapping nodes. It sorts them by cross axis and runs
`resolveCrossAxisOverlaps` (isotonic regression / PAVA), which is **order-preserving**: it spreads
a row but never swaps two nodes. It therefore cannot undo the lane ordering from pass 1.

Measured: fires on 299 / 400 shapes, resolves 100% — 0 remaining overlaps. Critically, the control
run shows 0 fires on raw `dagLayout` output, so it is a genuine no-op before pass 1 runs.

### Pass 3 — speculative anchoring (`anchorFallbackOwnersSpeculative` in `enforce_lane_order.ts`)

For each fallback owner with a single non-failure successor, translate the owner by
`centre(successor) − centre(owner)`, propagating the delta up the straight run above it (walk
predecessors while each has exactly one non-failure successor and at most one predecessor).

Applied one owner at a time, speculatively: snapshot positions, anchor, re-run pass 2, keep if
lane order and non-overlap both hold — otherwise restore. 10 rollbacks across 587 owners.

| | overlaps | lane-order violations | owner on spine column |
|---|---|---|---|
| raw dagre | 0 | (322) | 7.8% |
| pack + repair, no anchoring | 0 | 0 | 2.0% |
| unconditional anchor | 0 | **11 / 400** | 77.0% |
| **speculative + rollback** | **0** | **0** | **74.1%** |

### Pass 4 — edge-point reconciliation (`reconcileEdgePoints` in `enforce_lane_order.ts`)

Snapshot cross-axis centres immediately after `dagLayout`. After pass 3, walk every edge once: if
`|Δsource − Δtarget| ≤ 1` translate its waypoints; otherwise clear them (smooth-step fallback).
Preserve reference equality when unchanged (React Flow memo-compares `points` by reference).

Measured: 677 of 3466 waypointed edges (19.5%) needed clearing; 1851 needed translating.

This single pass covers all prior position mutations and replaces the per-pass edge-point bookkeeping
that ADR-0008 applied inside `enforceForkLaneOrder`.

## Superseded claims from ADR-0008

| ADR-0008 claim | Corrected |
|---|---|
| "The permutation rule guarantees no overlap for equal-width lanes" | True only for equal-width lanes; a `foreach` container vs a 300 px step leaves a 14 px overlap (pre-existing spec 01 bug). |
| "Re-run PAVA after reordering is unnecessary" | 110 / 400 shapes leave overlapping pairs after packing alone. The repair pass is load-bearing. |
| "Unequal-width lanes that would overlap after permutation produce no known fixture today" | The fallback lane is maximally unequal (a single 300 px column vs the full 650 px layout); it was the first such fixture. |
| Per-pass edge-point bookkeeping | Superseded by the single reconciliation pass. |

## Surviving invariant from ADR-0008

Fork and trigger lane order is stable across YAML edits: growing one branch never visually swaps it
with a sibling lane. The guarantee is now backed by:
1. Pass 1 (rank-aware packing to declaration order), and
2. Pass 2 (order-preserving repair — never swaps two nodes).

**The new replacement invariant:** no two boxes overlap after all position-mutating passes,
guaranteed by pass 2 rather than by a property of the reordering.

## Alternatives considered

**Constrain dagre's input order.** Rejected: dagre's rank assignment and crossing-minimisation are
independent; no input ordering guarantee exists. (Carried over from ADR-0008.)

**One flat pass over all nodes.** Rejected: moving a container without its inner nodes breaks
parent-relative coordinate derivation. (Carried over from ADR-0008.)

**Pack/anchor/repair loop.** Rejected: 21.5% of shapes fail to converge in 4 iterations; span
growth reaches 7.8× in the worst case.

**Unconditional anchoring.** Rejected: breaks lane order in 11 / 400 shapes.

## Consequences

- Measured outcome on 400 generated workflows: 0 overlaps, 0 lane-order violations; owners on spine
  column 7.8% → 74.1%; span growth median 1.04×, p95 1.19×, max 1.32×.
- `separatePositionedOverlapsInPlace` lives in `@kbn/dag-layout` (it operates on geometry, not
  domain knowledge). This expands the scope of `@kbn/dag-layout` beyond pure dagre wrapping.
- The repair pass must run after every position-mutating pass. Any future pass that moves nodes must
  be followed by another repair run or must prove it cannot introduce overlap.
- Known residuals (accepted): merge nodes are not pulled onto the spine column (anchoring stops at
  joins by design); global structural-edge straightness is 21.5% vs 22.3% raw dagre; 10 of 587
  owners roll back and keep dagre's offset.
