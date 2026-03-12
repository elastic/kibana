# Lens API — Cross-Chart Conceptual Review

This review evaluates the API from a **data visualization design** perspective, examining whether universal visualization concepts (visibility, position, size, color, axes, labels) are expressed consistently across all chart types.

---

## 1. Visibility: Eight Patterns for One Concept

The concept "should this element be shown?" is expressed in at least **eight incompatible ways** across the spec. This is the single worst consistency problem.

### 1.1 Full inventory of visibility patterns

| Pattern | Property name | Type | Values | Used by |
|---|---|---|---|---|
| A | `visible` | `boolean` | `true / false` | heatmap legend, heatmap axis labels, heatmap axis title, heatmap cell labels, XY axis title, datatable row/metric visibility |
| B | `visible` | `enum` | `"auto" / "show" / "hide"` | mosaic legend, pie legend, treemap legend, waffle legend |
| C | `visibility` | `enum` | `"auto" / "visible" / "hidden"` | XY legend (inside + outside) |
| D | `hidden` | `boolean` | `true / false` | XY annotations (point, range, query) |
| E | `hide_title` | `boolean` | `true / false` | gauge ESQL metric |
| F | `show_*` | `boolean` | `true / false` | `show_row_numbers`, `show_value_labels`, `show_current_time_marker`, `show_end_zones`, `show_metric_label` |
| G | `label_position` | `enum` | `"hidden" / "inside" / "outside"` | pie chart (mixes visibility with position) |
| H | `label_position` | `enum` | `"hidden" / "visible"` | treemap chart (different values from pie) |
| I | `point_visibility` | `enum` | `"auto" / "always" / "never"` | XY decorations |
| J | `ticks` | `enum` | `"auto" / "bands" / "hidden"` | gauge |
| K | `ticks` | `boolean` | `true / false` | XY axes |
| L | `text` | `enum` | `"none" / "label"` | XY annotations, reference lines |
| M | `nested` | `boolean` | `true / false` | mosaic/pie/treemap legends (but really a visibility toggle) |

That is **13 distinct patterns** (A–M) for fundamentally the same underlying question.

### 1.2 Key conflicts

**`visible: boolean` vs `visible: enum` (A vs B)** — The heatmap legend uses `visible: boolean` while pie/mosaic/treemap/waffle legends use `visible: enum ["auto", "show", "hide"]`. A consumer learning the pie legend API will expect the same pattern on heatmap and get a totally different type.

**`visible` vs `visibility` (B vs C)** — The partition chart legends use the property name `visible` with values `"auto" / "show" / "hide"`. The XY legend uses the property name `visibility` with values `"auto" / "visible" / "hidden"`. These are the same concept with a different property name AND different enum values.

**Positive vs negative framing (A vs D vs E vs F)** — `visible: true` (show it), `hidden: true` (hide it), `hide_title: true` (hide it), `show_value_labels: true` (show it). A consumer must mentally flip the boolean depending on which chart they're configuring.

**`label_position` mixes visibility with position (G vs H)** — On pie charts, `label_position: "hidden"` means "don't show labels." On treemap, `label_position: "hidden" | "visible"` is a pure visibility toggle with no position semantics at all. Neither is actually a "position" when the value is "hidden."

**`ticks` is both a boolean and an enum (J vs K)** — On gauges, `ticks: "auto" | "bands" | "hidden"` is a 3-state enum. On XY axes, `ticks: boolean` is a simple toggle. Same property name, completely different types.

### 1.3 Recommendation

Adopt **one canonical pattern** per level of complexity:

- **Binary visibility** (on/off): Use `visible: boolean` everywhere. Always positive framing (never `hidden: boolean`). Retire all `show_*` and `hide_*` prefixed booleans.
- **Tri-state visibility** (auto/on/off): Use `visibility: enum ["auto", "visible", "hidden"]` everywhere. Never `"show"/"hide"`, never `"always"/"never"`, never `"none"/"label"`.
- **Visibility + position compound**: Separate the two concerns. Use `visible: boolean` for whether to show, and a separate `position: enum` for where to place. Never mix `"hidden"` into a position enum.

---

