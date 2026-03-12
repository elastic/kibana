# Lens Visualization API — Design Conventions

This document defines every naming, structural, and semantic convention for the Lens Visualization API. All new and refactored schemas must follow these rules. Deviations require explicit justification.

---

## 1. HTTP Semantics

| Method | Purpose | Idempotent | ID source |
|---|---|---|---|
| `POST /api/visualizations` | Create (server-assigned ID) | No | Server |
| `PUT /api/visualizations/{id}` | Create-or-replace (client-supplied ID) | Yes | Client |
| `PATCH /api/visualizations/{id}` | Partial update (`merge-patch+json`) | Yes | Client |
| `GET /api/visualizations/{id}` | Read one | Yes | — |
| `GET /api/visualizations` | List (with sort, filter, pagination) | Yes | — |
| `DELETE /api/visualizations/{id}` | Delete | Yes | — |

- Path parameters are **always required** (OpenAPI 3.0 mandate).
- Never use `overwrite` query flags to turn POST into an upsert — use PUT instead.
- List endpoints must support `sort_by`, `sort_order`, filter by chart `type`, and documented `fields`/`search_fields` parameters.

---

## 2. Casing Conventions

| Context | Convention | Examples |
|---|---|---|
| Property names | `snake_case` | `ignore_global_filters`, `collapse_by`, `per_page` |
| Enum / discriminator values | `snake_case` | `"date_histogram"`, `"legacy_metric"`, `"counter_rate"` |
| Schema names (OpenAPI `$ref`) | `camelCase` | `colorByValue`, `heatmapAxes`, `xyChart` |
| Request and response fields | Identical casing | Never `per_page` in request and `perPage` in response |

No mixing. No `kebab-case`, no `PascalCase`, no `camelCase` in property names or enum values.

---

## 3. Property Naming: The `{subject}_{attribute}` Pattern

Every configuration property follows the shape **`{subject}_{attribute}`**. No bare subject names.

### 3.1 The rule

```
{subject}_{attribute}
```

- **`subject`** = the visual element being configured (title, label, grid, tick, icon, stroke, font_size, ...)
- **`attribute`** = the aspect of that element (text, visible, orientation, alignment, min, max, ...)

### 3.2 Examples

```json
{
  "title_text": "Revenue by Region",
  "title_visible": true,
  "label_text": "Count of records",
  "label_visible": true,
  "label_orientation": "angled",
  "label_alignment": "left",
  "grid_visible": true,
  "tick_visible": true,
  "icon_name": "heart",
  "icon_alignment": "right",
  "font_size_min": 18,
  "font_size_max": 72,
  "stroke_dash": "dashed",
  "stroke_width": 2,
  "value_mode": "percentage",
  "value_decimals": 2,
  "summary_type": "sum",
  "summary_label": "Total",
  "goal_column": "goal_col",
  "min_column": "min_col",
  "max_column": "max_col"
}
```

### 3.3 When `{attribute}` alone is allowed

A property may drop the subject prefix **only** when:

1. The attribute is globally unambiguous at that nesting level, AND
2. It has no sibling attributes that share the same subject.

```json
{
  "sort": "asc",
  "scale": "log",
  "size": "medium",
  "mode": "compact"
}
```

If a second attribute for the same subject appears later (e.g., `sort_direction`), the bare form must be retroactively renamed.

### 3.4 Prefix chain length

Keep prefix chains to **2–3 words maximum**. If flattening produces a 4+ word name, simplify the subject:

| Too long | Simplified |
|---|---|
| `value_display_mode` | `value_mode` |
| `value_display_percent_decimals` | `value_decimals` |
| `include_as_regex` | `include_regex` |

---

## 4. Nesting Rules

### 4.1 When to nest (keep as an object)

Nesting is justified in exactly two cases:

1. **Discriminated unions (polymorphism)** — The object shape changes based on a `type` discriminator. Examples: `extent`, `rank_by`, `compare`, `color`, `shape`, annotation `text`.

2. **Structural sub-entities** — The object represents a distinct visual element with its own data source or lifecycle. Example: `background_chart`.

