# ADR-0006 — Graph mutations reuse the snippet insertion path

**Status:** Accepted
**Date:** 2026-09-16
**Deciders:** @elastic/workflows-eng

## Context

`@kbn/workflows-yaml` exports `insertStep`, `deleteStep`, and `modifyStep` from `lib/yaml_edit`. These look like the natural home for graph mutations. However:

**`yaml_edit`'s insertion primitives have no production call sites.** They appear in barrel re-exports and their own unit tests, but are never called from the plugin. The live insertion path is `insertStepSnippet` in [`insert_step_snippet.ts`](../../public/widgets/workflow_yaml_editor/lib/snippets/insert_step_snippet.ts), called from the actions menu at [`workflow_yaml_editor.tsx:696`](../../public/widgets/workflow_yaml_editor/ui/workflow_yaml_editor.tsx#L696).

**`insertStepSnippet` handles YAML that `insertStep` does not:**
- `steps: []` flow-array replacement (an empty sequence in flow style)
- The first empty sequence item
- A missing `steps:` section entirely
- Indent inference from the surrounding document

These are real workflows seen in production. Choosing `yaml_edit` would mean betting the feature on code that has never run in production while a battle-tested path sits beside it.

**The step template library already exists and is colocated:**
- `generateBuiltInStepSnippet` / `generateConnectorSnippet` — step YAML templates
- `insertTriggerSnippet` — trigger insertion, already accepts `defaultCondition` and `requiresConnectorId`; spec 06's exact requirement with no new code

**A Jest harness with a real Monaco model already exists** in `insert_step_snippet.test.ts`.

The one thing `insertStepSnippet` _does_ use that the graph doesn't have: `findStepNodeToInsertAfter`, which consults the cursor position. This is the single point of extension needed.

## Decision

Graph mutations reuse the **existing, production-proven** `insertStepSnippet` path, extended with one optional parameter:

```ts
insertStepSnippet(
  model,
  yamlDocument,
  stepType,
  cursorPosition?,
  editor?,
  insertAfterStepName?   // new: short-circuits findStepNodeToInsertAfter
)
```

When `insertAfterStepName` is provided, `findStepNodeToInsertAfter` is bypassed and the anchor step name is used directly as the insertion address (per ADR-0003).

Two new colocated utilities:

```ts
collectStepNames(doc: Document): Set<string>       // whole tree via spec 00's traversal
uniqueStepName(base: string, taken: ReadonlySet<string>): string
```

The handler lives in `workflows_management` (the package never sees YAML), and `editorRef` is already in scope at the hosting level (ADR-0005).

## Alternatives considered

**Extend `yaml_edit`'s `insertStep` / `modifyStep` / `deleteStep`.** Rejected: these primitives have no production call sites, do not handle several real-world YAML patterns (flow-style arrays, missing sections), and their test coverage exists in isolation from a real Monaco model. Shipping graph authoring on untested-in-production code introduces silent failure modes that would be difficult to diagnose.

**New mutation module in `@kbn/workflows-ui` or `@kbn/workflows-yaml`.** Rejected: the module boundary would prevent access to the Monaco model (`@kbn/workflows-ui` is a rendering package; `@kbn/workflows-yaml` is pure string manipulation). The Monaco model is required by ADR-0005's undo integration and by ADR-0002's `applyYamlEdit` dispatch.

**Copy `insertStepSnippet` and adapt it for the graph.** Rejected: creates a second implementation to maintain. Edge cases fixed in one copy would need to be applied to the other.

## Consequences

- Graph mutations and editor-menu mutations share one implementation. Bugs fixed in `insertStepSnippet` are fixed for both surfaces.
- `setStepFallback` (spec 07) and `duplicateStep` (spec 05) follow the snippet module's conventions (colocated in `lib/snippets/`, use `pushUndoStop` / `pushEditOperations`, dispatch `applyYamlEdit`).
- `yaml_edit`'s insertion primitives remain exported but unproven-in-production. A future team choosing to use them should be aware of this.
- One wrinkle to assert, not discover: after `applyYamlEdit`, the editor's debounced `onChange → setYamlString` fires ~200ms later with the same string, costing one redundant compute. Idempotent, but two dispatches for one edit. Spec 04 must confirm this is the actual behaviour.