## 2. Size: Two Incompatible Scales

### 2.1 The conflict

| Context | Property | Values |
|---|---|---|
| Legend size (most charts) | `size` via `legendSize` | `"auto"`, `"small"`, `"medium"`, `"large"`, `"xlarge"` |
| XY legend outside | `size` | `"small"`, `"medium"`, `"large"`, `"xlarge"` (no `"auto"`) |
| Legacy metric font size | `size` | `"xs"`, `"s"`, `"m"`, `"l"`, `"xl"`, `"xxl"` |
| Donut hole size | `donut_hole` | `"none"`, `"small"`, `"medium"`, `"large"` |
| Terms bucket count | `size` | `number` (default 5) |

The legacy metric chart uses abbreviated T-shirt sizes (`"xs"`, `"s"`, `"m"`, `"l"`, `"xl"`, `"xxl"`) while every other chart uses full words (`"small"`, `"medium"`, `"large"`, `"xlarge"`). The XY legend omits `"auto"` from its legend size enum while every other chart includes it.

### 2.2 Recommendation

- Standardize on **full word** T-shirt sizes everywhere: `"small"`, `"medium"`, `"large"`, `"xlarge"`.
- If `"auto"` is a valid option, include it consistently across all size enums.
- Add `"extra_small"` and `"extra_extra_large"` (or `"xs"` and `"xxl"` — pick one convention) if the metric chart's expanded scale is needed elsewhere.
- Avoid overloading `size` for numeric counts (terms operation). Use `limit` or `top_n` for "how many terms" to distinguish from visual sizing.

---

## 3. Position and Alignment: Fragmented Vocabulary

### 3.1 Full inventory

| Concept | Property name | Values | Chart/Context |
|---|---|---|---|
| Legend placement | `position` | `"top" / "bottom" / "left" / "right"` | heatmap legend, XY legend outside |
| Legend placement (inside) | `alignment` | `"top_right" / "bottom_right" / "top_left" / "bottom_left"` | XY legend inside |
| Primary metric placement | `position` | `"top" / "bottom"` | metric chart primary |
| Secondary label placement | `label_position` | `"before" / "after"` | metric chart secondary |
| Slice label placement | `label_position` | `"hidden" / "inside" / "outside"` | pie chart |
| Treemap label placement | `label_position` | `"hidden" / "visible"` | treemap chart |
| Reference line decoration | `decoration_position` | `"auto" / "left" / "right"` | XY reference lines |
| Icon placement | `align` | `"left" / "right"` | metric chart icon |
| Column text alignment | `alignment` | `"left" / "center" / "right"` | datatable rows/metrics |
| Metric value alignment | `alignments.value` | `"left" / "center" / "right"` | metric chart primary/secondary |
| Metric label alignment | `alignments.labels` | `"left" / "center" / "right"` | metric chart primary |
| Legacy metric alignments | `alignments.labels` | `"top" / "bottom"` | legacy metric |
| Legacy metric alignments | `alignments.value` | `"left" / "center" / "right"` | legacy metric |
| Range fill direction | `fill` | `"inside" / "outside"` | XY annotation range |
| Reference line fill | `fill` | `"above" / "below"` | XY reference lines |
| Gauge bullet direction | `direction` | `"horizontal" / "vertical"` | gauge shape |
| Complementary bar direction | `direction` | `"vertical" / "horizontal"` | metric chart bar |
| Label orientation | `orientation` | `"horizontal" / "vertical" / "angled"` | heatmap X axis labels, tagcloud |
| Axis label orientation | `label_orientation` | `"horizontal" / "vertical" / "angled"` | XY axes |

### 3.2 Key problems

**`position` vs `alignment` vs `align`** — Three different property names for the same concept of "where to put this thing." The icon uses `align`, the datatable uses `alignment`, the legend uses `position`.

**`alignment` is overloaded** — On datatables it means horizontal text alignment (`"left" / "center" / "right"`). On XY legend inside it means 2D placement (`"top_right" / "bottom_left" / ...`). Same word, completely different meaning.

**`label_position` means three different things** — On pie it's visibility + position (`"hidden" / "inside" / "outside"`). On treemap it's just visibility (`"hidden" / "visible"`). On metric secondary it's temporal ordering (`"before" / "after"`).

