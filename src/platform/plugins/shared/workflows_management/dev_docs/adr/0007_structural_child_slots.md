
# ADR-0007 — Structural child slots and per-slot enumerator

**Status:** Accepted
**Date:** 2026-09-17
**Deciders:** @elastic/workflows-eng

## Context

This ADR supersedes the *shared traversal* half of ADR-0003 and corrects several of ADR-0003's
claims now falsified by implementation. The *name addressing* half of ADR-0003 is restated below
verbatim so this record is self-contained.

### Name addressing (from ADR-0003, unchanged)

Every graph gesture is addressed by step name, not by a positional path. The insertion context type:

```ts
type WorkflowGraphInsertionContext =
  | { mode: 'trigger' }
  | { mode: 'after';    stepName: string }
  | { mode: 'branch';   stepName: string; branch: BranchSlot }
  | { mode: 'fallback'; stepName: string };
```

`mode: 'branch'` addresses a bypass-lane node — head of an empty branch — giving those synthetic
nodes a legitimate meaning rather than an exclusion.

### Traversal inconsistency

Six pairwise-inconsistent child-slot enumerations existed across the package family:

| Enumeration | `steps` | `else` | `branches[]` | `cases[]`/`default` | `on-failure.fallback` | `iteration-on-failure` |
|---|---|---|---|---|---|---|
| `graph_layout/walk_step_tree.ts` `visitStepChildren` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `compute_topology_fingerprint.ts` `walkStepsWithSlot` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `kbn-workflows-yaml` `NESTED_STEP_KEYS` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `transform_workflow_to_graph.ts` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `validate_step_names.ts` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `get_step_node.ts` `findInNode` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |

`getStepNode`'s `findInNode` descended only `NESTED_STEP_KEYS` pairs, so
**`insertStep(yaml, step, '<a step inside a switch case>')` failed with `Step "..." not found`** —
the chosen mutation primitive could not address a third of the graph.

`validate_step_names.ts` missed `cases` and `default`, so duplicate names inside a switch case
passed validation despite name addressing requiring globally unique names (ADR-0001/spec 04).

### Key-set question

ADR-0003 proposed deleting `NESTED_STEP_KEYS` and replacing it with a single wider set. This is
wrong: `NESTED_STEP_KEYS` answers *three different questions* at three call sites in
`build_workflow_lookup.ts`:

1. **Is this key a step body rather than a property?** Used at the `propInfos` exclusion site
   (`:161`). Must remain the original 5 keys — widening it breaks `validate_parallel_mode` and
   `validate_parallel_fan_out`, which detect static branches via
   `Object.values(step.propInfos).some(p => p.key === 'branches')`. Both validators carry a comment
   from having hit this trap once for `steps`.
2. **Does this key name a branch identity?** Used at the branch-key site (`:143`). Must be widened
   to include `branches`/`cases`/`default`.
3. **Descend looking for nested steps?** The catch-all site (`:128`) uses the complement of the
   branch-key set.

A single set conflates all three and silently breaks the validators.

### Slot identity question

ADR-0003 described a `SlotId` union containing both `then` and `steps`, and an
`(child, slot) => void` callback signature. Both are wrong:

- Slot names are **YAML keys** (`steps`, not `then`). The YAML has no `then` key: `if.steps` holds
  the true branch. Rendering labels (`'true'`/`'false'`) are derived from `owner.type === 'if'` at
  render time; they are not traversal concerns.
- The callback signature `(child, slot)` puts child steps before slot identity, preventing a caller
  from skipping a slot without visiting its children. The per-slot signature `(slot, steps) => void`
  is cleaner and matches how each caller actually uses the result.

## Decision

### Shared enumerator

Replace all six enumerations with one:

```ts
// walk_step_tree.ts, exported from graph_layout/index.ts
export type StepChildSlot =
  | { readonly kind: 'steps' }
  | { readonly kind: 'else' }
  | { readonly kind: 'branch'; readonly index: number; readonly name?: string }
  | { readonly kind: 'case'; readonly index: number; readonly match: string | number | boolean }
  | { readonly kind: 'default' }
  | { readonly kind: 'fallback' }
  | { readonly kind: 'iteration-fallback' };

export type BranchSlot = Extract<
  StepChildSlot,
  { kind: 'steps' | 'else' | 'branch' | 'case' | 'default' }
>;

export const visitStepChildSlots = (
  step: Step,
  visit: (slot: StepChildSlot, steps: Step[]) => void
): void => { ... };
```

