# ADR-0013 — Structure-driven cross-axis packing

**Status:** Accepted
**Date:** 2026-10-14
**Deciders:** @elastic/workflows-eng

Supersedes the post-dagre positioning passes of ADR-0008, ADR-0011 and ADR-0012 (the pipeline and
the passes in `enforce_lane_order.ts`). The reserved-lane model in `@kbn/dag-layout` (ADR-0012,
ADR-0009) is unchanged.

## Context

After `dagLayout`, six passes moved cross-axis positions: fork lane order, branch compound packing,
owner centring (with a join shift), trigger order, container growth, and an overlap repair, followed
by waypoint reconciliation. Each pass re-derived forks and containers from edge reachability with
its own definition, and several undid or contradicted earlier ones. Every new visual requirement was
met with another pass or another carve-out, e.g. fork centring skipped forks that had a fallback
lane.

Measured, not assumed. A seeded generator (400 workflows × TB and LR, `if`/`switch`/`parallel`/
`foreach`/fallback/`continue`, depth ≤ 3) checked against an independent rule checker produced
**1200 failures across six rules**: owner off the midpoint of its branch heads, join off the owner's
column, steps in a branch jogging sideways, containers wider than their body, sibling forks
interleaving their heads, and branches out of declaration order. The same checker flagged **28 of
the 126 workflows on a live instance**, exactly the 28 a visual review of all 126 screenshots found.
The worst cases were a switch gate ~2100px off its branches, a step after a fork ~450px off its gate,
and foreach boxes ~2x wider than their body with the body pushed to one side.

The common cause: the transform knows the block structure (forks with ordered branches and a join,
containers, lanes) and flattens it to a generic graph; the passes then rebuilt the structure from
reachability.

## Decision

**The transform emits the structure; one pure function sets the cross axis from it.**

- `transformWorkflowToGraph` returns `structure: LayoutStructure` (`@kbn/workflows`): triggers plus a
  tree of steps, forks (branches in YAML order, each with its head and edge label), containers (with
  their body) and fallback lanes (`rejoins` when `continue` is set). The item after a fork in its
  sequence is its join. Every node appears once. Empty `switch` cases and empty `parallel` branches
  next to non-empty ones get a bypass lane like `if` already did, so every branch has a head.
- `packCrossAxis` (`pack_workflow_structure.ts`) runs after `dagLayout`. `dagLayout` still decides the
  main axis (ranks, node sizes, container heights, lane cascade and spine push) and is unchanged.
  The packer decides every cross coordinate, bottom-up, each item reporting how far it reaches either
  side of its spine column:

  | Item | Rule |
  |---|---|
  | sequence | one spine column |
  | fork | branches side by side in declaration order, one `nodeSep` apart, each as one bounding box (items plus their lanes); owner on the midpoint of the outermost heads; the join (next item) on the owner's column |
  | container | tight box: body extent plus padding, body centred in it, box centred on the spine (also nested; LR uses the 70/32 top/bottom padding) |
  | fallback lane, `merge` body | to the right of everything the owner reaches, further out per nesting level |
  | bypass head | reserves the size of its edge label (`edge_label_metrics.ts`), so the label never touches the box around it |
  | triggers | a centred row in declaration order |

- `dagLayout` edge waypoints are dropped; edges are routed by `computeEdgePath` (fork bus, merge bus,
  failure path, smooth-step) from the final handle positions.
- Removed: `enforceForkLaneOrder`, `enforceForkBranchCompoundOrder`, `centreForkOwners`,
  `enforceTriggerLaneOrder`, `containContainerContents`, `reconcileEdgePoints`, the post-pass overlap
  repair call, and merge-channel routing (`computeMergeChannels`).
- The rules are enforced by the generator and checker, not by the passes: no overlap, containment,
  container tightness, declaration order of forks and triggers, owner centring, join alignment, chain
  straightness, no interleaved sibling forks, no merge edge running behind a node. The checker has
  negative tests, so each rule is proven able to fire. The corpus must show **zero** violations.

## Alternatives considered

- **Keep the passes and fix their order** (run them per graph, innermost first, then fit the
  containers). Rejected: it adds a layer to the stack that the packer would delete, and ADR-0011
  already measured a re-run loop failing to converge.
- **Contour packing (Reingold–Tilford) instead of bounding boxes.** More compact for staircases, but
  a deep edit can move unrelated branches sideways, the instability ADR-0008 set out to remove.
  Revisit if width becomes a problem.
- **Container box symmetric about the body's spine, or tight with handles moved onto the spine.** The
  first leaves up to ~850px of empty space on asymmetric bodies; the second needs the container node,
  merge-channel and edge-point code to stop assuming handles at the node centre.
- **Replace dagre.** Out of scope: dagre still supplies the main axis and the reserved-lane cascade.
- **A flag with the old pipeline as fallback.** Rejected: it keeps both stacks alive.

## Consequences

- Order, centring, join alignment, containment, container tightness and non-interleaving hold by
  construction, on the 800 generated layouts and on all 126 live workflows in TB and LR (28 flagged
  before, 0 after, none newly flagged). Node and edge counts are unchanged for every workflow.
- Bounding-box packing makes some graphs wider: 5 of the 126 grew by more than 25% (nested if/else
  cascades and the widest switch; the largest is `windows-clickfix-investigation`, 3560 to 5583px), 23
  got narrower, the median is unchanged, and no graph got taller.
- A container's body can sit off the line of the outer spine when it is asymmetric (up to ~425px in
  the Censys enrichment loop). That is the price of a tight box.
- Merge channels are gone: with the packer they fired for 0 of the 800 generated and 252 live
  layouts, and `mergeDropClear` keeps guarding the property.
- The edge-label estimate mirrors the chip in `workflow_graph_edge.tsx` (font, padding, 24 characters);
  both import `EDGE_LABEL_MAX_CHARS`. If the chip styling changes, update `edge_label_metrics.ts`.
- A lane's main-axis position still comes from `@kbn/dag-layout`'s cascade; the packer places lanes on
  the cross axis only.
- Known limitation: the body of a `merge` step shares rows with the items after it (nothing pushes
  them down, unlike a fallback lane). The packer clears the items that follow in the same sequence, but
  a `merge` that is last in a branch can still share rows with the join after its fork. No live
  workflow uses `merge`. The fix is to reserve the body as a lane in `dagLayout`'s main-axis cascade,
  not to add a cross-axis rule.
- The layout memo in `useWorkflowLayout` is keyed on the topology fingerprint plus the head and label
  of every empty branch: the fingerprint skips empty child slots, but each one is a bypass node sized
  from its label.
- `separatePositionedOverlapsInPlace` is no longer used by the pipeline; it remains an export of
  `@kbn/dag-layout`.