**`direction` vs `orientation`** — Gauge shape uses `direction: "horizontal" | "vertical"`. Tagcloud uses `orientation: "horizontal" | "vertical" | "angled"`. Heatmap axis labels use `orientation` with the same values. XY axes use `label_orientation`. These all describe the same family of concepts with different names.

**`fill` means different things** — On annotation ranges, `fill: "inside" | "outside"` means which side of the range to shade. On reference lines, `fill: "above" | "below"` means which side of the line to shade. Same property name, incompatible value sets.

### 3.3 Recommendation

Establish a vocabulary:

| Concept | Canonical property | Values |
|---|---|---|
| Cardinal placement (where on screen) | `position` | `"top" / "bottom" / "left" / "right"` |
| 2D placement (corner) | `position` | `"top_left" / "top_right" / "bottom_left" / "bottom_right"` |
| Horizontal text alignment | `alignment` | `"left" / "center" / "right"` |
| Spatial orientation | `orientation` | `"horizontal" / "vertical" / "angled"` |
| Relative ordering | `placement` | `"before" / "after"` |
| Fill direction | `fill` | `"above" / "below"` or `"inside" / "outside"` (pick one pair per concept) |

Never use `align` as a shorthand for `alignment`. Never mix visibility  values into position enums.

---

## 4. Orientation and Direction: Same Concept, Different Names

### 4.1 The conflict

| Property | Values | Context |
|---|---|---|
| `orientation` | `"horizontal" / "vertical" / "angled"` | heatmap X axis labels, tagcloud |
| `label_orientation` | `"horizontal" / "vertical" / "angled"` | XY axes (left, right, x) |
| `direction` | `"horizontal" / "vertical"` | gauge bullet shape, metric complementary bar |
| `line_interpolation` | `"linear" / "smooth" / "stepped"` | XY decorations (different concept, but naming pattern) |

`orientation` and `direction` describe the same idea. When it's axis labels, it's called `orientation` on heatmaps but `label_orientation` on XY. When it's a shape, it's called `direction`.

### 4.2 Recommendation

Use `orientation` for all "which way does this visual element face" concepts. Reserve `direction` for sort direction (`"asc" / "desc"`) only.

---

## 5. Axis Configuration: Structural Mismatch Between XY and Heatmap

### 5.1 XY axis model

XY charts split axis configuration into:

- **Data binding** (per layer): `x: { operation, column }` and `y: [{ operation, column, axis, color }]`
- **Axis styling** (chart-level): `axis: { x: { extent, grid, ticks, title, label_orientation }, left: { ... }, right: { ... } }`

The Y-axis styling uses directional names (`left` / `right`) while the data binding uses the generic `axis: "left" | "right"` property on each metric. This is a reasonable model.

### 5.2 Heatmap axis model

Heatmaps split differently:

- **Data binding** (chart-level): `xAxis: { operation, column }` and `yAxis: { operation, column }` (camelCase, confusingly)
- **Axis styling** (chart-level): `axes: { x: { labels, sort, title }, y: { labels, sort, title } }`

### 5.3 Problems

1. **XY uses `x`/`y`, heatmap uses `xAxis`/`yAxis`** for data binding — different naming for the same concept.
2. **XY uses `axis: { x, left, right }`, heatmap uses `axes: { x, y }`** for styling — different wrapper name (`axis` vs `axes`), different keys (`left`/`right` vs `y`).
3. **Heatmap axis styling is a subset of XY axis styling** — heatmap has `labels`, `sort`, `title`. XY has `extent`, `grid`, `ticks`, `title`, `label_orientation`, `scale`. There's no shared base.
4. **Label configuration nesting differs** — heatmap uses `axes.x.labels.visible` and `axes.x.labels.orientation`. XY uses `axis.x.label_orientation` (flat) and has no `labels.visible` at all.

### 5.4 Recommendation

Unify axis data-binding property names to `x` and `y` across all charts. Create a shared `axisStyle` schema with common properties (`title`, `labels`, `grid`, `ticks`) and extend it per chart type with chart-specific additions (`extent`, `scale` for XY; `sort` for heatmap).

