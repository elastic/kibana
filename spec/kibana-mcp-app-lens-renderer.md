# Lens Chart MCP App — LensApiState Renderer

This document describes the **Lens Chart MCP App**, a new MCP tool and client-side rendering layer that accepts `LensApiState` visualization specs (ES|QL datasets) and renders them as interactive charts using `@elastic/charts`. It is a thin, standalone layer that does **not** import from the Lens plugin (`lens/public`).

## Motivation

The `lens_chart_mcp_app` is **dynamic** — an MCP client (Claude Desktop, Cursor, etc.) can send any `LensApiState` spec with an ES|QL dataset, and the app will execute the query and render the appropriate chart type.

This enables MCP-based AI assistants to generate Lens-compatible visualization specs and see them rendered live without requiring the full Kibana Lens plugin stack.

## Relationship to kibana-lens-spec.md

The types consumed here correspond to the **API Format** (`LensApiState`) described in `spec/kibana-lens-spec.md`, specifically the **ES|QL variants**. The client-side types in `types.ts` are a minimal mirror of the ES|QL subset of the schema defined in `@kbn/lens-embeddable-utils/config_builder/schema/`. They are intentionally decoupled so the Vite-built client bundle has no dependency on `@kbn/config-schema` or any server-side Kibana packages.

## File Structure

```
x-pack/platform/plugins/shared/agent_builder/server/routes/
├── mcp.ts                                      ← Registers lens_chart_mcp_app alongside existing tools
├── mcp_apps/
│   ├── lens_chart_mcp_app.ts                   ← Server-side MCP tool for LensApiState
│   └── chart_mcp_app/                          ← Client: Vite+React micro-app
│       ├── src/
│       │   ├── main.tsx                        ← React root mount (unchanged)
│       │   ├── app.tsx                         ← MODIFIED: now delegates to LensRenderer
│       │   ├── types.ts                        ← NEW: Client-side LensApiState types (ES|QL subset)
│       │   ├── lens_renderer.tsx               ← NEW: Top-level dispatcher by chart type
│       │   └── renderers/
│       │       ├── chart_theme.ts              ← NEW: Dark/light theme detection
│       │       ├── data_utils.ts               ← NEW: Columnar→row conversion, column helpers
│       │       ├── xy_renderer.tsx             ← NEW: Bar, line, area, stacked, horizontal
│       │       ├── metric_renderer.tsx         ← NEW: Metric tiles with breakdown
│       │       ├── pie_renderer.tsx            ← NEW: Pie and donut charts
│       │       ├── gauge_renderer.tsx          ← NEW: Gauge via Goal component
│       │       ├── heatmap_renderer.tsx        ← NEW: Heatmap with auto color bands
│       │       ├── tagcloud_renderer.tsx       ← NEW: Tag cloud via Wordcloud component
│       │       ├── partition_renderer.tsx      ← NEW: Treemap, waffle, mosaic
│       │       └── table_renderer.tsx          ← NEW: Data table, legacy metric, region map
│       ├── vite.config.ts                      ← Vite + vite-plugin-singlefile (unchanged)
│       ├── tsconfig.json                       ← (unchanged)
│       ├── index.html                          ← Dev HTML shell (unchanged)
│       └── dist/index.html                     ← REBUILT: Single-file bundle with all renderers
```

## Data Flow

```
┌─────────────────┐     LensApiState spec       ┌──────────────────────────┐
│   MCP Client    │ ──────────────────────────→  │  lens_chart_mcp_app.ts   │
│ (Claude, Cursor)│                              │  (server-side tool)      │
└─────────────────┘                              └────────┬─────────────────┘
                                                          │
                                                          │ 1. Extract ES|QL query
                                                          │ 2. esClient.esql.query()
                                                          │ 3. Return structuredContent:
                                                          │    { visualization, data }
                                                          ▼
                                                 ┌──────────────────────────┐
                                                 │  MCP App iframe          │
                                                 │  (dist/index.html)       │
                                                 │                          │
                                                 │  app.tsx                 │
                                                 │    ↓ ontoolresult        │
                                                 │  lens_renderer.tsx       │
                                                 │    ↓ switch(spec.type)   │
                                                 │  renderers/*_renderer    │
                                                 │    ↓                     │
                                                 │  @elastic/charts         │
                                                 └──────────────────────────┘
```