Slot kinds mirror **YAML keys** — `'steps'`, never `'then'`. Edge labels and fingerprint prefix
strings stay with their callers.

Two invariants for `visitStepChildSlots`:
- Emit a slot for every **declared** slot (with `steps: []` when the array is absent or empty),
  so that `transform_workflow_to_graph.ts` can distinguish "no `else` key" from "`else: []`" when
  deciding whether to synthesise a bypass lane.
- `fallback` is nested inside the `on-failure` / `iteration-on-failure` object — the only
  asymmetric slot. Emit `{ kind: 'fallback' }` from `step['on-failure']?.fallback` and
  `{ kind: 'iteration-fallback' }` from `step['iteration-on-failure']?.fallback`.

`walkStepTree` becomes a 3-line wrapper that calls `visitStepChildSlots` and recurses.

### Two key sets, not one

```ts
// Exported from @kbn/workflows, next to the enumerator
export const STEP_CHILD_CONTAINER_KEYS = [
  'steps', 'else', 'branches', 'cases', 'default',
  'on-failure', 'iteration-on-failure', 'fallback',
] as const;
```

`build_workflow_lookup.ts` is updated to:
- **Rename** `NESTED_STEP_KEYS` → `STEP_BODY_KEYS` (same 5 members; deprecated alias kept for
  any external consumers).
- Use `STEP_CHILD_CONTAINER_KEYS` (8 members) at the branch-key site.
- Leave the `propInfos` exclusion using the unchanged 5-key `STEP_BODY_KEYS`.

`get_step_node.ts` swaps `isNestedStepKey` for `STEP_CHILD_CONTAINER_KEY_SET`, enabling descent
into `branches`/`cases`/`default` generically.

### Fingerprint becomes fallback-sensitive

`compute_topology_fingerprint.ts` routes through `visitStepChildSlots` with no skip-list.
`fallback` and `iteration-fallback` slots now contribute to the fingerprint. The fingerprint value
changes for workflows that use `on-failure.fallback`, but this is unobservable: its only consumer
is a `useMemo` dependency in `use_workflow_layout.ts` — never persisted, serialised, or sent to the
server.

### Drift guard

Because `STEP_BODY_KEYS` (object model) and `STEP_CHILD_CONTAINER_KEYS` (AST) are two separate
lists, an invariant test in `walk_step_tree.test.ts` enforces that every slot kind emitted by
`visitStepChildSlots` maps to at least one key in `STEP_CHILD_CONTAINER_KEYS`. It fails the moment
the two enumerations diverge.

## Alternatives considered

**Delete `NESTED_STEP_KEYS` and use a single wider set everywhere.** Rejected: silently breaks
`validate_parallel_mode` and `validate_parallel_fan_out`, which detect static branches via
`propInfos`. The existing comment at `validate_parallel_mode.ts:45` records a prior incident where
widening this set caused exactly that failure.

**Keep `then` as a slot kind.** Rejected: the YAML has no `then` key. Using a key that doesn't
exist in the schema means every YAML-AST caller must translate; it's a permanent impedance mismatch.

**`(child, slot) => void` callback order (ADR-0003's proposal).** Rejected: callers that need to
skip a slot still receive the children array, forcing an early return inside the callback. The
`(slot, steps)` order lets callers bail before materialising the child list.

**Skip-list for the fingerprint.** Rejected: a skip-list is a second enumeration that must be kept
in sync. `visitStepChildSlots` is the enumeration; it should be the only one.

## Consequences

- `insertStep` can now address any step in the tree, including switch cases and parallel branches.
- `validate_step_names` now catches duplicate names inside switch cases — which are load-bearing for
  name addressing (ADR-0001/spec 04).
- `workflowLookup.steps[x].branchKey` can now express a switch case (`'cases[0].steps'`) rather
  than collapsing to `'steps'`; the minimap's per-branch identities no longer collide.
- The topology fingerprint changes for `on-failure.fallback` workflows; no consumer is affected.
- Any future slot kind must be added to `visitStepChildSlots` and `STEP_CHILD_CONTAINER_KEYS`; the
  invariant test catches the gap within the same test run.
- `visitStepChildren` is kept as a deprecated no-slot wrapper for callers not yet migrated.
