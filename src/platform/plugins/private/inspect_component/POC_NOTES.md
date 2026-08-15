# PoC Notes — Live Prop Editing for inspect_component

## What was built

Three capabilities were added on top of the existing component inspector:

### 1. Live prop preview (DevTools `overrideProps`)

`public/lib/force_rerender.ts` — uses the `__REACT_DEVTOOLS_GLOBAL_HOOK__` API to call
`overrideProps(fiberId, [propName], newValue)` on the renderer interface that owns the
target component. The component re-renders instantly in the browser without a page reload.

**Why DevTools, not a custom mechanism?** In React, props flow parent → child. Changing
a child's props without re-rendering the parent (which would still pass the original JSX
values) requires injecting into the child fiber's `pendingProps` and scheduling an update
on that specific fiber. React does not expose this publicly. `overrideProps` is exactly
that side-channel and is the same mechanism the DevTools "Components" panel uses for its
own prop-editing feature.

**Storybook is not a precedent** — Storybook owns the parent, so it can simply re-render
its own wrapper with new control values. We don't own the parent in this PoC.

**Requirement:** the React DevTools browser extension must be installed. The hook is
injected at page load regardless of whether the panel is open, so users do **not** need
to keep the DevTools panel open to use live preview. If the extension is absent, the
flyout shows a yellow callout with an install link.

**Diagnostics:** `force_rerender.ts` returns one of seven specific failure reasons
(`devtools_hook_missing`, `no_renderer_interfaces`, `fiber_not_found`,
`getfiberidfornative_missing`, `overrideprops_missing`, `id_lookup_failed`,
`override_threw`), surfaced inline next to the prop input. It also logs detailed
information to `console.debug` so renderer-interface incompatibilities can be diagnosed
quickly.

**Known PoC limitation:** the host-instance lookup currently tries three candidate DOM
nodes in order — the clicked element, the element stored on the fiber cursor, and the
first host descendant of the component fiber. `getFiberIDForNative(node, true)` walks up
to the nearest unfiltered ancestor for ID resolution. For most EUI components this
resolves to the intended component fiber, but edge cases (memo / forwardRef wrappers,
components rendered through portals) may resolve to a wrapper rather than the inner
component, in which case `overrideProps` silently affects the wrapper.

### 2. Commit prop to source (surgical AST rewrite)

`server/routes/commit_prop.ts` — POST `/internal/inspect_component/commit_prop`

Parses the source file with `@babel/parser`, walks the AST to locate the exact
`JSXAttribute` node at the given line, then splices the replacement string using the node's
`start`/`end` byte offsets. Deliberately avoids `@babel/generator` to prevent reformatting
unrelated lines.

Safety guards:
- Path must start with `REPO_ROOT` (rejects writes outside the repo)
- `mtime` conflict detection (>100 ms tolerance): if another process wrote the file since
  the flyout opened, the server returns `file_changed_on_disk` and the client shows a
  warning toast
- Computed attribute values (expressions other than string/number/boolean literals) are
  rejected with `computed_value`
- Spread-only components (no individual `JSXAttribute` nodes) return `spread_only`

After commit, Kibana's dev-server HMR reloads the affected module and the component
re-renders with the persisted prop value — independent of the DevTools-based live preview.

### 3. On-demand prop docgen

`server/lib/docgen_cache.ts` + `server/routes/docgen.ts` — GET `/internal/inspect_component/docgen`

Uses `react-docgen-typescript` with `withCustomConfig` to parse a single tsconfig. The
`ts.Program` is reused across requests (warm cache). Cache is invalidated per component file
via `mtime`.

`server/lib/resolve_component_source.ts` follows the import chain from the use-site file up to
5 hops to find the file where the component is actually defined (skips barrel re-exports).

Docgen is used in the UI to:
- Render `EuiSelect` for string-literal union prop types (instead of a plain text field)
- Show the type string and default value below each prop row
- Show the prop description in the `EuiToolTip`

## UI changes

### Props section (`public/components/inspect/flyout/props_section.tsx`)

