# Architecture Decision Records — Workflows Management

This directory holds ADRs for the `workflows_management` plugin and the package family it depends on (`@kbn/workflows`, `@kbn/workflows-ui`, `@kbn/workflows-yaml`, `@kbn/dag-layout`). It is the first `adr/` directory in Kibana — numbered files are used because supersession becomes a property of the filesystem rather than a convention inside a changelog.

## Format

Each ADR follows this structure:

```markdown
# ADR-NNNN — Title

**Status:** Accepted | Superseded by ADR-MMMM
**Date:** YYYY-MM-DD
**Deciders:** @elastic/workflows-eng

## Context
What situation prompted this decision. Include concrete evidence (code refs, benchmark numbers, failure modes).

## Decision
What was decided, stated precisely.

## Alternatives considered
What was rejected and why. An ADR without alternatives is a description, not a decision record.

## Consequences
What becomes easier, what becomes harder, what constraints this imposes on future work.
```

## The spec → grilling → ADR → living-doc contract

1. A **spec** is scratch: written locally in `kbn-workflows-ui/src/components/workflow_graph/specs/`, git-ignored, never committed — but it is its PR's description, so it is reviewed where review happens. Written to be read by a reviewer, not only by its author.
2. A **grilling session** on a spec resolves open decisions and produces **ADRs** here — committed, numbered, immutable once accepted, superseded (never edited) when a decision changes.
3. When a spec **lands**, its distillation (what now exists, the contract, the invariants) is merged into [`workflow-visual-builder.md`](../workflow-visual-builder.md) in the same PR, and the spec file is deleted. That document is the only place describing current state. The PR description survives on GitHub as the historical record of intent; `workflow-visual-builder.md` is the record of outcome.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-graph-inline-authoring-scope.md) | Graph inline authoring — scope | Accepted |
| [0002](0002-synchronous-commit-for-graph-gestures.md) | Synchronous commit for graph gestures | Accepted |
| [0003](0003-name-addressing-and-shared-traversal.md) | Name addressing and shared step-child traversal | Superseded by ADR-0007 |
| [0004](0004-fallback-diamond-and-continue.md) | Fallback lane shape and `continue` separation | Accepted |
| [0005](0005-undo-delegates-to-monaco.md) | Undo delegates to Monaco | Accepted |
| [0006](0006-graph-mutations-reuse-snippet-path.md) | Graph mutations reuse the snippet insertion path | Accepted |
| [0007](0007-structural-child-slots.md) | Structural child slots and per-slot enumerator | Accepted |
| [0008](0008-post-dagre-lane-order.md) | Post-dagre fork and trigger lane order | Superseded by ADR-0011 |
| [0009](0009-alignment-ignored-edges.md) | `alignmentIgnoredEdges`: excluding failure edges from cross-axis alignment | Accepted |
| [0010](0010-fallback-lane-graph-model.md) | Fallback lane graph model | Accepted |
| [0011](0011-post-dagre-positioning-pipeline.md) | Post-dagre positioning pipeline | Accepted |