---

## 6. Legend Configuration: Five Near-Identical Schemas

### 6.1 Legend comparison matrix

| Property | heatmapLegend | pieLegend | mosaicLegend | treemapLegend | waffleLegend | xyLegend |
|---|---|---|---|---|---|---|
| `visible` (boolean) | yes | — | — | — | — | — |
| `visible` (enum: auto/show/hide) | — | yes | yes | yes | yes | — |
| `visibility` (enum: auto/visible/hidden) | — | — | — | — | — | yes |
| `position` | yes | — | — | — | — | yes (outside only) |
| `size` | yes (`legendSize`) | yes | yes | yes | yes | yes (inline enum) |
| `truncate_after_lines` | yes | yes | yes | yes | yes | yes |
| `nested` | — | yes | yes | yes | — | — |
| `statistics` | — | — | — | — | — | yes |
| `values` | — | — | — | — | yes | — |
| `inside` (boolean) | — | — | — | — | — | yes (discriminator) |
| `alignment` (inside placement) | — | — | — | — | — | yes |
| `columns` | — | — | — | — | — | yes |

### 6.2 Problems

1. **Three different visibility mechanisms** for legends alone (boolean, enum "show/hide", enum "visible/hidden").
2. **heatmap legend has `position`** but no other partition-chart legend does. Where do pie/treemap/mosaic/waffle legends appear? Is the position fixed? Undocumented.
3. **`size` uses `$ref legendSize`** in most legends but is an **inline enum** (without `"auto"`) in `xyLegendOutside`.
4. **`nested` exists on pie, mosaic, treemap** but not on waffle or heatmap. Is it irrelevant for those charts? Unclear without documentation.

### 6.3 Recommendation

Create a single `baseLegend` schema:

```
baseLegend: {
  visibility: enum ["auto", "visible", "hidden"],
  position: enum ["top", "bottom", "left", "right"],
  size: legendSize,
  truncate_after_lines: number
}
```

Extend for chart-specific needs: `nested` for partition charts, `statistics` for XY, inside-placement for XY. All legends should support `position`.

---

## 7. Color Configuration: Inconsistent Polymorphism

### 7.1 Color schema used per chart role

| Context | Color schema(s) allowed | Notes |
|---|---|---|
| DSL metric (individual series) | `staticColor` | Fixed color per series |
| DSL bucket (group-by) | `colorMapping` | Categorical/gradient palette |
| ESQL metric | `staticColor` | Fixed color per column |
| ESQL bucket | `colorMapping` | Same as DSL |
| Datatable metric coloring | `colorByValue \| colorMapping` | Dynamic coloring by value |
| Gauge metric | `colorByValue` | Dynamic only |
| Heatmap metric (DSL) | implicit (no color prop) | — |
| Heatmap metric (ESQL) | `colorByValue` | — |
| Metric chart primary | `colorByValue \| staticColor` | Mixed |
| Metric chart secondary | `staticColor` | Fixed only |
| Legacy metric | `colorByValueAbsolute \| legacyColorByValueAbsolute` | Legacy-specific |
| XY annotation | `staticColor` | — |
| `apply_color_to` | `enum ["value", "background"]` | Only on datatable, metric, legacy metric |

### 7.2 Problems

1. **No consistent "color" type** — The same `color` property accepts `staticColor` in some contexts, `colorByValue` in others, `colorMapping` in others, and various combinations. A consumer cannot predict what `color` accepts without checking each chart's schema individually.
2. **`apply_color_to` is sometimes present, sometimes absent** — Datatable rows have it, datatable ESQL metrics have it, legacy metric has it, but new metric chart and gauge do not. When absent, where is color applied?
3. **Three different "color by value" schemas** — `colorByValueAbsolute`, `colorByValuePercentage`, and `legacyColorByValue` all describe the same concept (map numeric ranges to colors). The first two are identical except for the `range` discriminator.

### 7.3 Recommendation