Added as a new `EuiAccordion` panel below the existing Actions section in the flyout.
The visual model is "props table" — Chrome DevTools Styles panel style — with a row per
prop and an "Add prop" affordance at the bottom of the explicit list.

- **Explicitly set props** — shown first; sourced from `explicitProps` returned by the
  `get_component_data` route (extracted from the JSX AST at the component's line/column).
  User-added props are merged into the same list in insertion order.
- **Add prop** — `EuiButtonEmpty` that expands into an inline `EuiComboBox`. Options are
  docgen-known props that aren't already shown; `onCreateOption` lets the user type a
  free-form name when docgen returned nothing (e.g. components imported through TS path
  aliases the docgen `ts.Program` doesn't see). On select, the row is inserted with a
  default value chosen by `inferDefaultValueForProp` (docgen `defaultValue` → first union
  member → type-derived blank) and the value is pushed through live preview immediately.
- **Per-prop controls**: `EuiSwitch` for booleans, `EuiFieldNumber` for numbers,
  `EuiSelect` for string-literal unions (from docgen), padding/color token fallback
  dropdowns when docgen is silent on well-known EUI prop names, `EuiColorPicker` for
  free-form colors, `EuiDatePicker` for date-shaped values, `EuiFieldText` + `EuiIcon`
  preview for `iconType`, `EuiFieldText` otherwise, badge for complex values
- **Reset button** — appears when a non-added prop's current display value differs from
  its original (flyout-open) value; restores via another `forceRerenderWithProps` call
- **Remove button** — replaces Reset on user-added (`isNew`) rows; deletes the row from
  local state. **Does not** revert the live DevTools override — see "Known gaps" below.
- **Commit button** — appears when a prop has been changed and is a primitive type, OR
  for any user-added row regardless of value-change state (since the prop isn't on disk
  yet). Triggers the server-side AST rewrite (update for existing attrs, insert for
  new ones) and updates the stored mtime on success.
- **DevTools callout** — yellow warning with install link shown when
  `__REACT_DEVTOOLS_GLOBAL_HOOK__` is absent at mount time (extension not installed)

## Dependencies added

- `react-docgen-typescript` added as a direct devDependency in the root `package.json`
  (was previously only transitive via `@storybook/react-docgen-typescript-plugin`)
- `kibana.jsonc` — added `"devOnly": true` so that devDependencies are available in all
  non-test plugin files (the plugin only runs in development, so this is correct)

## Known gaps / follow-up work

- `columnNumber` is included in the route schema but the AST walker currently only matches
  by `lineNumber`. For files with multiple JSX elements on the same line, column-based
  disambiguation would be needed.
- The docgen warm-up is synchronous and happens in the Kibana `setup()` phase. On very
  large repos the initial `ts.Program` construction takes a few seconds. Consider deferring
  to first request or running in a worker thread.
- `resolveComponentSource` uses `require.resolve()` at runtime, which handles relative
  imports and node_modules but not TypeScript path aliases (e.g. `@kbn/...` package imports
  that are only mapped via tsconfig). These will return `null` from `resolveModulePath` and
  docgen silently falls back to no type info.
- `overrideProps` resolves the fiber ID by walking up to the nearest unfiltered ancestor.
  For components wrapped in `React.memo` or `React.forwardRef`, the ID may correspond to
  the wrapper rather than the inner component, causing the override to have no visible
  effect. A retry up the `return` chain could address this.
- **"Remove" on an added prop does not revert the live preview.** There's no clean
  semantic for "un-setting" a value that `overrideValueAtPath` forcibly injected — DevTools
  has no public "clear override" API and setting the path to `undefined` is renderer-
  specific. The row disappears from the inspector but the component continues rendering
  with the injected value until something else triggers a reconciliation (a parent
  re-render, HMR, or a page reload). Considered an acceptable PoC trade-off; a follow-up
  could keep a per-fiber "overrides journal" and replay everything-except-this on remove,
  but the complexity isn't justified yet.
