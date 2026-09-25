# ADR-0001 — Graph inline authoring — scope

**Status:** Accepted
**Date:** 2026-09-16
**Deciders:** @elastic/workflows-eng

## Context

[elastic/security-team#19376](https://github.com/elastic/security-team/issues/19376) requests turning the workflow graph from a read-only viewer into an authoring surface. [PR #288472](https://github.com/elastic/kibana/pull/288472) is an open 133-file / +19k POC that implements an early version of this alongside a full restyle, a step-config panel, a data-reference picker, a creation panel, and a template-recommendation feature.

The graph is currently documented and implemented as read-only end to end:
- [`graph_layout/README.md:3`](../../../../../packages/shared/kbn-workflows/graph_layout/README.md): "read-only visualisation editor"
- [`workflow_graph_canvas.tsx:725-728`](../../../../../packages/shared/kbn-workflows-ui/src/components/workflow_graph/workflow_graph_canvas.tsx): `nodesConnectable={false}`, handles at `opacity: 0`
- [`workflow_visual_editor_stateful.tsx:66-74`](../../public/features/workflow_visual_editor/ui/workflow_visual_editor_stateful.tsx): "Glue layer between Redux + plugin services and the read-only graph canvas"

There is no mutation path from the graph to the YAML. Making it editable touches the domain model, the layout pipeline, the rendering layer, the action menu and the Redux write path — five layers that want independent review.

## Decision

Scope is **inline authoring plus the styling it requires**: visible connection ports, hover states, step insertion from a port, a `⋮` node-action menu, a "Add fallback steps" failure port, and the trigger-append overlay. Excluded: chip/logo/minimap/bottom-bar restyle, the step-config panel, the data-reference picker, the creation panel, the actions-menu redesign, and template recommendations — roughly 12k of the POC's 19k lines.

The deliverable is nine stacked specs, one per PR, each grilled and landing independently.

## Alternatives considered

**Port the POC in full.** Rejected: the POC mixes authoring logic with cosmetic restyle and out-of-scope features. A monolithic import cannot be reviewed incrementally, and the POC contains known issues (wrong fallback topology — see ADR-0004, duplicate step names — see ADR-0003, unproven mutation primitives — see ADR-0006).

**Only implement the pure-UI layer (ports + hover states).** Rejected: without the mutation path the ports are decorations; the feature cannot ship incrementally if the first deliverable has no user-visible behaviour.

## Consequences

- Nine stacked PRs, each independently reviewable and deployable behind a flag.
- Each landed spec distils into [`workflow_visual_builder.md`](../workflow_visual_builder.md) in the same PR — the living state of implementation is always accurate.
- The step-config panel, data-reference picker and template recommendations remain unscoped; they are not blocked by this work.
