# Graph Entity Nodes — Zoom-based Detail Levels & Node Redesign

**Date:** 2026-07-22
**Status:** Draft (design)
**Scope:** Front-end only — zoom-detail switching mechanism + entity node redesign (zoomed-in card & zoomed-out tile).
**Package:** `x-pack/solutions/security/packages/kbn-cloud-security-posture/graph`

## Motivation

The Entity Graph carries visual/interaction tech debt from v9.4. As part of the
[graph visual & interaction design overhaul](https://github.com/elastic/security-team/issues/17241),
entity nodes are being redesigned to scale across entity types and data densities,
and to reveal detail progressively based on zoom (Google-Maps-style) —
[#17896 zoom-based detail levels](https://github.com/elastic/security-team/issues/17896).

This spec covers two of the overhaul's pieces:

1. A zoom-driven **detail-level** mechanism that lets nodes render a simplified or
   detailed representation depending on the current zoom.
2. A redesigned **entity node** with two variants — a detailed card and a
   simplified icon tile — matching the Figma component library.

The redesign of event/alert/relationship connector nodes, the bottom control bar,
the Display panel toggle, expanded icon mapping, keyboard shortcuts, in-graph
search, and any backend data sourcing are **out of scope** (see below).

## Design references (Figma)

File: `-9.5- Graph viz - Component Library` (`NKGsPiGKZ4rEwRVBnuctZ2`).

- Detailed entity card (grouped, default/primary state): `node-id=11961-7411`
- Detailed entity card danger/error state (single): `node-id=11961-9005`; grouped: `node-id=11961-9030`
- Simplified tile (zoomed-out) single: `node-id=12036-2288`; grouped: `node-id=12036-2327`;
  single hover: `node-id=12036-2339`; grouped hover: `node-id=12036-2344`

(Note: the node IDs listed under section 2b of the source ticket for "single
entity zoomed-in" resolve to the simplified tile; the detailed single card is the
primary-state analogue of the grouped card `11961-7411` / danger card
`11961-9005`.)

The Figma components map to real EUI components via Code Connect
(`EuiText`, `EuiNotificationBadge`, `EuiHealth`, `EuiBadge`), which the
implementation reuses.

### Detailed card anatomy (≈300px wide, ≈312px tall, radius 10px)

- **Header** — `primary` (`#f1f6ff`) or `danger` tinted background depending on state.
  - 40×40 entity icon tile (white, subdued border, radius 8px)
  - Entity name (semibold) + Entity type (subdued)
- **Metadata section** — white background, toggleable, padding 12px, gap 16px:
  - Row: **IP address** (value + `+99` `EuiNotificationBadge` subdued) | **Geolocation** (country flag + `+99`)
  - **Entity ID** (value + `+99`)
  - **Asset criticality** — `EuiHealth` dots: extreme (danger) / high (risk) / medium (warning) / low (neutral) with counts; a single entity shows one value
  - **Risk score** — `EuiBadge`(s): a single entity shows one badge; a grouped node shows min–max (e.g. `40.50 – 90.01`)
- **Grouped** — count badge (`EuiNotificationBadge`) overlapping the icon top-left + an 8px "stacked" bottom edge strip.
- Tokens: font-size medium 12px / line-height 16px, card radius 10px, icon radius 8px, spaces xs 4px.

### Simplified tile anatomy (≈40×40)

- White rounded-square tile with the entity icon; icon/border color reflects state (primary vs danger).
- **Grouped**: count badge (circular) top-left.
- **Hover**: circular "+" expand button on the right (reuses existing expand-button behavior).
- Per [#17896] the zoomed-out node is "icon + name only"; because the 40px tile
  cannot hold a name, the name is shown via `EuiToolTip` on hover.

## Current architecture (as-is)

- Rendering uses ReactFlow (`@xyflow/react`). `graph/graph.tsx` defines a
  `nodeTypes` map keyed by `nodeData.shape`.
- Entity nodes today are **five shape-specific components** —
  `hexagon_node.tsx`, `pentagon_node.tsx`, `ellipse_node.tsx`,
  `rectangle_node.tsx`, `diamond_node.tsx` — each rendering an SVG shape plus
  `node_details.tsx` (Tag on top; Label / Ips / CountryFlags below).
- `label` → `LabelNode` and `relationship` → `RelationshipNode` are connector
  pills on edges; `group` → `EdgeGroupNode`. **These are unchanged by this spec.**
- `processGraph` sets each ReactFlow node's `type` to `nodeData.shape`.
- Zoom: `minZoom=0.1`, `maxZoom=1.3` (`graph.tsx`). Controls live in
  `controls/controls.tsx` and use `useReactFlow()` + `useStore`. No `onMove` wired.
- Entity view model (`components/types.ts` + `common/schema/graph/v1.ts`):
  `id, label, icon, color (primary|danger|warning), shape, tag, count, ips[],
  countryCodes[], documentsData[]`, plus handlers `expandButtonClick`,
  `nodeClick`, `ipClickHandler`, `countryClickHandler`.
- The graph server response does **not** currently carry risk score or asset
  criticality on entity nodes.

## Proposed design

### 1. Detail-level mechanism (`components/detail_level/`)

A discrete detail level derived from the ReactFlow zoom, delivered through React
Context so nodes stay declarative and re-render only when the band changes.

```
components/detail_level/
  detail_level.ts               // DetailLevel type + threshold constant + mapping fn
  detail_level_context.tsx      // React Context + ZoomDetailLevelProvider + useDetailLevel
  detail_level.test.ts
  detail_level_context.test.tsx
```

- `type DetailLevel = 'simplified' | 'detailed'`.
- `DETAIL_LEVEL_ZOOM_THRESHOLD` constant, tuned to the Figma zoom bands
  (initial value ~0.5; adjustable). `getDetailLevel(zoom): DetailLevel`.
- `ZoomDetailLevelProvider` is rendered **inside** `<ReactFlow>` so it can call
  `useStore`. It subscribes to the zoom scale via a selector
  (`s => s.transform[2]`), maps it through `getDetailLevel`, and provides the
  resulting `DetailLevel` on context.
  - Because the provided value is the discrete band (not the raw zoom), context
    consumers re-render only when the band flips, not on every zoom tick.
  - `useStore` is preferred over `<ReactFlow onMove>` because the zoom value is
    only needed inside the ReactFlow tree and `useStore` is already reactive; no
    external zoom state is required.
- `useDetailLevel(): DetailLevel` — hook consumed by nodes.

**Rationale:** one module owns the threshold and the zoom subscription. Nodes call
`useDetailLevel()` and switch variant. We avoid mutating node `data` or node
`type` on zoom, which would force ReactFlow remounts / pipeline re-runs.

### 2. EntityNode component (`components/node/entity_node/`)

A single registered renderer that selects a variant, wrapping two dumb
presentational sub-components (chosen Approach A).

```
components/node/entity_node/
  entity_node.tsx            // registered renderer ("smart" wrapper)
  entity_node_detailed.tsx   // detailed card (mode = detailed)
  entity_node_simplified.tsx // simplified icon tile (mode = simplified)
  entity_icon.tsx            // shared: 40x40 icon tile + state color + count badge
  entity_node_metadata.tsx   // toggleable metadata section (card only)
  *.stories.tsx / *.test.tsx per component
```

**`EntityNode` (smart wrapper)**

- Registered in `nodeTypes` under `entity`; the five shape keys (`hexagon`,
  `pentagon`, `ellipse`, `rectangle`, `diamond`) are aliased to the same
  component so existing server payloads render without a server/schema change.
- Reads `const level = useDetailLevel()`.
- Reads the view model (`props.data as EntityNodeViewModel`) and `showMetadata`
  (default `true`).
- Renders the shared interactive chrome once, regardless of variant:
  `<Handle>` left `in` / right `out`; when `interactive`, the `NodeButton`
  (click) and `NodeExpandButton` (expand). Keeps click/expand identical across
  zoom levels.
- Delegates the visual body to `<EntityNodeDetailed>` or `<EntityNodeSimplified>`.

**`EntityNodeDetailed`** (pure presentational)

- Header (tinted by `color`): `<EntityIcon>` + name (`label`) + type (`entityType`).
- `<EntityNodeMetadata>` when `showMetadata` is true. Each row renders **only if
  its data is present and non-empty**:
  - IP address — reuses existing `Ips` component
  - Geolocation — reuses existing `CountryFlags` component
  - Entity ID — `entityId`
  - Asset criticality — `EuiHealth` dots (per Code Connect)
  - Risk score — `EuiBadge`(s) (single value, or min–max for grouped)
- Grouped (`showStackedShape(count)`): count badge on the icon + 8px stacked
  bottom edge strip.

**`EntityNodeSimplified`** (pure presentational)

- `<EntityIcon>` only; name shown via `EuiToolTip` on hover.

**`EntityIcon`** (shared)

- 40×40 rounded tile; icon from the `icon` field; state color from `color`;
  optional `EuiNotificationBadge` count when grouped. Used by both variants to
  keep them visually consistent.

### 3. View model & data gating

Add the following **optional** fields to `EntityNodeViewModel` (front-end only;
all optional and gated on presence — the server continues to send what it sends):

| Field | Type | Drives | Source today |
|-------|------|--------|--------------|
| `entityType` | `string?` | Header "Entity type" subtitle | mapped from `entity.type` / `sub_type` (already in `entitySchema`) |
| `entityId` | `string?` | "Entity ID" metadata row | node `id` / entity id (available) |
| `riskScore` | `{ value?: number } \| { min?: number; max?: number }?` | "Risk score" badge(s) | not in payload yet — row hidden until backend follow-up |
| `assetCriticality` | discrete level(s) + counts `?` | "Asset criticality" health dots | not in payload yet — row hidden until backend follow-up |

- `ips` and `countryCodes` already exist → wired directly.
- **Gating rule:** each metadata row renders only when its field is present and
  non-empty. With today's payload the card shows header + IP + Geolocation +
  Entity ID; risk score and asset criticality appear automatically once the
  backend populates them — no UI change required later.
- **View-model mapping:** the entity-node builder (`buildGraphFromViewModels` /
  the entity node construction path) maps `entity.type`/`sub_type` → `entityType`
  and `id` → `entityId` at the view-model boundary, keeping presentational
  components dumb.
- `showMetadata`: added to the base node view model (or threaded as an
  `EntityNode` prop), default `true`. The toggle owner (Display panel) is out of
  scope; this spec only exposes the prop.

### 4. Graph wiring & migration

- `graph/graph.tsx`:
  - `nodeTypes` gains `entity: EntityNode`; the five shape keys alias to
    `EntityNode`.
  - Wrap the nodes region with `<ZoomDetailLevelProvider>` (inside `<ReactFlow>`).
  - `processGraph` continues to set `type: nodeData.shape` — valid because all
    shape keys map to `EntityNode`. (Normalizing to `'entity'` is an optional
    later cleanup; kept as-is now to minimize churn.)
- `components/node/index.ts`: export `EntityNode`; remove the five shape-node
  exports.
- **Delete** `rectangle_node.tsx`, `ellipse_node.tsx`, `hexagon_node.tsx`,
  `pentagon_node.tsx`, `diamond_node.tsx`, and `node_details.tsx`.
- **Reuse** `Ips`, `CountryFlags`, `NodeExpandButton`, `showStackedShape`,
  `isEntityNode`.

## Testing

**Unit (Jest)**

- `EntityNode`: variant selection by detail level; expand/click handlers fire;
  handles present; `showMetadata` respected.
- `EntityNodeDetailed`: each metadata row gates on presence; grouped stacked edge
  + count badge; default vs danger state.
- `EntityNodeSimplified`: icon + tooltip; count badge when grouped.
- `EntityIcon`: icon, state color, count badge.
- `detail_level`: `getDetailLevel` threshold mapping; `useDetailLevel` /
  `ZoomDetailLevelProvider` re-renders only on band change, not per zoom tick.

**Storybook**

- Stories per variant/state, including a detailed card with mock `riskScore` and
  `assetCriticality` args so the complete card is visible in Storybook even
  before the backend supplies those fields. (Runtime gating is unchanged; only
  the stories provide mock values.)
- A zoom-band story demonstrating the switch between detailed and simplified.
- Remove/replace `node.test.tsx`, `node.stories.tsx`, and the shape-specific
  stories that referenced the deleted components.

## Out of scope

Each has its own ticket/spec:

- Event/alert/relationship connector node redesign (deferred by scope decision).
- Bottom control bar ([#17895]) and Display panel toggle that drives
  `showMetadata` ([#17900]).
- Expanded icon mapping / AI-LLM icons ([#17894]).
- Backend sourcing of risk score & asset criticality (follow-up ticket) — this
  spec only renders them when present and supplies mock values in Storybook.
- Keyboard shortcuts ([#17901]); in-graph search & filtering ([#17897]);
  select/pan mode separation ([#17898]).

## Open questions

- Exact `DETAIL_LEVEL_ZOOM_THRESHOLD` value — start ~0.5, tune against Figma zoom
  bands during implementation.
- Final shape of the `assetCriticality` view-model field (levels + counts) — to
  be confirmed with the backend follow-up so the render-only contract matches
  what the server will send.

## Sources

- [#17241 Meta — Entity Graph visual & interaction design overhaul](https://github.com/elastic/security-team/issues/17241)
- [#17892 Redesign entity node cards](https://github.com/elastic/security-team/issues/17892)
- [#17896 Implement zoom-based detail levels](https://github.com/elastic/security-team/issues/17896)
- [#17894 Update entity type icon system](https://github.com/elastic/security-team/issues/17894)
- Figma: `-9.5- Graph viz - Component Library` (`NKGsPiGKZ4rEwRVBnuctZ2`)
- ReactFlow `onMove` / zoom store: https://reactflow.dev/api-reference/types/on-move
