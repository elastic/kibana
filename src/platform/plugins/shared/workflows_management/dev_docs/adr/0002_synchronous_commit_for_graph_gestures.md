# ADR-0002 — Synchronous commit for graph gestures

**Status:** Accepted
**Date:** 2026-09-16
**Deciders:** @elastic/workflows-eng

## Context

`setYamlString` is debounced 250ms in [`middleware.ts:41-45`](../../public/entities/workflows/store/workflow_detail/middleware.ts):

```ts
const debouncedCompute = debounce(
  (yamlString, store) => compute(yamlString, store),
  COMPUTATION_DEBOUNCE_MS  // 250
);
```

This tuning is correct for keystrokes: it batches rapid typing into one recompute. But a discrete graph gesture routed through the same path would leave a 250ms dead window between the click and the new node appearing on canvas — the user sees nothing change for a quarter second after a deliberate action.

## Decision

Add a sibling Redux action `applyYamlEdit(yamlString: string)` that `workflowComputationMiddleware` computes on **immediately**, bypassing `debouncedCompute`. Dispatch `applyYamlEdit(model.getValue())` from every graph gesture handler after the snippet call.

`applyYamlEdit` is a **separate action, not a flag on `setYamlString`**, so the fast path is structurally unreachable from a keystroke handler. The dispatch site reads as "discrete edit" rather than requiring every reader to remember the flag.

`applyYamlEdit` still writes `detail.yamlString` — this is required for the Monaco undo integration (ADR-0005): the undo entry for a gesture exists _because_ the `value` prop changes, which it does when `yamlString` changes.

The debounced `onChange → setYamlString` from the editor fires ~200ms after the gesture with the same string, costing one redundant compute. This is idempotent but real — it is two dispatches for one edit. Spec 04 must measure this on a large workflow rather than assume it is negligible.

## Alternatives considered

**Route graph gestures through `setYamlString` directly.** Rejected: does not solve the 250ms dead window because the debounce is inside the middleware, not at the action boundary. The gesture would still queue behind the debounce.

**Increase the debounce for keystrokes and remove it for discrete gestures with a flag on `setYamlString`.** Rejected: a flag on a shared action is invisible to a future reader who sees `dispatch(setYamlString(yaml, { immediate: true }))` in a keystroke handler and removes the flag thinking it is a performance optimisation.

**Cancel the debounce on every gesture** (`debouncedCompute.cancel()`). Rejected: this would also cancel any in-flight keystroke recompute that arrived before the gesture, which is more surprising than a redundant second compute.

## Consequences

- Graph gestures recompute the graph synchronously — the node appears on canvas immediately on click.
- The 250ms debounce tuning for keystrokes is preserved and unaffected.
- The ghost-card / pending-node in spec 08 is a genuine placement _preview_ rather than a scrim hiding latency; spec 08 is therefore genuinely optional polish.
- Every graph gesture handler must dispatch `applyYamlEdit`, not `setYamlString`. This is a convention, not enforced by types — the convention must be stated in the handler's doc comment.
