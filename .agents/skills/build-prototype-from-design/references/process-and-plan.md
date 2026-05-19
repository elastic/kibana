# Process design and plan

Step 1 — read the design, decide what to build, and produce a short plan **before** writing code.

## Inputs

| Input | Action |
|-------|--------|
| **Figma URL** | Figma MCP: `get_design_context`, `get_screenshot`, `get_variable_defs`. No raw HTTP for figma.com. |
| **Screenshot / image** | Layout, hierarchy, states, copy; request Figma if pixel fidelity matters. |
| **Text / brief** | Screens, flows, constraints, open questions. |

## Agent flow

### A. Understand the design

1. **Scope** — screen(s), user flow, states (default, loading, empty, error).
2. **EUI vs KUI** — for each UI element, classify and record in the plan (see [below](#b-map-elements-eui-vs-kui)).
3. **Kibana surface** — chrome vs application workspace ([kbn-ui layout](../../../../src/platform/kbn-ui/README.md)); Search vs Observability vs Security context.
4. **Data** — mock in code vs real indices (note for step 4 [ingest-data](ingest-data.md)).
5. **Versions** — one design or multiple iterations (note for step 5 [build-version-panel](build-version-panel.md)).

Use **AskQuestion** when intent is ambiguous.

### B. Map elements: EUI vs KUI

**EUI** — generic design-system components from `@elastic/eui` (buttons, forms, tables, `EuiPage`, flyouts, etc.). Source of truth: [eui.elastic.co](https://eui.elastic.co).

**KUI (Kibana UI)** — Kibana-owned UI that wraps EUI or owns chrome / platform behavior. Do **not** rebuild these with raw EUI if a KUI package already exists.

| Layer | Where to look | Examples |
|-------|----------------|----------|
| **`@kbn/kbn-ui`** | [`src/platform/kbn-ui/`](../../../../src/platform/kbn-ui/README.md) — packages `@kbn/ui-*` | [`@kbn/ui-side-navigation`](../../../../src/platform/kbn-ui/side-navigation/README.md) (solution left nav) |
| **Shared UX** | [`src/platform/packages/shared/shared-ux/`](../../../../src/platform/packages/shared/shared-ux/README.mdx) — packages `@kbn/shared-ux-*` | `KibanaPageTemplate`, exit full screen, avatars, file picker |
| **Chrome / layout** | [kbn-ui README](../../../../src/platform/kbn-ui/README.md) · [chrome layout engineering](../../../../core/packages/chrome/layout/layout_overview.mdx) | Header, grid, app workspace, right sidebar |
| **Platform building blocks** | [Building blocks (dev)](https://docs.elastic.dev/kibana-dev-docs/key-concepts/building-blocks) | Query bar, Lens/Dashboard embeddables, index patterns |

**Agent flow per design element:**

1. Check **EUI** first — can `Eui*` cover it?
2. If the element is **navigation chrome**, **page shell**, or **Kibana-specific behavior** → search **KUI**:
   ```sh
   ls src/platform/kbn-ui/
   rg -l "<keyword>" src/platform/kbn-ui/ src/platform/packages/shared/shared-ux/ --glob '*.{ts,tsx,md}'
   ```
3. If Figma uses **Elastic UI** library components, prefer the matching **EUI** (or existing **KUI** if Code Connect / docs point to Kibana).
4. If nothing exists → **custom** in the prototype plugin (EUI primitives only); flag for platform UX if it looks reusable.

Record in the plan as a table: `| Element | EUI | KUI package | Custom | Notes |`.

### C. Decide how to host it in Kibana

| Situation | Plan → step 2 path |
|-----------|-------------------|
| New screen / isolated prototype / compare versions in one app | **`new_plugin`** — `examples/<snake_case>/` |
| Small change in an existing **example** | **`tweak_example`** — e.g. `examples/search_examples` |
| Change inside a **production** app (Discover, Security, …) | **`tweak_app`** — higher coupling; only if user insists |

Default for design prototypes: **`new_plugin`**.

### D. Plan output (confirm with user)

Deliver a brief checklist:

- Host: `new_plugin` | `tweak_example` | `tweak_app` (+ target path)
- **EUI vs KUI map** (per-element table from step B)
- Chrome / layout areas touched (if any)
- States to implement (in order: default first)
- Mock vs live data; sample data type if live (stack / obs / security)
- Multiple versions? (yes → version panel in step 5)
- Plugin id / folder name (if `new_plugin`)

## Handoff

→ [implement.md](implement.md)