### 4.2 When to flatten

Everything else — attribute groupings like `{ visible, orientation }`, `{ min, max }`, `{ value, visible }`, `{ type, label }` — must be flattened using `{subject}_{attribute}`.

### 4.3 Top-level namespaces

Groupings like `legend`, `axis`, `decorations`, `fitting`, `cells` are **organizational namespaces** at the chart level. They stay as objects to separate configuration domains. Inside these namespaces, properties follow the flat `{subject}_{attribute}` pattern.

```json
{
  "legend": {
    "visibility": "auto",
    "position": "right",
    "size": "medium",
    "truncate_after_lines": 5
  },
  "axis": {
    "x": {
      "title_text": "Date",
      "title_visible": true,
      "label_orientation": "angled",
      "grid_visible": true,
      "tick_visible": true,
      "extent": { "type": "full" }
    }
  }
}
```

---

## 5. Visibility

### 5.1 Two patterns, no more

| Complexity | Pattern | Type | Values |
|---|---|---|---|
| Binary (on/off) | `{subject}_visible` | `boolean` | `true`, `false` |
| Tri-state (auto/on/off) | `{subject}_visibility` | `enum` | `"auto"`, `"visible"`, `"hidden"` |

### 5.2 Naming rules

- Always use **positive framing**. Never `hidden: boolean`, `hide_title: boolean`, or `show_*: boolean`.
- The property name uses the subject prefix: `title_visible`, `label_visible`, `grid_visible`, `tick_visible`, `cell_label_visible`.
- For legends (which need an auto state): `visibility: "auto" | "visible" | "hidden"` (no subject prefix needed since `visibility` is unambiguous inside the `legend` namespace).

### 5.3 Banned patterns

| Pattern | Replacement |
|---|---|
| `hidden: true` | `visible: false` |
| `hide_title: true` | `title_visible: false` |
| `show_value_labels: true` | `value_label_visible: true` |
| `show_current_time_marker: true` | `time_marker_visible: true` |
| `show_end_zones: true` | `end_zone_visible: true` |
| `visible: "auto" / "show" / "hide"` | `visibility: "auto" / "visible" / "hidden"` |
| `point_visibility: "auto" / "always" / "never"` | `point_visibility: "auto" / "visible" / "hidden"` |
| `text: "none" / "label"` | `label_visible: true / false` |
| `nested: true` (when it means "show nested legend") | `nested_visible: true` or dedicated boolean |
| `label_position: "hidden" / "inside" / ...` | `label_visible` (boolean) + `label_position` (enum, no "hidden" value) |

### 5.4 Never mix visibility into position enums

If a position enum includes `"hidden"` as a value (like `label_position: "hidden" | "inside" | "outside"`), split it:

```json
{
  "label_visible": true,
  "label_position": "inside"
}
```

---

## 6. Size

### 6.1 T-shirt size scale

Use **full words**, not abbreviations:

```
"small", "medium", "large", "extra_large"
```

If an `auto` option is needed, add it explicitly: `"auto", "small", "medium", "large", "extra_large"`.

### 6.2 Banned values

| Banned | Replacement |
|---|---|
| `"xs"`, `"s"`, `"m"`, `"l"`, `"xl"`, `"xxl"` | `"extra_small"`, `"small"`, `"medium"`, `"large"`, `"extra_large"`, `"extra_extra_large"` |
| `"xlarge"` | `"extra_large"` |

### 6.3 Numeric counts are not "size"

Never use `size` for data counts (e.g., "how many terms to show"). Use `limit` or `top_n` instead.

---

## 7. Position and Alignment

### 7.1 Vocabulary

| Concept | Property name | Values |
|---|---|---|
| Cardinal placement (where on screen) | `position` | `"top"`, `"bottom"`, `"left"`, `"right"` |
| Corner placement | `position` | `"top_left"`, `"top_right"`, `"bottom_left"`, `"bottom_right"` |
| Horizontal text alignment | `alignment` | `"left"`, `"center"`, `"right"` |
| Relative ordering | `placement` | `"before"`, `"after"` |

### 7.2 Rules

