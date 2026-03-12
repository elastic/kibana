# Lens Visualization API — Architectural Review

## 1. HTTP Semantics and Endpoint Design

### 1.1 `POST /api/visualizations/{id}` — Invalid path parameter optionality

The `id` path parameter is declared `required: false`. Per OpenAPI 3.0, **path parameters MUST always be required**. A path segment cannot be optional. The typical REST pattern is:

- `POST /api/visualizations` — server assigns an ID (no `{id}` in path)
- `PUT /api/visualizations/{id}` — client provides the ID (idempotent create-or-replace)

If you want client-supplied IDs, move creation to PUT. If you want server-assigned IDs, remove `{id}` from the POST path.

### 1.2 `overwrite` query param conflates POST and PUT

The POST endpoint accepts `overwrite: boolean`, which turns a create operation into an upsert. This breaks idempotency expectations: POST should create and fail on conflict (409); PUT should replace. Remove `overwrite` and let consumers use PUT for known-ID create-or-replace.

### 1.3 No PATCH support

There is no way to partially update a visualization. For large chart configurations (XY charts can be hundreds of lines), requiring a full PUT is expensive and error-prone. Consider adding `PATCH /api/visualizations/{id}` with `application/merge-patch+json`.

### 1.4 Missing list endpoint capabilities

`GET /api/visualizations` lacks:

- **Sort parameter** (`sort_by`, `sort_order`) — consumers cannot order results by `created_at`, `updated_at`, or `title`.
- **Filter by chart type** — no way to request only `xy` or `metric` charts.
- **`search_fields`** parameter has no description and unclear semantics.
- **`fields`** parameter (sparse fieldsets) has no description, no enum of valid values.

---

## 2. Naming Inconsistencies

### 2.1 Mixed casing conventions — the most pervasive problem

The spec mixes `snake_case` and `camelCase` inconsistently within the same object:

| snake_case | camelCase (same context) |
|---|---|
| `ignore_global_filters` | `colorMapping` |
| `collapse_by` | `unassignedColor` |
| `per_page` (request param) | `perPage` (response field) |
| `breakdown_by`, `sort_by` | `xAxis`, `yAxis` (heatmapESQL) |
| `time_shift`, `time_scale` | `colorCode`, `colorFromPalette` |
| `empty_as_null` | `showRowNumbers` would be expected |

**Recommendation**: Pick one convention (the spec already leans `snake_case` for field names) and apply it uniformly. Ensure request and response use the same convention (`per_page` in request vs `perPage` in response is a concrete bug).

### 2.2 Discriminator value casing is inconsistent

Type discriminator enum values use at least four different conventions:

- kebab-case: `"legacy-dynamic"`
- snake_case: `"legacy_metric"`, `"counter_rate"`, `"date_histogram"`
- camelCase: `"colorCode"`, `"semiCircle"`, `"multiFieldKey"`
- PascalCase: `"RangeKey"`
- lowercase: `"datatable"`, `"heatmap"`, `"tagcloud"`

**Recommendation**: Standardize on `snake_case` for all enum/discriminator values.

### 2.3 The `pie` and `donut` type split is semantically wrong

`pieChart` uses `type: "pie" | "donut"` as the chart-level discriminator but ALSO has a `donut_hole` property with values `"none" | "small" | "medium" | "large"`. This creates a contradictory state: `{ type: "pie", donut_hole: "large" }`. A donut is just a pie with a hole; the `donut_hole` property alone is sufficient. The `type` should always be `"pie"` and the hole size controls whether it renders as a donut.

---

## 3. Massive Schema Duplication

This is the most critical structural problem in the spec. The file is ~9,400 lines when it could likely be under 4,000 with proper factoring.

### 3.1 Every chart is duplicated as `*NoESQL` + `*ESQL`

Every single chart type exists in two near-identical copies:

| DSL variant | ESQL variant |
|---|---|
| `datatableNoESQL` | `datatableESQL` |
| `gaugeNoESQL` | `gaugeESQL` |
| `heatmapNoESQL` | `heatmapESQL` |
| `legacyMetricNoESQL` | `legacyMetricESQL` |
| `mosaicNoESQL` | `mosaicESQL` |
| `pieNoESQL` | `pieESQL` |
| `regionMapNoESQL` | `regionMapESQL` |
| `tagcloudNoESQL` | `tagcloudESQL` |
| `treemapNoESQL` | `treemapESQL` |
| `waffleNoESQL` | `waffleESQL` |

The shared boilerplate between each pair (`title`, `description`, `filters`, `ignore_global_filters`, `sampling`, `type`) is copied verbatim. The only meaningful differences are:

1. **Dataset type**: `dataViewDataset | indexDataset` vs `esqlDataset | tableESQLDataset`
2. **Metric specification**: DSL uses rich operation schemas; ESQL uses `{ operation: "value", column: "..." }`
3. **DSL-only**: `query` field (the KQL/Lucene query)

**Recommendation**: Extract a `baseChartConfig` schema with the shared properties and use `allOf` composition. Alternatively, use a single schema per chart type with the dataset being the branching point rather than duplicating the entire chart.

### 3.2 Metric operation union is copy-pasted ~15+ times

The pattern:

```json
"anyOf": [
  { "$ref": "#/components/schemas/countMetricOperation" },
  { "$ref": "#/components/schemas/uniqueCountMetricOperation" },
  { "$ref": "#/components/schemas/minMaxAvgMedianStdDevMetricOperation" },
  { "$ref": "#/components/schemas/sumMetricOperation" },
  { "$ref": "#/components/schemas/lastValueOperation" },
  { "$ref": "#/components/schemas/percentileOperation" },
  { "$ref": "#/components/schemas/percentileRanksOperation" }
]
```

appears inline in datatable, gauge, heatmap, legacyMetric, metric, mosaic, pie, regionMap, tagcloud, treemap, waffle, and XY — most of them multiple times (once for DSL, once including pipeline ops).

A `fieldMetricOperations` ref exists but is only used in two places. There is no equivalent for the full union (field metrics + pipeline metrics + formula). Create:

- `fieldMetricOperation` — the 7-member union (already partially exists)
- `pipelineMetricOperation` — differences, movingAverage, cumulativeSum, counterRate
- `allMetricOperations` — field + pipeline + formula (this 3-way union is repeated everywhere)

### 3.3 Bucket operation union is copy-pasted ~12+ times

The pattern `dateHistogramOperation | termsOperation | histogramOperation | (inline range) | filtersOperation` is repeated in every chart that supports breakdowns. Extract it as `bucketOperation`.

### 3.4 The `range` operation is inlined (not a named schema) ~10+ times

Unlike every other operation which gets a named schema, the `range` operation is defined inline repeatedly with slight variations (some include `color`, some include `collapse_by`, some include `ems`). Extract a named `rangeOperation` schema and compose the variants.

### 3.5 `value_display` is duplicated identically in 4+ chart types

The object `{ mode: "hidden" | "absolute" | "percentage", percent_decimals: number }` is copy-pasted identically in mosaic, treemap, waffle, and pie. Extract as a named schema.

### 3.6 Legend schemas are near-clones

`pieLegend`, `mosaicLegend`, `treemapLegend`, `waffleLegend`, `heatmapLegend` share the same core shape (`visible`, `size`, `truncate_after_lines`). Extract a `baseLegend` and extend per chart. The XY legend is structurally different (inside/outside split) which is fine, but the five partition-chart legends should share a common base.

### 3.7 Response envelope is inlined 5 times

The response wrapper `{ id, data, meta: { created_at, updated_at, ... } }` is defined inline in every endpoint response. Extract it as `visualizationResponse` and `visualizationListResponse`.

---

## 4. Deep Nesting and `anyOf` Abuse

### 4.1 Triple/quadruple nested `anyOf` for metric operations

In `metricChart` (DSL variant), the metrics array items have this structure:

```
anyOf [                          // level 1
  anyOf [                        // level 2: "primary metric"
    anyOf [ count, unique, ... ] // level 3: field metrics
    anyOf [ diff, moving, ... ]  // level 3: pipeline metrics
    formula                      // level 3
  ]
  anyOf [                        // level 2: "secondary metric"
    anyOf [ count, unique, ... ] // level 3
    anyOf [ diff, moving, ... ]  // level 3
    formula                      // level 3
  ]
]
```

This is **4 levels of anyOf nesting**. For a code generator or a human reading the spec, this is impenetrable. The outer anyOf is meaningless since both branches are the same union. Flatten to a single `anyOf` with all operations listed directly.

### 4.2 `datatableDensity` — unnecessary discriminated union for "auto" vs "custom"

The `height.header` and `height.value` fields each use:

```json
"anyOf": [
  { "properties": { "type": { "enum": ["auto"] } } },
  { "properties": { "type": { "enum": ["custom"] }, "max_lines": { ... } } }
]
```

This could be simplified to a single object where `type: "auto"` means ignore `max_lines` and `type: "custom"` means use it. Or better yet, just use a nullable `max_lines` — if present, it's custom; if absent, it's auto. The discriminated union approach for two trivial variants creates needless nesting.

### 4.3 `colorByValue` three-way split is overcomplicated

`colorByValue` is:

```
anyOf: [ colorByValueAbsolute, colorByValuePercentage, legacyColorByValue ]
```

The absolute and percentage schemas are **identical** except for the `range` enum value. Merge them into one schema with `range: "absolute" | "percentage"`. The legacy variant can remain separate (or better yet, not be exposed in a new API version at all).

---

## 5. The `operation: "value"` Problem in ESQL Mode

In every ESQL schema, column references look like:

```json
{
  "operation": "value",
  "column": "my_column"
}
```

The `operation` field is **always** `"value"` in ESQL mode. It carries zero information and is pure ceremony that every consumer must provide. This is a clear sign the ESQL schema was mechanically adapted from the DSL schema without reconsidering the model.

**Recommendation**: In ESQL mode, column references should simply be the column name (a string), or at most `{ "column": "my_column" }`. The operation discriminator is only meaningful in DSL mode.

---

## 6. Inconsistent Required vs Optional Fields

### 6.1 `x-oas-optional` custom extension is confusing

Several schemas use `"x-oas-optional": true` (e.g., `collapseBy`, `colorMapping`, `formatType`, `staticColor`, various legend/axis schemas). This is a non-standard extension with no documentation. It creates ambiguity: is the field required by the schema's `required` array, or is it "optional" per this extension? These two signals can conflict (e.g., `datatableDensity` has `x-oas-optional: true` but `density` is in the `required` array of both datatable variants).

**Recommendation**: Remove `x-oas-optional` entirely. Use standard `required` arrays consistently.

### 6.2 Overly aggressive required fields on metric operations

Operations like `countMetricOperation` require `filter`, `time_scale`, and `format`. For a simple "count all documents" use case, forcing the consumer to specify `filter: { query: "" }` and `time_scale: "s"` and `format: { type: "number" }` is hostile. These should be optional with sensible defaults.

### 6.3 `collapse_by` and `color` required on bucket operations

`dateHistogramOperation`, `termsOperation`, `histogramOperation`, and `filtersOperation` all require `collapse_by` and `color`. For a simple "group by this field" use case, requiring color mapping configuration is excessive. These should be optional.

---

## 7. Structural Design Concerns

### 7.1 XY chart global `query` vs per-layer `dataset`

`xyChart` has a top-level `query` field (KQL/Lucene), while each layer has its own `dataset`. The relationship is unclear: does the global query apply to all layers? What if a layer has an ESQL dataset — does the KQL query still apply? This should be explicitly documented or restructured so the query lives within each layer.

### 7.2 Heatmap has overlapping `xAxis`/`yAxis` and `axes`

