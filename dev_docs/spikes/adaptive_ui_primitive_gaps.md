# Adaptive UI primitive gaps

**Status:** shipped — kept as the record of the contract that landed · **Upstream:** [#97](https://github.com/elastic/adaptive-ui-poc/pull/97), in its own `@elastic/adaptive-ui-primitives-diagrams` pack rather than the charts pack · **Vendored here at** `531b331e` · **No open gaps**

Gaps found while writing `data → ViewSpec` adapters for real Agent Builder attachments (see [`adaptive_ui_portable_chat_review.md`](adaptive_ui_portable_chat_review.md)). Each entry is a request for the upstream Adaptive UI pack. Once a primitive ships, Kibana re-vendors `@elastic/adaptive-ui-host-kibana` into `@kbn/adaptive-ui` and tightens the affected adapter. The Kibana follow-up is listed at the bottom; do not do it in the Adaptive UI PR.

This file is written so an agent in `elastic/adaptive-ui-poc` can execute it without opening Kibana. Read `AGENTS.md`, [`.okf/adaptive-ui/playbooks/add-a-primitive.md`](https://github.com/elastic/adaptive-ui-poc/blob/main/.okf/adaptive-ui/playbooks/add-a-primitive.md), [`.okf/adaptive-ui/systems/primitive-catalog.md`](https://github.com/elastic/adaptive-ui-poc/blob/main/.okf/adaptive-ui/systems/primitive-catalog.md), and [`docs/primitive_authoring.md`](https://github.com/elastic/adaptive-ui-poc/blob/main/docs/primitive_authoring.md) first. Closest existing primitive to copy: `heatmap` (relational, variable `svgHeight`, no Slack renderer, PNG via `slackAssetTypes`).

`docs/agent_builder_primitive_enhancements.md` currently lists `graph` / `observability.service-map` as out of scope because they "need an interactive node-edge canvas." That is wrong for Adaptive UI. Adaptive UI views are one-shot and display-only ([display-only input primitives](https://github.com/elastic/adaptive-ui-poc/blob/main/.okf/adaptive-ui/decisions/display-only-input-primitives.md)). The interactive React Flow canvases stay in Kibana; this primitive is a laid-out SVG diagram that the same `ViewSpec` can also render as text, markdown, Slack PNG, and raster. Update that out-of-scope sentence when the primitive lands.

---

## `graph` — node–edge topology

**Status:** shipped in the `diagrams` pack. `graphSchema` caps a node at 24 nodes and 48 edges with unique ids, so adapters trim a live topology first ([`toGraphTopology`](../../x-pack/platform/packages/shared/adaptive-ui-adapters/src/shared.ts)).

**Why the charts pack, not components:** Slack has no graph block. Charts already declare `slackAssetTypes: [...CHART_PRIMITIVE_TYPES]` in `src/primitives/pack.ts`, so a chart node becomes an `image` block plus a PNG upload request instead of a markdown approximation. A components primitive would degrade through GFM and lose the diagram on the first external surface that matters (Slack). Put `graph` on that same PNG path.

**Kibana adapters that now draw a real diagram:**

| Attachment | Adapter in this Kibana tree | What the live attachment draws |
| --- | --- | --- |
| `graph` | `x-pack/platform/packages/shared/adaptive-ui-adapters/src/graph.ts` | React Flow canvas (`@xyflow/react`) of entity / lateral-movement topology. Wire: `nodes[].id`, `nodes[].data.label`, optional `nodes[].position`, `edges[].source` / `target` / `label`. |
| `observability.service-map` | `x-pack/platform/packages/shared/adaptive-ui-adapters/src/service_map.ts` | React Flow + dagre of APM service dependencies. Wire: `connections[]` of `{ source, target, metrics? }`; nodes are derived. Service health and edge latency / error rate / throughput are the presentational payload. |

**What replaced the degraded render:** both adapters dropped the `callout` / `statGroup` / `table` / `badge` body for a single `graph` node. `graph.ts` maps the attachment's `type` onto the node group; `service_map.ts` maps service health onto node tone, latency and error rate onto the edge label, and throughput onto edge weight, so no companion table is needed.

### Contract (wire node)

Keep the node small, semantic, and layout-free. The model lays the graph out. Do not accept React Flow `position: { x, y }` or APM's nested `service.name` objects — adapters flatten those.

```ts
import type { BodyNodeBase, Tone } from '@elastic/adaptive-ui-sdk';

interface GraphNodeItem {
  id: string;
  label?: string;
  tone?: Tone;
  group?: string;
}

interface GraphEdgeItem {
  source: string;
  target: string;
  label?: string;
  tone?: Tone;
  weight?: number;
}

interface GraphNode extends BodyNodeBase {
  type: 'graph';
  label?: string;
  layout?: 'hierarchical' | 'circular';
  nodes: GraphNodeItem[];
  edges: GraphEdgeItem[];
}
```

Field rules:

- `id` is the join key. Edges that name a missing `source` / `target` are dropped in the model (and warned via schema refine if cheap); they must not throw at render.
- `label` on a node falls back to `id`. `label` on an edge is the caption (relationship, latency, error rate). `weight` maps to stroke width only; do not invent a caption from it when `label` is absent.
- `tone` on a node is severity / health (`success` / `warning` / `danger` / `neutral` / …). `tone` on an edge is the same vocabulary (a high error-rate dependency is `danger`).
- `group` is an optional category (APM `service` vs `db`, Security `user` vs `host`). v1 may ignore it visually other than a legend of distinct groups; do not add icon packs or per-type node chrome.
- `layout` defaults to `'hierarchical'`. That matches both consumers (a path, a dependency DAG). `'circular'` is the escape hatch for small cyclic graphs. Do not ship `'force'`: force-directed layout is non-deterministic and breaks SVG goldens / PNG raster.
- Directed. Arrowheads on SVG/React. Text/markdown uses `→`.
- Orphan nodes (no incident edges) still render.
- Cycles: hierarchical layout must terminate (place remaining nodes on the last rank). Do not throw.

Schema bounds (chat-card sized; the interactive canvas remains Kibana's job for large maps):

- `nodes`: min 1, max 24.
- `edges`: min 0, max 48.
- `id` / `source` / `target` / labels: `requiredString` / `optionalString` from `@elastic/adaptive-ui-sdk`.
- `weight`: optional finite number ≥ 0.
- `layout`: `enumOf(['hierarchical', 'circular'])`.
- Duplicate `nodes[].id` is a validation error.

Use `toneSchema`, `requiredString`, `optionalString`, `enumOf` from `@elastic/adaptive-ui-sdk`, matching `treemap/schema.ts` / `donut/schema.ts`.

### Model

`createGraphModel(node)` is the only place layout, defaults, and formatting happen. Renderers project the model; they do not re-layout or reformat. This is the same split as `createDonutModel` / `createHeatmapModel`.

The model should resolve at least:

- `label`, `ariaLabel` (`node.label ?? 'Graph'`).
- `layout` with the default applied.
- `nodes[]` with `label`, `tone` (default `'neutral'`), `group`, and **deterministic** `x` / `y` in a 0–100 (or pixel) plot box.
- `edges[]` with resolved endpoint coordinates, `label`, `tone`, and a stroke width derived from `weight` (default 1; clamp to a small range so one heavy edge cannot dominate).
- Dropped-edge / unknown-id counts if you want the text renderer to mention them; otherwise just omit.

**Layout, no new dependencies.** The charts pack has no dagre / d3-force / xyflow dependency and should not grow one for this. Implement two small pure functions in `model.ts` (or `layout.ts` next to it):

- **Hierarchical:** longest-path / BFS rank from sources (nodes with in-degree 0; if none, pick a stable first id). Place ranks as columns (left→right, matching "source → target" reading order). Space nodes evenly within a rank, sorted by `id` so the layout is stable. Size the plot so labels fit; do not require a fixed 144px like the donut.
- **Circular:** nodes in `id`-sorted order on a circle; edges as chords (or short arcs). Fine for ≤ ~8 nodes; still legal up to the schema max.

Both must be deterministic given the same `nodes` / `edges` arrays. No `Math.random`, no iteration-count-sensitive force sim.

`svgHeight` grows with rank count (hierarchical) or is constant (circular), same idea as heatmap's `rows * 26`. A starting formula: `(node.label ? 24 : 0) + 48 + rankCount * 56`, clamped to something a card can hold (e.g. 360). Tune against the two examples so labels do not clip.

Satori (SVG/PNG) understands flex and inline styles, not CSS grid — see the comment on `heatmap/renderers/svg.tsx`. The diagram itself should be a real `<svg>` of circles (or rounded rects) + lines + `<text>`, not a CSS-positioned pile of divs. React may use `createStyleModule` + `chartStyles` for the frame/legend and the same SVG for the plot, so React and PNG stay in lockstep.

### Surfaces

| Surface | Required | What to emit |
| --- | --- | --- |
| React | yes | Framed diagram + optional label. Node fill from `toneVisColor`. Edge labels readable. Not interactive: no drag, no pan/zoom, no React Flow. Host chrome owns "Open in Kibana". |
| SVG | yes (pack declares `svg`) | Same diagram, Satori-safe. Used for PNG raster (`renderPNG`) which Kibana's `post_view_to_slack` already collects for every `CHART_PRIMITIVE_TYPES` node. |
| text | yes | First-class, 80-column. Not a shrug. Label (uppercase) then one `source → target` line per edge, with the edge label when present, then a compact node list if orphans exist. Collapse past ~12 edges with `+N more`. |
| markdown | yes | `defaultMarkdownFromText(renderGraphText, { label: (node) => node.label })` like donut/heatmap. A GFM table is acceptable if it stays equivalent to the text lines. |
| Slack renderer | no | Omit `renderers/slack`. With `collectAssets: true` the dispatcher swaps the node for an `image` + upload (this is why it is a chart). Without assets it falls through markdown→mrkdwn, which is the floor, not the target — the PNG path is the Slack target. |

Text shape to match (canonical example):

```text
LATERAL MOVEMENT PATH
  a.wong → finance-web-03  authenticated
  finance-web-03 → finance-db-01  lateral move
```

Do not emit the Kibana degraded callout ("Graph shown as a connection table") from the primitive. That sentence exists only because the primitive is missing.

### Catalog copy

Agents read `purpose` / `useWhen` / `avoidWhen`; evals score whether the copy steers. Be specific about when *not* to use it — the measured failure mode is grabbing an expressive primitive when a table would do.

```ts
{
  type: 'graph',
  purpose: 'Shows a compact directed node–edge topology (dependencies, paths, blast radius).',
  useWhen: [
    'The answer is a small directed graph: service dependencies, lateral movement, or a path of related entities.',
    'Spatial layout (who connects to whom) is the point, not a ranked list of the same rows.',
  ],
  avoidWhen: [
    'There is no topology — just a list of entities. Use `itemList`, `table`, or `badge`.',
    'There are more than ~24 nodes or ~48 edges; aggregate first. Large interactive maps stay in the host canvas.',
    'The comparison is a 2D quantity matrix (origin × destination counts). Use `heatmap`.',
    'The comparison is part-to-whole share. Use `donut` or `treemap`.',
  ],
}
```

### Examples

Two examples, both valid under the schema, both used by conformance. The first is the catalog canonical (Security `graph` attachment). The second is the Observability service-map shape after the adapter has flattened nested APM nodes.

```ts
export const graphCanonicalExample: GraphNode = {
  type: 'graph',
  label: 'Lateral movement path',
  layout: 'hierarchical',
  nodes: [
    { id: 'a.wong', label: 'a.wong', group: 'user' },
    { id: 'finance-web-03', label: 'finance-web-03', group: 'host' },
    { id: 'finance-db-01', label: 'finance-db-01', group: 'host' },
  ],
  edges: [
    { source: 'a.wong', target: 'finance-web-03', label: 'authenticated' },
    { source: 'finance-web-03', target: 'finance-db-01', label: 'lateral move' },
  ],
};

export const graphServiceMapExample: GraphNode = {
  type: 'graph',
  label: 'Service dependencies',
  layout: 'hierarchical',
  nodes: [
    { id: 'checkout', label: 'checkout', group: 'service', tone: 'danger' },
    { id: 'payment-service', label: 'payment-service', group: 'service', tone: 'danger' },
    { id: 'cart', label: 'cart', group: 'service', tone: 'success' },
    { id: 'postgres', label: 'postgres', group: 'db', tone: 'warning' },
  ],
  edges: [
    { source: 'checkout', target: 'payment-service', label: '320 ms · 6.1% err', tone: 'danger', weight: 1200 },
    { source: 'checkout', target: 'cart', label: '45 ms', tone: 'neutral', weight: 1800 },
    { source: 'payment-service', target: 'postgres', label: '210 ms · 2.0% err', tone: 'warning', weight: 1100 },
  ],
};

export const graphExamples: GraphNode[] = [graphCanonicalExample, graphServiceMapExample];
```

A third example with `layout: 'circular'` is useful if cheap (a 4-node cycle) but not required for v1.

### Files to add or touch

`yarn create:primitive --kind chart` **throws** in this repo (`Chart primitives live in @elastic/adaptive-ui-primitives-charts, not this package.`). Copy `src/primitives/charts/heatmap/` (or `treemap/`) into `src/primitives/charts/graph/` and rewrite.

**New (charts pack):**

| File | Role |
| --- | --- |
| `src/primitives/charts/graph/types.ts` | `GraphNode`, item types, `GraphModel`. |
| `src/primitives/charts/graph/schema.ts` | Zod wire contract + bounds. |
| `src/primitives/charts/graph/examples.ts` | Canonical + service-map examples. |
| `src/primitives/charts/graph/catalog.ts` | `purpose` / `useWhen` / `avoidWhen`. |
| `src/primitives/charts/graph/model.ts` | Layout + defaults. Pure. |
| `src/primitives/charts/graph/index.tsx` | `definePrimitive<GraphNode>`. No `renderers.slack`. `metrics.svgHeight` from the model / rank count. |
| `src/primitives/charts/graph/renderers/react.tsx` | Frame + SVG plot. `createStyleModule('graph', …)` + `chartStyles`. |
| `src/primitives/charts/graph/renderers/svg.tsx` | Satori-safe SVG. |
| `src/primitives/charts/graph/renderers/text.ts` | Adjacency lines, 80 columns. |
| `src/primitives/charts/graph/renderers/markdown.ts` | `defaultMarkdownFromText`. |
| `src/primitives/charts/graph/layout.test.ts` (or next to model) | Hierarchical order, cycle termination, orphan nodes, dropped unknown-id edges, determinism. |

**Registration (easy to miss; codegen does not invent these):**

1. `src/primitives/charts/common/chart_types.ts` — add `'graph'` to `CHART_PRIMITIVE_TYPES`. This is what puts it on the Slack PNG path (`pack.ts` spreads that set into `slackAssetTypes`) and the chart profile's `standalonePreviewTypes`.
2. `scripts/generate_primitives.ts` — add `'graph'` to `primitiveOrder` (alphabetically with the other snake_case folders). Then `yarn workspace @elastic/adaptive-ui-primitives-charts generate:primitives`. That rewrites `src/generated/{registry,builders,jsx,index}.ts`. Do not hand-edit those.
3. `yarn workspace @elastic/adaptive-ui-primitives-charts fixtures:generate` — publishes `fixtures/graph/0/` and `fixtures/graph/1/`. Drift is gated by `conformance_fixtures.test.ts`.
4. `packages/adaptive-ui-site/src/data/primitive_categories.ts` — add a `Topology` chart category (or put `graph` under `Comparison` if you refuse a new category) and a `primitiveLabels.graph` entry. Site gallery pickup is filesystem+registry; this file is the sidebar order and will type-error until `graph` is in `ChartBodyNode`.
5. `.okf/adaptive-ui/systems/primitive-catalog.md` — catalog is currently 43 body primitives (29 components + 14 charts). After this lands it is 44 (29 + 15). Add a Charts row for `graph`. Follow `.okf/adaptive-ui/workstreams/okf-maintenance.md`: inspect anchors, `yarn okf:check && yarn okf:index`, record in `.okf/adaptive-ui/log.md`.
6. `docs/agent_builder_primitive_enhancements.md` — remove `graph` / `observability.service-map` from the out-of-scope paragraph; point at this primitive.
7. Workspace consumers in the same PR per [poc-internal-consumers](https://github.com/elastic/adaptive-ui-poc/blob/main/.okf/adaptive-ui/decisions/poc-internal-consumers.md): site (above), examples if a flagship view should show a graph, converter only if a Lens/vis type newly maps (it should not — this is topology, not a Lens chart). Host packages (`adaptive-ui-host-kibana`, slack, svg, mcp) compose `chartsPack` and should pick the type up with no code change once it is in the pack.

No URL-bearing fields, so the URL trust-boundary tests do not grow.

### Worked mapping (so the shape is not renegotiated)

Kibana adapters will do the domain flattening. The primitive must accept the results below without further interpretation.

**`graph` attachment → `GraphNode`**

```ts
graph({
  label: data.title,
  layout: 'hierarchical',
  nodes: data.nodes.map((n) => ({ id: n.id, label: n.data.label })),
  edges: data.edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
});
```

Positions and `markerEnd` are dropped. `description` stays a sibling `text` node on the view, not a graph field.

**`observability.service-map` → `GraphNode`**

```ts
graph({
  label: data.title ?? 'Service map',
  layout: 'hierarchical',
  nodes: uniqueServices.map((s) => ({
    id: s.name,
    label: s.name,
    group: s.type,
    tone: HEALTH_TONE[s.health],
  })),
  edges: data.connections.map((c) => ({
    source: c.source,
    target: c.target,
    label: formatEdgeLabel(c), // e.g. "320 ms · 6.1% err"
    tone: (c.error_rate ?? 0) >= 0.05 ? 'danger' : 'neutral',
    weight: c.throughput_tpm,
  })),
});
```

`formatEdgeLabel` already exists on the Kibana APM renderer (`latencyMs`, `throughputPerMin`, `errorRate`). The primitive just draws the string.

### Done when

In `elastic/adaptive-ui-poc`, on `@elastic/adaptive-ui-primitives-charts`:

- `validateView` accepts a view whose body is a `graph` node; rejects duplicate ids, empty `nodes`, over-max arrays.
- Both examples render through the charts conformance harness (React, HTML, SVG, text, markdown, Slack dispatch) without throwing.
- Text for the canonical example contains `a.wong`, `finance-web-03`, `lateral move`, and a `→`. Text for the service-map example contains `checkout`, `payment-service`, `320`, and `postgres`.
- `isChartPrimitiveType('graph')` is true, so Slack asset collection requests a PNG for it.
- `yarn generate:primitives:check` is clean. Fixtures for `graph/0` and `graph/1` are committed.
- `yarn svg:fixtures && yarn svg:check` passes for the new examples (needs `rsvg-convert`).
- Playground (`yarn dev` → Charts) shows both examples.
- Catalog count / OKF / site categories / the enhancements-doc out-of-scope line are updated.
- Before/after eval evidence if the published authoring context changed (it will — new catalog entry + JSON Schema). See [`.okf/adaptive-ui/playbooks/run-generation-evals.md`](https://github.com/elastic/adaptive-ui-poc/blob/main/.okf/adaptive-ui/playbooks/run-generation-evals.md). If credentials are missing, say so rather than skipping silently.

Workspace verify (always): `yarn format:check && yarn typecheck && yarn lint && yarn test && yarn build`. Plus `yarn generate:primitives:check`, `yarn svg:check`, and `yarn okf:check` for this change.

### Out of scope (this primitive)

- React Flow, xyflow, dagre, d3-force, pan/zoom, node expand, grouping-into-compound-nodes, icons per `group`.
- Authored coordinates (`position.x/y`).
- Undirected graphs, hypergraphs, sankey, or sequence diagrams.
- Nesting a `graph` inside a components primitive (`descriptionList` children are components-pack only; Kibana already hit this with `donut`).
- Kibana adapter rewrites, re-vendoring, or Nightshift blast-radius chips. Nightshift can keep table/badge ([`adaptive_ui_portable_chat_nightshift.md`](adaptive_ui_portable_chat_nightshift.md)); this primitive unblocks it later, it does not require it.
- Growing Relay `files:write`. Kibana's token `.slack2` path already rasterizes chart PNG; Relay still cannot.

### Kibana follow-up — done

Landed alongside the re-vendor at `531b331e`:

1. `graph` re-exported from [`@kbn/adaptive-ui/builders`](../../src/platform/packages/shared/adaptive-ui/builders.ts), and the diagrams pack added to `sync_dist.mjs`'s closure — without that entry the vendored host imports a package that is not there, and the script treats an unknown `@elastic/*` specifier as a Kibana-supplied peer rather than failing.
2. `graph.ts` and `service_map.ts` render one `graph` node; `toGraphTopology` trims to the schema's budget and a `callout` names anything dropped.
3. `graph_adapter.test.tsx` and `service_map_adapter.test.tsx` cover the diagram, the truncation caption, the empty-topology fallback, and the Slack PNG path.
4. `vendored_surface.test.ts` validates a spec spanning all three packs.

The primitive was a strict upgrade: every surface the adapters already covered (text, markdown, Slack, React) keeps working, and React gains the diagram while Slack gains a PNG. Slack only rasterizes when the caller opts in with `renderSlack(spec, { collectAssets: true })` — as `post_view_to_slack` does; otherwise the diagram degrades to markdown rather than posting a broken image.