- Never use `align` as shorthand — always `alignment`.
- Never put visibility values (`"hidden"`) in a position enum.
- Use `{subject}_position` when the subject needs qualifying: `label_position`, `decoration_position`.
- Use `{subject}_alignment` for text alignment: `label_alignment`, `value_alignment`.

---

## 8. Orientation and Direction

### 8.1 Canonical names

| Concept | Property | Values |
|---|---|---|
| Visual element facing | `orientation` (or `{subject}_orientation`) | `"horizontal"`, `"vertical"`, `"angled"` |
| Sort order | `direction` | `"asc"`, `"desc"` |
| Fill region | `fill` | `"above"`, `"below"` or `"inside"`, `"outside"` |

### 8.2 Rules

- Use `orientation` for all "which way does this face?" concepts: axis labels, gauge shape, tagcloud, bars.
- Reserve `direction` exclusively for sort/ordering direction.
- Never use `direction: "horizontal" | "vertical"` — that is `orientation`.

---

## 9. Labels and Text

### 9.1 Naming

| Concept | Property name |
|---|---|
| Primary display name | `label_text` |
| Chart panel title | `title_text` (inside axis/element namespaces) or `title` (at chart root, since no sibling `title_*` exists) |
| Secondary title | `subtitle_text` |
| Secondary label | `subtitle_text` (unify with `sub_title` / `sub_label`) |
| Description | `description` |
| Summary row label | `summary_label` |

### 9.2 Rules

- Use `label_text` (not bare `label`) when other `label_*` properties exist at the same level.
- Unify `sub_title` and `sub_label` into `subtitle_text`.
- Never use `text: "none" | "label"` to control visibility — use `label_visible: boolean`.

---

## 10. Color

### 10.1 Color strategy types

| Strategy | Schema name | Use case |
|---|---|---|
| Fixed color | `static_color` | Single color for a series/element |
| Numeric range mapping | `color_by_value` | Map numeric ranges to colors (gauge, heatmap) |
| Categorical/gradient mapping | `color_mapping` | Map categories/groups to a palette |

### 10.2 Rules

- Merge `color_by_value_absolute` and `color_by_value_percentage` into one `color_by_value` with `range: "absolute" | "percentage"`.
- Do not expose legacy/deprecated color schemas in new API versions.
- When a chart supports dynamic coloring, always include `apply_color_to: "value" | "background"`.

---

## 11. Sorting

### 11.1 Canonical form

- Property name: `sort` (not `sort_by`, not `rank_by` for display sorting).
- Shape for compound sort: `{ field, direction: "asc" | "desc" }`.
- Simple axis sort: `sort: "asc" | "desc"`.
- Terms ranking strategy (`rank_by`) is semantically distinct (a bucketing strategy) and may keep its name, but consider `ranking` or `order_by`.

---

## 12. Filters and Queries

### 12.1 Naming

| Concept | Property name | Schema |
|---|---|---|
| Chart-level DSL query (KQL/Lucene) | `query` | `filter_simple` |
| Per-operation filter | `filter` | `filter_simple` |
| Dashboard-injected filters | `search_filters` (not `filters`) | `array of search_filter` |
| Bucket operation filter definitions | `filter_buckets` (not `filters`) | `array of filter_with_label` |

Never overload `filters` for two different purposes at different levels.

---

## 13. ESQL Mode Conventions

### 13.1 Discriminator hierarchy

The API uses a **top-down discriminator chain**:

```
Chart (non-XY)                       XY Chart
  └─ dataset.type (DSL vs ESQL)       └─ layers[]
       ├─ *NoESQL variant                  └─ dataset.type (per layer)
       │    └─ metric: anyOf                    ├─ xyLayerNoESQL
       │         (operation discriminates)      │    └─ y[]: anyOf (operation)
       └─ *ESQL variant                         └─ xyLayerESQL
            └─ metric: fixed shape                   └─ y[]: fixed shape
```

The **dataset type is the root discriminator** for all charts. For non-XY charts it sits at the chart level; for XY it sits at each layer. Once the dataset variant is resolved:

- **DSL path**: `operation` discriminates between multiple operation types (`"count"`, `"sum"`, `"date_histogram"`, etc.). This is a real polymorphic union — `operation` is essential.
- **ESQL path**: Metrics are a single fixed schema (column + optional visual properties). There is no `anyOf` to discriminate. `operation: "value"` carries zero information beyond what the dataset type already determined.

### 13.2 Drop `operation` in ESQL mode

Since the dataset type already resolves the DSL/ESQL branch, and the ESQL metric is a single fixed shape (not a union), `operation: "value"` is redundant. Schema-rigid consumers like Terraform providers and OpenAPI code generators resolve `anyOf` top-down — once they branch on dataset type, the ESQL metric schema is fully determined.

**ESQL column references should omit `operation` entirely:**

```json
{ "column": "my_col", "format": { ... }, "label_text": "Total" }
```

For simple scalar references (gauge goal/min/max), flatten to `{subject}_column`:

| Current | Convention |
|---|---|
| `{ "operation": "value", "column": "x" }` | `{ "column": "x" }` |
| `goal: { operation: "value", column: "..." }` | `goal_column: "..."` |
| `min: { operation: "value", column: "..." }` | `min_column: "..."` |
| `max: { operation: "value", column: "..." }` | `max_column: "..."` |

### 13.3 Keep `operation` in DSL mode

In DSL mode, `operation` is a genuine discriminator across a polymorphic union of operation types. It must remain:

```json
{ "operation": "sum", "field": "bytes", "format": { ... } }
{ "operation": "date_histogram", "field": "@timestamp", "suggested_interval": "auto" }
{ "operation": "formula", "formula": "count() / 100" }
```

### 13.4 Decision rule

| Question | Answer | Convention |
|---|---|---|
| Is the dataset type already resolved at a parent level? | Yes (always) | Dataset is the root discriminator |
| Does the field have multiple possible shapes within that branch? | Yes (DSL operations) | Keep `operation` as discriminator |
| Does the field have multiple possible shapes within that branch? | No (ESQL — single fixed schema) | Drop `operation`, use `{ column }` or `{subject}_column` |

---

## 14. Schema Composition

### 14.1 Extract shared schemas (DRY)

| Shared concept | Named schema | Replaces |
|---|---|---|
| Field metric union (7 types) | `field_metric_operation` | Inline `anyOf` repeated 15+ times |
| Pipeline metric union (4 types) | `pipeline_metric_operation` | Inline `anyOf` repeated 10+ times |
| All metrics (field + pipeline + formula) | `all_metric_operations` | Nested 3-level `anyOf` |
| Bucket operation union (5 types) | `bucket_operation` | Inline `anyOf` repeated 12+ times |
| Range operation | `range_operation` | Inline definitions repeated 10+ times |
| Value display | `value_display` | Copy-pasted in mosaic, treemap, waffle, pie |
| Base legend | `base_legend` | 5 near-identical legend schemas |
| Axis styling base | `axis_config` | XY and heatmap incompatible models |
| Response envelope | `visualization_response` | Inline response wrapper repeated 5 times |

### 14.2 Flatten `anyOf` nesting

Never nest `anyOf` more than **2 levels deep**. The current 3–4 level nesting in `metricChart` must be flattened to a single-level union of all valid operation types.

### 14.3 Discriminated unions

Use `anyOf` with a clear `type` (or equivalent) discriminator. Document the discriminator field. Never use `anyOf` of two identical schemas (the metric chart DSL primary/secondary pattern).

---

## 15. Required vs Optional

### 15.1 Rules

- Use standard OpenAPI `required` arrays only. Never use custom extensions like `x-oas-optional`.
- Properties with sensible defaults should be **optional**: `filter`, `time_scale`, `format`, `color`, `collapse_by`, `label_text`.
- If a property has a `default` value, it must not be in the `required` array.

### 15.2 Singular vs Plural

| Cardinality | Convention | Example |
|---|---|---|
| Exactly one | Singular | `metric` |
| One or more (array) | Plural | `metrics` |
| Array with `maxItems: 1` | Singular | `metric` (not `metrics` with maxItems 1) |