- Define a clear `colorConfig` union that captures all three strategies: `staticColor`, `colorByValue`, and `colorMapping`.
- Document at the chart-type level which subset is allowed and why.
- Merge `colorByValueAbsolute` and `colorByValuePercentage` into a single `colorByValue` with `range: "absolute" | "percentage"`.
- Make `apply_color_to` consistent: if a chart supports dynamic coloring, always allow specifying target.

---

## 8. Sorting: Three Unrelated Models

### 8.1 Comparison

| Context | Property | Type | Model |
|---|---|---|---|
| Datatable | `sort_by` | `anyOf [{ column_type, index, direction }, { column_type, index, values, direction }]` | Index-based column reference |
| Heatmap axes | `sort` | `enum ["asc", "desc"]` | Simple direction |
| Terms operation | `rank_by` | `anyOf [alphabetical, rare, significant, column, custom]` | Polymorphic ranking strategy |
| Last value operation | `sort_by` | `string` | Just a field name (no direction!) |
| XY legend | (none) | — | No sort capability |

### 8.2 Problems

1. **`sort_by` vs `sort` vs `rank_by`** — Three names for "how to order items."
2. **`last_value.sort_by`** is just a string with no direction and no documentation on what it means.
3. **Datatable sort model is overly complex** — Referring to columns by index is fragile. If columns are reordered, sort breaks.

### 8.3 Recommendation