### Step-by-step

1. **MCP client** invokes the `lens_chart_mcp_app` tool with a `visualization` parameter — a `LensApiState` object containing an ES|QL dataset.
2. **Server** (`lens_chart_mcp_app.ts`) extracts the ES|QL query from the spec (top-level `dataset.query` or `layers[0].dataset.query` for XY charts).
3. **Server** executes the query via `esClient.esql.query({ query, format: 'json' })` and gets back `{ columns, values }`.
4. **Server** returns `structuredContent: { visualization: <the spec>, data: { columns, values } }` along with a text summary.
5. **Client** (`app.tsx`) receives the payload via the MCP Apps SDK `ontoolresult` callback.
6. **Client** passes it to `LensRenderer`, which dispatches on `spec.type` to the appropriate renderer component.
7. **Renderer** converts the columnar ES|QL data to the format expected by `@elastic/charts` and renders the visualization.

## Server-Side: `lens_chart_mcp_app.ts`

### MCP Tool Registration

- **Tool name:** `lens_chart_mcp_app`
- **Input:** `{ visualization: Record<string, unknown> }` — a `LensApiState`-shaped object validated with `@kbn/zod` (passthrough object schema)
- **Output:** `structuredContent` with `{ visualization, data }` on success; `isError: true` on failure
- **Resource URI:** `ui://lens-chart-mcp-app/mcp-app.html`
- **Resource MIME:** `text/html;profile=mcp-app`

### ES|QL Query Extraction

The `extractEsqlQuery` function handles both structural patterns found in `LensApiState`:

```typescript
// Pattern 1: Top-level dataset (metric, gauge, pie, heatmap, etc.)
{ type: 'metric', dataset: { type: 'esql', query: '...' }, ... }

// Pattern 2: Per-layer dataset (XY charts)
{ type: 'xy', layers: [{ dataset: { type: 'esql', query: '...' }, ... }] }
```

### ES|QL Execution

Uses `esClient.esql.query()` with `format: 'json'`. The response is normalized to:

```typescript
{
  columns: Array<{ name: string; type: string }>;  // e.g. [{ name: 'count', type: 'long' }]
  values: unknown[][];                              // row-major tabular data
}
```

## Client-Side: Types (`types.ts`)

Self-contained TypeScript types that mirror the ES|QL subset of `LensApiState`. No dependency on `@kbn/config-schema`.

### Core Types

**`EsqlColumn`** — The fundamental building block. Every field reference in the ES|QL API format uses this shape:

```typescript
interface EsqlColumn {
  operation: 'value';     // always 'value' for ES|QL
  column: string;         // column name from the ES|QL query result
  label?: string;         // display label (overrides column name)
  format?: string;        // 'percent', 'number', 'bytes', etc.
  decimals?: number;
  compact?: boolean;
}
```

**`LensApiStateESQL`** — Discriminated union of all supported chart types:

```typescript
type LensApiStateESQL =
  | XYState          // type: 'xy'
  | MetricState      // type: 'metric'
  | GaugeState       // type: 'gauge'
  | PieState         // type: 'pie' | 'donut'
  | HeatmapState     // type: 'heatmap'
  | TagcloudState    // type: 'tag_cloud'
  | TreemapState     // type: 'treemap'
  | WaffleState      // type: 'waffle'
  | MosaicState      // type: 'mosaic'
  | DatatableState   // type: 'data_table'
  | LegacyMetricState // type: 'legacy_metric'
  | RegionMapState;  // type: 'region_map'
```

**`LensChartPayload`** — The `structuredContent` shape:

