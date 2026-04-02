# Kibana Lens Visualization Spec (ES|QL Focus)

This document describes how Lens visualizations are defined at the **spec/configuration level**, focusing on the ES|QL data source path. It covers both the **Config Builder API** (legacy/simplified format) and the newer **API format** used by the Lens API schema.

## Two Configuration Formats

Lens has **two distinct configuration formats** that can be converted bidirectionally:

| Format | TypeScript Type | Direction | Used By |
|--------|----------------|-----------|---------|
| **Config Builder** (legacy) | `LensConfig` | Build → `LensAttributes` | Developer-facing, simplified |
| **API Format** (new) | `LensApiState` | ↔ `LensAttributes` | MCP tools, REST API, agent_builder |

Both resolve to the internal `LensAttributes` (the Lens embeddable's serialized state). The `LensConfigBuilder` class in `@kbn/lens-embeddable-utils/config_builder` handles all conversions.

---

## Config Builder Format (`LensConfig`)

**Package:** `@kbn/lens-embeddable-utils/config_builder`  
**Types file:** `src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder/types.ts`  
**Dev docs:** `dev_docs/lens/`

### Core Structure

Every `LensConfig` has two fundamental parts: a **dataset** (data source) and a **visualization config** (chart-type-specific).

```typescript
LensConfig = LensBaseConfig & ChartTypeSpecificConfig
```

Where `LensBaseConfig` provides:
```typescript
interface LensBaseConfig {
  title: string;
  dataset?: LensDataset;  // ← data source
}
```

### 1. Dataset (Data Source)

Three dataset types are supported:

```typescript
type LensDataset =
  | LensESQLDataset       // { esql: string }
  | LensDataviewDataset   // { index: string; timeFieldName?: string }
  | LensDatatableDataset; // Datatable (pre-computed tabular data)
```

**For ES|QL**, the dataset is simply:
```typescript
{ esql: 'FROM my-index | STATS count=COUNT(*) BY category' }
```

The ES|QL query string contains all the data retrieval logic — aggregations, filters, groupings — making the dataset definition self-contained.

### 2. Visualization Config (Chart Types)

`LensConfig` is a discriminated union on `chartType`:

```typescript
type LensConfig =
  | LensMetricConfig     // chartType: 'metric'
  | LensGaugeConfig      // chartType: 'gauge'
  | LensPieConfig        // chartType: 'pie' | 'donut'
  | LensHeatmapConfig    // chartType: 'heatmap'
  | LensMosaicConfig     // chartType: 'mosaic'
  | LensRegionMapConfig  // chartType: 'regionmap'
  | LensTableConfig      // chartType: 'table'
  | LensTagCloudConfig   // chartType: 'tagcloud'
  | LensTreeMapConfig    // chartType: 'treemap'
  | LensXYConfig;        // chartType: 'xy'
```

Each chart type extends `LensBaseConfig` and adds chart-specific properties. Most also extend `LensBaseLayer` for their primary metric:

```typescript
interface LensBaseLayer {
  value: LensLayerQuery;   // field name (ES|QL) or formula (index)
  label?: string;
  format?: 'bits' | 'bytes' | 'currency' | 'duration' | 'number' | 'percent' | 'string';
  decimals?: number;
  compactValues?: boolean;
  seriesColor?: string;
  filter?: string;
  // ... more
}
```

### Chart Type Specs (ES|QL Examples)

#### Metric
```javascript
{
  chartType: 'metric',
  title: 'Total Sales',
  dataset: { esql: 'FROM myindex | STATS totalSales = SUM(sales_field)' },
  value: 'totalSales',
  label: 'Total Sales Value',
  // optional: querySecondaryMetric, queryMaxValue, breakdown, trendLine, subtitle
}
```

#### XY (Line / Bar / Area)
```javascript
{
  chartType: 'xy',
  title: 'Monthly Sales Trend',
  dataset: {
    esql: 'FROM sales_data | EVAL timestamp=DATE_TRUNC(3 hour, @timestamp) | STATS sales = SUM(sales_field) BY timestamp',
  },
  layers: [{
    type: 'series',
    seriesType: 'line',     // 'line' | 'bar' | 'area'
    xAxis: 'timestamp',     // field name
    yAxis: [{
      value: 'sales',
      label: 'Total Sales',
    }],
    breakdown: 'category',  // optional
  }],
  legend: { show: true, position: 'bottom' },
  axisTitleVisibility: { showXAxisTitle: true, showYAxisTitle: true },
  // optional: fittingFunction, emphasizeFitting, yBounds, valueLabels
}
```

XY layers can be: `series` (data), `annotation` (markers), or `reference` (reference lines).

#### Pie / Donut
```javascript
{
  chartType: 'pie',  // or 'donut'
  title: 'Sales by Category',
  dataset: { esql: 'FROM myindex | STATS totalSales = SUM(sales_field) BY category_field | LIMIT 10' },
  value: 'totalSales',
  breakdown: ['category_field'],
  legend: { show: true, position: 'right' },
}
```

#### Heatmap
```javascript
{
  chartType: 'heatmap',
  title: 'Traffic Heatmap',
  dataset: { esql: 'FROM kibana_sample_data_logs | STATS bytes=SUM(bytes) BY geo.dest, geo.src' },
  value: 'bytes',
  breakdown: 'geo.dest',  // Y-axis
  xAxis: 'geo.src',       // X-axis
  legend: { show: true, position: 'right' },
}
```

#### Gauge
```javascript
{
  chartType: 'gauge',
  title: 'CPU Utilization',
  dataset: { esql: 'FROM myindex | STATS avgCpu = AVG(cpu_utilization) | EVAL max=100' },
  value: 'avgCpu',
  queryMaxValue: 'max',
  shape: 'arc',  // 'arc' | 'circle' | 'horizontalBullet' | 'verticalBullet'
}
```

#### Table
```javascript
{
  chartType: 'table',
  title: 'Data Table',
  dataset: { esql: 'FROM kibana_sample_data_logs | STATS bytes=SUM(bytes) BY geo.dest, geo.src' },
  value: 'bytes',
  splitBy: ['geo.src'],
  breakdown: ['geo.dest'],
}
```

#### Tag Cloud
```javascript
{
  chartType: 'tagcloud',
  title: 'Tag Cloud',
  dataset: { esql: 'FROM kibana_sample_data_logs | STATS bytes=SUM(bytes) BY geo.dest' },
  value: 'bytes',
  breakdown: 'geo.dest',
}
```

#### Treemap
```javascript
{
  chartType: 'treemap',
  title: 'Treemap',
  dataset: { esql: 'FROM kibana_sample_data_logs | STATS bytes = SUM(bytes) BY geo.src, geo.dest' },
  value: 'bytes',
  breakdown: ['geo.src', 'geo.dest'],
}
```

#### Mosaic
```javascript
{
  chartType: 'mosaic',
  title: 'Mosaic Chart',
  dataset: { esql: 'FROM kibana_sample_data_logs | STATS bytes = SUM(bytes) BY geo.src, geo.dest' },
  value: 'bytes',
  breakdown: 'geo.src',
  xAxis: 'geo.dest',
}
```

#### Region Map
```javascript
{
  chartType: 'regionmap',
  title: 'Sales by Country',
  dataset: { esql: 'FROM kibana_sample_data_logs | STATS bytes=SUM(bytes) BY geo.dest' },
  value: 'bytes',
  breakdown: 'geo.dest',
}
```

### Breakdown Config

For ES|QL datasets, `breakdown` is simply a **field name** (string) referencing a column from the ES|QL query results. For index-based datasets, it can be a richer object:

```typescript
type LensBreakdownConfig =
  | string                            // field name (ES|QL or auto-detect for index)
  | LensBreakdownTopValuesConfig      // { type: 'topValues', field, size? }
  | LensBreakdownDateHistogramConfig  // { type: 'dateHistogram', field, minimumInterval? }
  | LensBreakdownIntervalsConfig      // { type: 'intervals', field, granularity? }
  | LensBreakdownFiltersConfig;       // { type: 'filters', filters: [...] }
```

### Build Options

```typescript
interface LensConfigOptions {
  embeddable?: boolean;    // output LensEmbeddableInput vs LensAttributes
  timeRange?: TimeRange;   // { from, to, type: 'relative' | 'absolute' }
  filters?: Filter[];
  query?: Query | AggregateQuery;
}
```

### Usage

```typescript
const configBuilder = new LensConfigBuilder(dataViewsAPI, lensFormulaAPI);
const lensConfig = await configBuilder.build(config, {
  timeRange: { from: 'now-30d', to: 'now', type: 'relative' },
  embeddable: true,
});
// → LensEmbeddableInput (ready for <LensEmbeddable />)
```

For ES|QL-only visualizations, `lensFormulaAPI` can be omitted.

---

## API Format (`LensApiState`)

**Package:** `@kbn/lens-embeddable-utils/config_builder/schema`  
**Schema file:** `src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder/schema/index.ts`

The API format is a **newer, schema-validated** representation used by the Lens REST API, MCP tools (dashboard CRUD), and agent_builder. It uses `@kbn/config-schema` for runtime validation.

```typescript
type LensApiState =
  | MetricState
  | LegacyMetricState
  | GaugeState
  | XYState
  | HeatmapState
  | TagcloudState
  | RegionMapState
  | DatatableState
  | PieState
  | MosaicState
  | TreemapState
  | WaffleState;
```

### Dataset in API Format

The API format uses a `dataset` field with explicit `type` discriminator:

```typescript
// ES|QL dataset
{ type: 'esql', query: 'FROM my-index | STATS count=COUNT(*)' }

// Index dataset
{ type: 'index', index: 'my-index-*', time_field: '@timestamp' }

// Data view dataset
{ type: 'dataView', id: 'my-data-view-id' }

// Table dataset
{ type: 'table', table: { /* Kibana Datatable */ } }
```

### Bidirectional Conversion

```typescript
const builder = new LensConfigBuilder();

// API → Internal Lens state
const lensAttributes = builder.fromAPIFormat(apiState);

// Internal Lens state → API
const apiState = builder.toAPIFormat(lensAttributes);
```

---

## How agent_builder Uses Lens Config

The `VisualizationAttachmentData` type in agent_builder stores visualization specs as:

```typescript
interface VisualizationAttachmentData {
  query: string;                          // display query
  visualization: Record<string, unknown>; // Lens API config (LensApiState)
  chart_type: string;                     // chart type identifier
  esql: string;                           // the ES|QL query
  time_range?: { from: string; to: string };
}
```

In the MCP dashboards tool, the flow is:
1. **Read**: `builder.toAPIFormat(lensAttributes)` → returns API format to the LLM
2. **Write**: `builder.fromAPIFormat(apiConfig)` → converts back to `LensAttributes` for persistence

---

## Key Takeaway: ES|QL Simplifies Everything

With ES|QL, the dataset is **self-contained** — the query itself defines the data retrieval, aggregations, groupings, and limits. The visualization config then just maps **field names from the query results** to chart dimensions (`value`, `xAxis`, `yAxis`, `breakdown`). No need for complex datasource state, column operations, or formula APIs.

### Source Files

| File | Purpose |
|------|---------|
| `src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder/types.ts` | Config Builder types (`LensConfig`, `LensDataset`, etc.) |
| `src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder/config_builder.ts` | `LensConfigBuilder` class |
| `src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder/schema/index.ts` | API format schema (`LensApiState`) |
| `src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder/schema/dataset.ts` | Dataset schema definitions |
| `dev_docs/lens/` | Dev documentation for all chart types |
| `x-pack/platform/packages/shared/agent-builder/agent-builder-common/attachments/attachment_types.ts` | `VisualizationAttachmentData` |