Standardize on `sort` as the canonical property name for ordering. Use a consistent shape: `{ field/column, direction: "asc" | "desc" }`. For the terms operation, `rank_by` is semantically distinct enough (it's a bucketing strategy, not a display sort) to keep, but rename to `ranking` or `order_by`.

---

## 9. Label and Text: Inconsistent Naming

### 9.1 The concept of "text associated with a visual element"

| Property | Meaning | Context |
|---|---|---|
| `label` | Custom display name | Every operation, annotations |
| `title` | Chart panel title | Every chart top-level |
| `sub_title` | Secondary title | Gauge metric |
| `sub_label` | Secondary label | Metric chart primary |
| `description` | Chart description | Every chart top-level |
| `text` | What text to show | Annotations (`"none" / "label"`), reference lines |
| `prefix` | Text prefix | Metric chart secondary |
| `summary.label` | Summary row label | Datatable ESQL metric |

### 9.2 Problems

1. **`sub_title` vs `sub_label`** — Gauge uses `sub_title`, metric chart uses `sub_label`. These serve the same purpose (secondary descriptive text below the main value). Different names for the same concept.
2. **`text` is overloaded** — On annotations, `text: "none" | "label"` means "should the label be displayed?" This is really a visibility toggle disguised as a text property. On query annotations, `text` becomes a polymorphic `anyOf ["none", "label", { type: "field", field }]` — three totally different shapes.
3. **`title` appears at different levels with different meanings** — Chart-level `title` is the panel title. Inside `gauge.metric.title` it's the metric title. Inside axis configuration, `title: { value, visible }` is an object. Same word, three different structures.

### 9.3 Recommendation

- Unify `sub_title` and `sub_label` into a single term (suggest `subtitle`).
- Replace `text: "none" | "label"` on annotations/reference lines with a visibility property: `label_visibility: "visible" | "hidden"`. The current model conflates "what to display" with "whether to display."
- Use consistent nesting: if axis titles are `{ value, visible }`, metric titles should follow the same pattern rather than being a raw string plus a separate `hide_title` boolean.

---

## 10. The "Operation + Column" Pattern vs Direct Reference

### 10.1 DSL mode: Operation as semantic descriptor

In DSL mode, the `operation` field carries real meaning:

```json
{ "operation": "date_histogram", "field": "@timestamp", "suggested_interval": "auto" }
{ "operation": "count", "filter": { "query": "" } }
{ "operation": "sum", "field": "bytes", "format": { "type": "number" } }
```

Each operation type has different additional properties. The discriminator is meaningful and necessary.

### 10.2 ESQL mode: `operation: "value"` everywhere

In ESQL mode, every single column reference is:

```json
{ "operation": "value", "column": "my_column" }
```

Sometimes with additional visual properties:

```json
{ "operation": "value", "column": "count", "color": { ... }, "collapse_by": "sum" }
```

The `operation: "value"` carries zero semantic information. It's a constant required field that every consumer must include. Meanwhile, the ESQL column reference objects accumulate visual/chart-specific properties (color, collapse_by, alignment, format, label) that have nothing to do with "the operation."

### 10.3 Recommendation

In ESQL mode, drop `operation: "value"` entirely. Just use:

```json
{ "column": "my_column" }
{ "column": "count", "color": { ... }, "collapse_by": "sum" }
```

Or even better, separate data-binding from visual configuration:

```json
{
  "column": "count",
  "display": { "color": { ... }, "format": { ... }, "label": "Total Count" }
}
```

---

## 11. Filter and Query: Three Overlapping Concepts

### 11.1 Inventory

| Property | Schema | Context | Purpose |
|---|---|---|---|
| `query` | `filterSimple` (`{ query, language }`) | DSL charts top-level | KQL/Lucene query string |
| `filter` | `filterSimple` | DSL metric operations | Per-metric filter |
| `filters` | `array of searchFilter` | Every chart top-level | Dashboard-injected filters |
| `filters` | `array of filterWithLabel` | `filtersOperation` | Bucket operation filters |
| `query` | `filterSimple` | `xyAnnotationQuery` | Annotation match filter |

### 11.2 Problems

1. **`query` and `filter` use the same schema (`filterSimple`) but different names** — At the chart level it's `query`, at the operation level it's `filter`. Same schema, different semantics.
2. **`filters` means two different things** — At the chart level, `filters` is an array of `searchFilter` (dashboard filters). Inside `filtersOperation`, `filters` is an array of `filterWithLabel` (bucket definitions). Same property name, completely different schemas and purposes.
3. **`searchFilter` is overly permissive** — It's an `anyOf` of two very different shapes, one of which (`filterQueryType`) requires all query types simultaneously (nonsensical).

### 11.3 Recommendation

Rename for clarity:

- `query` (chart-level DSL query) -> keep as `query`
- `filter` (per-operation) -> keep as `filter`
- `filters` (dashboard-injected) -> rename to `dashboard_filters` or `search_filters`
- `filters` (in filtersOperation) -> rename to `buckets` or `filter_buckets`

---

## 12. Summary: A Unification Roadmap

### Tier 1: Pick one pattern, apply everywhere

| Concept | Current patterns | Recommended canonical form |
|---|---|---|
| Binary visibility | `visible`, `hidden`, `show_*`, `hide_*`, `nested` | `visible: boolean` (always positive) |
| Tri-state visibility | `visible: enum`, `visibility: enum`, `point_visibility`, `ticks: enum` | `visibility: enum ["auto", "visible", "hidden"]` |
| Size scale | `"xs/s/m/l/xl/xxl"`, `"small/medium/large/xlarge"` | `"small" / "medium" / "large" / "extra_large"` |
| Orientation | `orientation`, `direction`, `label_orientation` | `orientation` (reserve `direction` for sort) |
| Ordering | `sort_by`, `sort`, `rank_by`, `direction` | `sort: { field, direction }` |

### Tier 2: Separate concerns, stop overloading

| Overloaded property | What it conflates | Fix |
|---|---|---|
| `label_position` | visibility + placement | Split to `label_visibility` + `label_position` |
| `text: "none" \| "label"` | visibility + content source | Split to `label_visibility` + `label_source` |
| `ticks` (gauge) | visibility + style | Split to `tick_visibility` + `tick_style` |
| `operation: "value"` (ESQL) | discriminator + noise | Remove from ESQL mode |
| `filters` | dashboard filters + bucket definitions | Rename one: `search_filters` or `filter_buckets` |
| `size` | visual size + data count | Rename data count to `limit` or `top_n` |

### Tier 3: Extract shared schemas

| Shared concept | Current state | Target |
|---|---|---|
| Legend | 6 nearly-identical schemas | 1 `baseLegend` + per-chart extensions |
| Axis styling | XY and heatmap have incompatible models | 1 `axisConfig` shared base |
| Color config | ad-hoc unions per chart | 1 `colorConfig` union documented per context |
| Value display | 4+ inline copies | 1 `valueDisplay` schema |
| Visibility pattern | 13 patterns | 2 patterns (boolean + enum) |