```typescript
interface LensChartPayload {
  visualization: LensApiStateESQL;
  data: EsqlData;  // { columns: EsqlColumnMeta[], values: unknown[][] }
}
```

## Client-Side: Renderers

### Dispatcher (`lens_renderer.tsx`)

Routes `spec.type` to the appropriate renderer. Handles the chart title (if present), sets height to 300px for chart types or `auto` for table-like types, and shows a fallback for unsupported types.

### Shared Utilities

**`data_utils.ts`:**
- `toRowObjects(data)` — converts columnar `{ columns, values }` to `Array<Record<string, unknown>>` (row objects keyed by column name), which is what `@elastic/charts` series components expect.
- `colName(col)` / `colLabel(col)` — extract the column name or display label from an `EsqlColumn`.
- `columnType(data, name)` — looks up the ES|QL type for a column (used to auto-detect date fields for time-scale axes).
- `isDateType(type)` — returns `true` for `'date'` or `'datetime'`.

**`chart_theme.ts`:**
- Detects dark/light mode via `prefers-color-scheme` media query.
- Exports `baseTheme` (`DARK_THEME` or `LIGHT_THEME`), `isDarkMode`, and `transparentBackground`.

### Chart Type → Renderer Mapping

| `LensApiState` type | Renderer | `@elastic/charts` Component | Notes |
|---|---|---|---|
| `xy` (bar) | `XYRenderer` | `BarSeries` | Includes stacked, horizontal, percentage |
| `xy` (line) | `XYRenderer` | `LineSeries` | Smooth/stepped interpolation |
| `xy` (area) | `XYRenderer` | `AreaSeries` | Includes stacked, percentage |
| `metric` | `MetricRenderer` | `Metric` | Primary/secondary metrics, breakdown tiles |
| `pie` / `donut` | `PieRenderer` | `Partition` (sunburst) | Configurable donut hole size |
| `gauge` | `GaugeRenderer` | `Goal` | Arc/circle → `goal` subtype; bullet → `horizontalBullet` |
| `heatmap` | `HeatmapRenderer` | `Heatmap` | Auto-generated 4-band color scale |
| `tag_cloud` | `TagcloudRenderer` | `Wordcloud` | Configurable orientation and font sizes |
| `treemap` | `PartitionRenderer` | `Partition` (treemap) | Shared with waffle/mosaic |
| `waffle` | `PartitionRenderer` | `Partition` (waffle) | Shared with treemap/mosaic |
| `mosaic` | `PartitionRenderer` | `Partition` (mosaic) | Supports `group_by` + `group_breakdown_by` |
| `data_table` | `TableRenderer` | HTML `<table>` | Respects explicit `metrics`/`rows` columns |
| `legacy_metric` | `TableRenderer` | HTML `<table>` | Fallback: no `Metric` component for legacy shape |
| `region_map` | `TableRenderer` | HTML `<table>` | Fallback: no map component in `@elastic/charts` |

### XY Renderer Details

The most complex renderer, handling:

- **Series type dispatch:** `bar*` → `BarSeries`, `area*` → `AreaSeries`, `line` → `LineSeries`
- **X-axis scale auto-detection:** inspects the ES|QL column type — `date`/`datetime` → `ScaleType.Time`, numeric → `ScaleType.Linear`, otherwise `ScaleType.Ordinal`
- **Stacking:** `bar_stacked`, `area_stacked` → `stackAccessors`
- **Percentage mode:** `bar_percentage`, `area_percentage` → `StackMode.Percentage`
- **Horizontal rotation:** `bar_horizontal*` → `rotation: 90`
- **Dual Y axes:** Y columns with `axis: 'right'` render against a secondary axis
- **Breakdown/split series:** `breakdown_by` column → `splitSeriesAccessors`
- **Line interpolation:** `smooth` → `CurveType.CURVE_MONOTONE_X`, `stepped` → `CurveType.CURVE_STEP`
- **Legend:** Respects `visibility` (auto/visible/hidden) and `position` from the spec