In `heatmapESQL`, there are top-level `xAxis` and `yAxis` fields (data binding — which column goes on which axis) AND an `axes` field (styling — labels, sort, title). The names are confusingly similar. Rename data-binding fields to `x` and `y` (like XY chart does), or nest styling under each axis definition.

### 7.3 `legacyMetricChart` and `legacyColorByValue` exposed in a new API

A brand-new API (marked "Technical Preview") should not expose deprecated schemas. `legacyMetricChart`, `legacyColorByValue`, and `legacyColorByValueAbsolute` all have `deprecated: true`. Either remove them entirely from this API version or provide a migration path. Consumers should not be writing new code against deprecated shapes.

### 7.4 `metricChart` uses an unnamed inline `anyOf` at the top level

Unlike every other chart which has `metricChart -> anyOf: [metricNoESQL, metricESQL]`, the `metricChart` schema inlines two entire unnamed objects directly in the `anyOf`. This makes them unreferenceable and harder to read than the pattern used by every other chart type.

---

## 8. Minor Readability Issues

### 8.1 `minMaxAvgMedianStdDevMetricOperation` — name is too long

This schema name concatenates five aggregation names into one unwieldy identifier. Call it `statsMetricOperation` or `basicStatsOperation` (the `title` field already says "Stats Metric Operation").

### 8.2 Inconsistent singular vs plural

| Field | Cardinality | Issue |
|---|---|---|
| `metric` (singular) | exactly 1 | Used on gauge, heatmap, tagcloud, regionMap, legacyMetric — correct |
| `metrics` (plural) | 1+ items | Used on datatable, mosaic, pie, treemap, waffle — correct |
| `metrics` (plural) | `maxItems: 1` | Mosaic says "only 1 allowed" but uses plural — misleading |
| `metrics` (plural) | `maxItems: 2` | metricChart allows up to 2 (primary + secondary) — borderline |

If the cardinality is "exactly one," use singular. If "one or more," use plural. `mosaic.metrics` with `maxItems: 1` should be `mosaic.metric` (singular).

### 8.3 `searchFilter` anyOf is overly permissive

`searchFilter` is `anyOf: [{ query, language?, meta? }, filterQueryType]`. The second variant (`filterQueryType`) has all fields like `bool`, `match`, `terms` etc. required simultaneously, which makes no sense for Elasticsearch queries (you use ONE of these, not all at once). This looks like a schema generation artifact rather than an intentional design.

### 8.4 `tableESQLDataset.table` has no type

The `table` property on `tableESQLDataset` has literally no schema at all — just `{}`. This means it accepts any value with zero validation or documentation.

---

## Summary of Top Priorities

| Priority | Issue | Impact |
|---|---|---|
| **P0** | Fix POST path parameter (`required: false` is spec-invalid) | Spec conformance |
| **P0** | Fix `per_page` vs `perPage` casing mismatch | API contract bug |
| **P1** | Extract shared schemas (base chart, metric unions, bucket union, value_display, legend, response envelope) | Spec reduced by ~50%, maintainability |
| **P1** | Flatten nested `anyOf` (3–4 levels deep) | Code generator compatibility, readability |
| **P1** | Standardize naming convention (pick `snake_case`, apply everywhere) | Developer experience |
| **P1** | Remove or hide deprecated/legacy schemas from new API | Clean API surface |
| **P2** | Make `filter`, `time_scale`, `format`, `color`, `collapse_by` optional with defaults | Simpler common cases |
| **P2** | Eliminate `operation: "value"` boilerplate in ESQL mode | Reduced payload size, DX |
| **P2** | Remove `x-oas-optional` custom extension | Standard OAS compliance |
| **P2** | Add sort, type filter to list endpoint | Feature completeness |
| **P3** | Resolve heatmap `xAxis`/`yAxis` vs `axes` naming collision | Clarity |
| **P3** | Resolve pie/donut `type` vs `donut_hole` redundancy | Semantic correctness |
| **P3** | Add PATCH endpoint for partial updates | Feature completeness |
