# ADR-0005 — Undo delegates to Monaco

**Status:** Accepted
**Date:** 2026-09-16
**Deciders:** @elastic/workflows-eng

## Context

The POC implements undo for graph gestures as a snapshot-and-toast: before each gesture it saves `detail.yamlString`, and if the toast button is clicked within 10 seconds it dispatches `setYamlString(savedSnapshot)`. The toast disappears after 10 seconds; undo after that is impossible.

Three facts about the existing architecture make this unnecessary:

**1. The YAML editor is always mounted.** [`workflow_detail_editor.tsx:369-374`](../../public/pages/workflow_detail/ui/workflow_detail_editor.tsx): "Layer 1 (YAML): always mounted so validation keeps running." The graph is a peer `div`, hidden and `inert`. The Monaco model and its undo stack survive every tab switch.

**2. A controlled `value` change is already one atomic undo entry.** [`react_monaco_editor/editor.tsx:378-393`](../../../../../packages/shared/shared-ux/code_editor/impl/react_monaco_editor/editor.tsx) uses `pushUndoStop()` → `model.pushEditOperations(fullModelRange, text)` → `pushUndoStop()`, _not_ `setValue()` (which would wipe history). This is pinned by [`editor.test.tsx:346-374`](../../../../../packages/shared/shared-ux/code_editor/impl/react_monaco_editor/editor.test.tsx): "pushes a full replace when controlled value changes externally". So a graph gesture dispatching `applyYamlEdit(yaml)` → changing `detail.yamlString` → updating the `value` prop is already a single undoable Monaco entry with zero new code.

**3. `editorRef` is already in scope at the hosting level.** [`workflow_detail_editor.tsx:381`](../../public/pages/workflow_detail/ui/workflow_detail_editor.tsx) passes `editorRef` to `WorkflowYAMLEditor` as a sibling of `<WorkflowVisualEditor>`.

The only missing piece is the _entry point_: `⌘Z` on the canvas never reaches the unfocused `inert` editor.

## Decision

Add a canvas-level keybinding that delegates to Monaco:

```ts
editorRef.current?.trigger('graph-gesture', 'undo', null);   // ⌘Z / Ctrl+Z
editorRef.current?.trigger('graph-gesture', 'redo', null);   // ⇧⌘Z / Ctrl+Y
```

No snapshot, no toast, no secondary history. The Monaco undo stack is the single source of truth for both the YAML editor and the graph canvas.

A discoverability toast whose _button_ calls the same `trigger` (no snapshot, no 10-second window) is available as spec 08 polish, but it is not required.

## Alternatives considered

**The POC's snapshot-and-toast.** Rejected on three grounds:
1. The restore is itself a `setYamlString` dispatch — it becomes _another_ stack entry. The history then records the mistake and its reversal rather than removing the mistake. `⌘Z` right after clicking the toast re-applies the gesture.
2. It creates two approximately-agreeing histories: the toast reverts one edit within 10 seconds; Monaco delegation reverts an unbounded chain, forever. Two histories for strictly less capability.
3. The 10-second window is a UX footgun for slow reviewers and users who switch tabs.

**A separate graph-side undo stack (e.g., React `useReducer` history).** Rejected: diverges from the YAML editor's history. A user who edits in the YAML editor and then switches to the graph and presses `⌘Z` would undo a graph gesture rather than the YAML edit — which is the wrong thing.

## Consequences

- Graph gestures and YAML edits share one undo stack; `⌘Z` always undoes the most recent change regardless of which surface made it.
- `applyYamlEdit` (ADR-0002) must still write `detail.yamlString` — the undo entry exists _because_ the `value` prop changes.
- Every gesture is a full-document replace in Monaco (re-tokenizes and re-validates the whole YAML). This is pre-existing architecture, but spec 04 must _measure_ the cost on a large workflow rather than assume it is negligible.
- The precedent for the `trigger` call exists in the codebase: [`ai_integration/proposed_changes.ts`](../../public/features/ai_integration/proposed_changes.ts) uses `getUndoRedoService()` and `model.applyEdits(ops, true)` — the graph delegation is a simpler variant of the same pattern.