### Metric Renderer Details

- Supports **primary** and **secondary** metrics via the `metrics` array with `type: 'primary'` / `type: 'secondary'` discriminator.
- When `breakdown_by` is specified, renders one metric tile per unique group value.
- Formats values according to `format` and `decimals` from the spec.

### Pie/Donut Renderer Details

- Uses `Partition` with `PartitionLayout.sunburst`.
- Maps `group_by` columns to partition layers for nested ring breakdown.
- Donut hole size: `none` → 0, `small` → 0.3, `medium` → 0.45, `large` → 0.6.
- Falls back to `0.45` for `type: 'donut'` without explicit `donut_hole`.

### Heatmap Renderer Details

- Auto-generates a 4-band color scale from the data range (min → max divided into quartiles).
- Maps `x` to the X-axis, `y` to the Y-axis (optional), and `metric` to the cell value.

### Partition Renderer Details (Treemap / Waffle / Mosaic)

- Shared component that maps `spec.type` to `PartitionLayout.treemap`, `.waffle`, or `.mosaic`.
- Handles both `metrics` (array, for treemap/waffle) and `metric` (single, for mosaic).
- Combines `group_by` and `group_breakdown_by` into partition layers.

## Example Tool Invocations

### XY Bar Chart

```json
{
  "visualization": {
    "type": "xy",
    "title": "Requests Over Time",
    "layers": [{
      "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | EVAL t=DATE_TRUNC(1 day, @timestamp) | STATS count=COUNT(*) BY t" },
      "type": "bar",
      "x": { "operation": "value", "column": "t" },
      "y": [{ "operation": "value", "column": "count", "label": "Request Count" }]
    }]
  }
}
```

### Metric

```json
{
  "visualization": {
    "type": "metric",
    "title": "Total Bytes",
    "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS total=SUM(bytes)" },
    "metrics": [{
      "type": "primary",
      "operation": "value",
      "column": "total",
      "label": "Total Bytes",
      "format": "bytes"
    }]
  }
}
```

### Pie Chart with Breakdown

```json
{
  "visualization": {
    "type": "pie",
    "title": "Bytes by Country",
    "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS bytes=SUM(bytes) BY geo.dest | LIMIT 10" },
    "metrics": [{ "operation": "value", "column": "bytes" }],
    "group_by": [{ "operation": "value", "column": "geo.dest" }]
  }
}
```

### Heatmap

```json
{
  "visualization": {
    "type": "heatmap",
    "title": "Traffic Heatmap",
    "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS bytes=SUM(bytes) BY geo.dest, geo.src | LIMIT 50" },
    "metric": { "operation": "value", "column": "bytes" },
    "x": { "operation": "value", "column": "geo.src" },
    "y": { "operation": "value", "column": "geo.dest" }
  }
}
```

### Line Chart with Breakdown

```json
{
  "visualization": {
    "type": "xy",
    "title": "Bytes by Response Code",
    "layers": [{
      "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | EVAL t=DATE_TRUNC(1 day, @timestamp) | STATS bytes=SUM(bytes) BY t, response.keyword | LIMIT 100" },
      "type": "line",
      "x": { "operation": "value", "column": "t" },
      "y": [{ "operation": "value", "column": "bytes", "label": "Bytes" }],
      "breakdown_by": { "operation": "value", "column": "response.keyword" }
    }],
    "legend": { "visibility": "visible", "position": "right" },
    "decorations": { "line_interpolation": "smooth" }
  }
}
```

## Design Decisions

### Why not import from the Lens plugin?

The Lens plugin (`x-pack/plugins/lens/public`) carries heavy dependencies: formula evaluation, data view management, suggestion engines, drag-and-drop editors, and the full embeddable lifecycle. The MCP app is a standalone Vite-built HTML file served as a static resource — it cannot load Kibana plugin modules. By using `@elastic/charts` directly, we keep the bundle self-contained (~2.2 MB single-file HTML, ~493 KB gzipped).