---

## 16. Axis Configuration

### 16.1 Data binding names

Use `x` and `y` for axis data binding across all charts. Never `xAxis`/`yAxis` (camelCase collision with the styling config).

### 16.2 Axis styling

Use a shared `axis_config` base with:

```json
{
  "title_text": "...",
  "title_visible": true,
  "label_visible": true,
  "label_orientation": "horizontal",
  "grid_visible": true,
  "tick_visible": true
}
```

Extend per chart type: `extent` and `scale` for XY; `sort` for heatmap.

### 16.3 Y-axis naming

XY charts use `left` and `right` for Y-axis styling (directional). This is acceptable since XY supports dual Y-axes. Heatmap uses `y` (single axis). Both are valid for their contexts.

---

## 17. Legend Configuration

### 17.1 Base schema

All legends share:

```json
{
  "visibility": "auto",
  "position": "right",
  "size": "medium",
  "truncate_after_lines": 5
}
```

### 17.2 Extensions

| Chart family | Additional properties |
|---|---|
| Partition charts (pie, mosaic, treemap) | `nested_visible: boolean` |
| XY charts | `inside: boolean`, `alignment` (for inside), `columns`, `statistics` |
| Waffle | `values` |

---

## 18. Enum Value Conventions

### 18.1 General rules

- All enum values are `snake_case` lowercase.
- Visibility enums: `"auto"`, `"visible"`, `"hidden"` (never `"show"/"hide"`, never `"always"/"never"`, never `"none"`).
- Size enums: full words (`"small"`, not `"s"`).
- Orientation enums: `"horizontal"`, `"vertical"`, `"angled"`.
- Position enums: `"top"`, `"bottom"`, `"left"`, `"right"` (never include `"hidden"`).
- Alignment enums: `"left"`, `"center"`, `"right"`.

### 18.2 Chart type discriminator

Use `snake_case` for all chart type values:

```
"xy", "heatmap", "gauge", "metric", "legacy_metric", "datatable",
"pie", "mosaic", "treemap", "waffle", "tagcloud", "region_map"
```

Never `"donut"` as a separate type — use `pie` with `donut_hole_size` to control the hole.

---

## 19. Deprecated / Legacy Schemas

- Do not expose deprecated schemas (`legacy_metric`, `legacy_color_by_value`) in new API versions.
- If backward compatibility requires them, isolate in a clearly marked section and document migration paths.
- Never mix legacy and modern schemas for the same concept (e.g., `color_by_value_absolute` alongside `legacy_color_by_value`).

---

## Quick Reference Card

```
CASING
  properties:     snake_case        ignore_global_filters
  enum values:    snake_case        "date_histogram"
  schema names:   camelCase         colorByValue

NAMING
  every property: {subject}_{attr}  title_text, label_visible, icon_name
  bare attr OK:   only if unique    sort, scale, size, mode

VISIBILITY
  binary:         _visible          boolean
  tri-state:      _visibility       "auto" | "visible" | "hidden"
  framing:        always positive   never hidden:, hide_, show_

SIZE
  scale:          full words        "small" | "medium" | "large" | "extra_large"
  counts:         limit / top_n     not size

POSITION
  cardinal:       position          "top" | "bottom" | "left" | "right"
  text:           alignment         "left" | "center" | "right"
  facing:         orientation       "horizontal" | "vertical" | "angled"
  sort:           direction         "asc" | "desc"

NESTING
  nest:           unions + entities extent, compare, color, shape, background_chart
  flatten:        attribute groups  { visible, orientation } → label_visible, label_orientation
  namespaces:     chart domains     legend, axis, decorations, fitting, cells

DISCRIMINATORS
  root:           dataset.type        DSL vs ESQL resolved at chart/layer level
  DSL metrics:    operation            "count" | "sum" | ... (real polymorphism)
  ESQL metrics:   no operation         { column: "x" } (single fixed shape)
  scalar refs:    {subject}_column     goal_column, min_column, max_column

REQUIRED
  with default:   optional          never required if default exists
  extensions:     banned            never x-oas-optional
```