### Why duplicate types instead of importing from `@kbn/lens-embeddable-utils`?

The client-side code is built with Vite (not the Kibana bundler) and runs in an iframe outside the Kibana application context. Importing `@kbn/config-schema` or other server-side packages would break the Vite build. The types in `types.ts` are a minimal, hand-written subset covering only the ES|QL variants, which is the only path needed for MCP-driven visualizations.

### How are ES|QL column types used?

The server returns the ES|QL column metadata (`{ name, type }`) alongside the values. The client uses the `type` field to auto-detect date columns for time-scale axes (e.g., `date`/`datetime` → `ScaleType.Time`) and numeric columns for linear scales. This avoids requiring the spec author to manually specify scale types.

## Build

```bash
cd x-pack/platform/plugins/shared/agent_builder/server/routes/mcp_apps/chart_mcp_app
npx vite build
```

Produces `dist/index.html` — a single self-contained HTML file (React + `@elastic/charts` + MCP Apps SDK bundled inline). This file is committed and served by `lens_chart_mcp_app.ts` at runtime.

## Limitations & Future Work

- **ES|QL only.** Index-based and data-view-based datasets (`type: 'index'`, `type: 'dataView'`) are not supported. They would require the server to translate the LensApiState operations (count, sum, terms, date_histogram, etc.) into Elasticsearch aggregation queries.
- **Region maps** fall back to a table — `@elastic/charts` does not include a map component.
- **Annotations and reference lines** (XY chart) are not rendered — only data layers.
- **Color mapping** from the spec is not applied — charts use `@elastic/charts` default palettes.
- **Number formatting** is basic — the `format` field on `EsqlColumn` is only partially handled (percent, decimals). Full Kibana field formatters are not available in the standalone bundle.
- **Multi-layer XY charts** with different ES|QL datasets per layer: only the first layer's query is executed. Supporting multiple queries would require the server to run multiple ES|QL queries and merge the results.

## Source Files Reference

| File | Purpose |
|------|---------|
| `server/routes/mcp.ts` | Registers `lens_chart_mcp_app` on the MCP server |
| `server/routes/mcp_apps/lens_chart_mcp_app.ts` | Server-side: tool registration, ES|QL extraction & execution |
| `chart_mcp_app/src/types.ts` | Client-side types (ES|QL subset of `LensApiState`) |
| `chart_mcp_app/src/app.tsx` | React root — connects MCP Apps SDK, passes payload to LensRenderer |
| `chart_mcp_app/src/lens_renderer.tsx` | Dispatcher — routes `spec.type` to the correct renderer |
| `chart_mcp_app/src/renderers/data_utils.ts` | Columnar→row conversion, column name/label/type helpers |
| `chart_mcp_app/src/renderers/chart_theme.ts` | Dark/light theme detection, transparent background |
| `chart_mcp_app/src/renderers/xy_renderer.tsx` | XY charts (bar, line, area + all variants) |
| `chart_mcp_app/src/renderers/metric_renderer.tsx` | Metric tiles (primary, secondary, breakdown) |
| `chart_mcp_app/src/renderers/pie_renderer.tsx` | Pie / donut via Partition (sunburst) |
| `chart_mcp_app/src/renderers/gauge_renderer.tsx` | Gauge via Goal component |
| `chart_mcp_app/src/renderers/heatmap_renderer.tsx` | Heatmap with auto color bands |
| `chart_mcp_app/src/renderers/tagcloud_renderer.tsx` | Tag cloud via Wordcloud component |
| `chart_mcp_app/src/renderers/partition_renderer.tsx` | Treemap / waffle / mosaic via Partition |
| `chart_mcp_app/src/renderers/table_renderer.tsx` | Data table / legacy metric / region map (HTML table) |
| `chart_mcp_app/dist/index.html` | Pre-built single-file bundle (committed) |
