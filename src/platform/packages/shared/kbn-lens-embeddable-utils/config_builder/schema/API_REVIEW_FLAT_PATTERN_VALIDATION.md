# Flat `{subject}_{attribute}` Pattern — Validation Against Current Schemas

Systematic check of every nested configuration object in the spec against the proposed flat naming pattern. Each section evaluates whether flattening works, partially works, or breaks down.

---

## Legend: Verdicts

- **FLAT** = Can be fully flattened, no issues
- **FLAT-ISH** = Can be flattened but has a minor naming tension
- **KEEP NESTED** = Should remain nested (structural entity, polymorphism, or array of complex items)

---

## 1. Axis Title: `{ value, visible }` — FLAT

**Current** (heatmap and XY):
```json
{ "title": { "value": "Revenue", "visible": true } }
```

**Flattened**:
```json
{ "title_text": "Revenue", "title_visible": true }
```

Verdict: **Works perfectly.** Both properties follow the `{subject}_{attribute}` shape: `title_text` for the content, `title_visible` for the modifier. Uniform and predictable.

---

## 2. Axis Labels: `{ visible, orientation }` — FLAT

**Current** (heatmap):
```json
{ "labels": { "visible": true, "orientation": "angled" } }
```

**Flattened**:
```json
{ "label_visible": true, "label_orientation": "angled" }
```

Verdict: **Works.** No collision at the axis level.

---

## 3. XY Axis Grid and Ticks — ALREADY FLAT

**Current** (XY):
```json
{ "grid": true, "ticks": true }
```

These are already flat booleans. To align with the naming convention, they'd become `grid_visible: true` and `tick_visible: true`. Minor rename, but more explicit.

Verdict: **Already flat.** Rename for consistency is optional.

---

## 4. XY Axis Extent: `{ type, start, end, integer_rounding }` — KEEP NESTED

**Current**:
```json
{
  "extent": {
    "type": "custom",
    "start": 0,
    "end": 100,
    "integer_rounding": true
  }
}
```

This is a **discriminated union** with three variants where `start`/`end` only apply when `type: "custom"`. Flattening to `extent_type`, `extent_start`, `extent_end` loses the schema-level conditional validation.

Verdict: **Keep nested.** This is a structural entity (a polymorphic config), not a flat attribute group.

---

## 5. Datatable Density Height: `{ header: { type, max_lines }, value: { type, lines } }` — FLAT (with simplification)

**Current**:
```json
{
  "height": {
    "header": { "type": "custom", "max_lines": 3 },
    "value": { "type": "custom", "lines": 1 }
  }
}
```

The `type: "auto" | "custom"` discriminator is redundant — the *presence* of `max_lines`/`lines` implies custom, absence implies auto.

**Flattened and simplified**:
```json
{
  "header_max_lines": 3,
  "value_max_lines": 1
}
```

Absent = auto. Present = custom. No discriminator needed. Two properties instead of a 3-level nested structure.

Verdict: **Flattens beautifully** and eliminates unnecessary discriminated unions.

---

## 6. Legend Configs (all chart types) — ALREADY FLAT (mostly)

**Current** (pie/mosaic/treemap/waffle):
```json
{
  "visible": "auto",
  "size": "medium",
  "truncate_after_lines": 5,
  "nested": true
}
```

Already flat within the legend object. The issue is naming inconsistency (`visible` vs `visibility`, `"show"/"hide"` vs `"visible"/"hidden"`), not nesting.

Verdict: **Already flat.** Fix the naming, not the structure.

---

## 7. XY Legend Inside: `{ visibility, inside, alignment, columns, statistics, truncate_after_lines }` — ALREADY FLAT

All properties are at one level. No nesting issues.

Verdict: **Already flat.**

---

## 8. Heatmap Cells: `{ labels: { visible } }` — FLAT

**Current**:
```json
{ "cells": { "labels": { "visible": true } } }
```

Two levels of nesting for one boolean.

**Flattened**:
```json
{ "cell_label_visible": true }
```

Or, if `cells` stays as a namespace (for future cell properties):
```json
{ "cells": { "label_visible": true } }
```

Verdict: **Can flatten.** Whether to flatten fully to chart level or keep `cells` as a namespace depends on whether more cell config is expected. Either way, `labels: { visible }` should flatten.

---

## 9. Metric Chart Alignments: `{ labels: enum, value: enum }` — FLAT

**Current** (metricPrimaryMetricAlignments):
```json
{ "alignments": { "labels": "left", "value": "right" } }
```

**Flattened** (inside the metric object):
```json
{ "label_alignment": "left", "value_alignment": "right" }
```

With the `{subject}_{attribute}` pattern, the existing `label` property (the display name string) should also become `label_text`. This gives a clean, uniform result:
```json
{
  "label_text": "My Metric",
  "label_alignment": "left",
  "value_alignment": "right"
}
```

Every property consistently follows `{subject}_{attribute}`. No ambiguity about whether `label` is a value or a prefix.

Verdict: **Works.** Requires renaming `label` → `label_text` on operations, but the consistency gain is worth it — it eliminates the entire class of "bare name vs prefixed name" confusion.

---

## 10. Metric Chart Icon: `{ name, align }` — FLAT

**Current**:
```json
{ "icon": { "name": "heart", "align": "right" } }
```

**Flattened** (inside the metric):
```json
{ "icon_name": "heart", "icon_alignment": "right" }
```

Verdict: **Works.** Also normalizes `align` → `icon_alignment` for consistency.

---

## 11. Metric Chart Background Chart (complementary bar): `{ type, max_value: { operation, column }, direction }` — KEEP NESTED

**Current**:
```json
{
  "background_chart": {
    "type": "bar",
    "max_value": { "operation": "value", "column": "max_col" },
    "direction": "horizontal"
  }
}
```

This is a **structural sub-entity** — it represents an entire visual element (a bar drawn behind the metric). It has its own data source (`max_value` column reference) and its own visual type.

Flattening to `background_chart_type`, `background_chart_direction`, `background_chart_max_column` creates a 3-word prefix chain and blurs the structural boundary between the primary metric and the background visual.

Verdict: **Keep nested.** This is an entity, not attribute grouping. But simplify `max_value` inside it — drop `operation: "value"` and just use `max_column: "max_col"`.

---

## 12. Value Display: `{ mode, percent_decimals }` — FLAT

**Current** (on mosaic, treemap, waffle, pie):
```json
{ "value_display": { "mode": "percentage", "percent_decimals": 2 } }
```

**Flattened**:
```json
{ "value_display_mode": "percentage", "value_display_percent_decimals": 2 }
```

**Problem**: `value_display_percent_decimals` is 4 words — too long. Simplify the subject name:

```json
{ "value_display_mode": "percentage", "value_display_decimals": 2 }
```

Or better — rename the subject from `value_display` to just `value` since "display" is redundant in context:

```json
{ "value_mode": "percentage", "value_decimals": 2 }
```

Both properties follow `{subject}_{attribute}` with `value` as the subject. `value_decimals` only applies when `value_mode: "percentage"`.

Verdict: **Can flatten.** Simplify the subject name to keep prefix chains to 2 words max.

---

## 13. Font Size: `{ min, max }` — FLAT

**Current** (tagcloud):
```json
{ "font_size": { "min": 18, "max": 72 } }
```

**Flattened**:
```json
{ "font_size_min": 18, "font_size_max": 72 }
```

Verdict: **Works.** Clear and discoverable.

---

## 14. Gauge Metric Sub-objects: `goal`, `min`, `max` — FLAT

**Current** (ESQL gauge):
```json
{
  "goal": { "operation": "value", "column": "goal_col" },
  "min": { "operation": "value", "column": "min_col" },
  "max": { "operation": "value", "column": "max_col" }
}
```

After removing `operation: "value"` boilerplate:

**Flattened**:
```json
{
  "goal_column": "goal_col",
  "min_column": "min_col",
  "max_column": "max_col"
}
```

Verdict: **Works perfectly.** Much simpler than the current 3 nested objects.

---

## 15. Annotation Line Style: `{ stroke_dash, stroke_width }` — FLAT

**Current**:
```json
{ "line": { "stroke_dash": "dashed", "stroke_width": 2 } }
```

**Flattened**:
```json
{ "stroke_dash": "dashed", "stroke_width": 2 }
```

Since annotations only have one line, the `line` wrapper adds nothing.

Verdict: **Works.** The `stroke_*` prefix already qualifies the subject.

---

## 16. Annotation Interval (range): `{ from, to }` — KEEP NESTED

**Current**:
```json
{ "interval": { "from": "2024-01-01", "to": "2024-06-01" } }
```

Flattening to `interval_from`, `interval_to` works but `interval` is a meaningful structural concept (a time range). Either approach is fine — this is borderline.

Verdict: **Could go either way.** `interval_from` / `interval_to` works. But `interval: { from, to }` is also clean since it's a well-known pair.

---

## 17. Terms Operation `includes`/`excludes`: `{ values, as_regex }` — FLAT-ISH

**Current**:
```json
{
  "includes": { "values": ["a", "b"], "as_regex": false },
  "excludes": { "values": ["c"], "as_regex": true }
}
```

**Flattened**:
```json
{
  "include_values": ["a", "b"],
  "include_as_regex": false,
  "exclude_values": ["c"],
  "exclude_as_regex": true
}
```

Verdict: **Works**, though `include_as_regex` is a bit awkward. An alternative: `include_values` + `include_regex: boolean`.

---

## 18. Terms Operation `other_bucket`: `{ include_documents_without_field }` — FLAT

**Current**:
```json
{ "other_bucket": { "include_documents_without_field": true } }
```

A nested object with a single boolean.

**Flattened**:
```json
{ "other_bucket_include_empty": true }
```

Verdict: **Works**, and eliminates a pointless nesting level. The property name should also be shortened.

---

## 19. Datatable Summary: `{ type, label }` — FLAT

**Current**:
```json
{ "summary": { "type": "sum", "label": "Total" } }
```

**Flattened**:
```json
{ "summary_type": "sum", "summary_label": "Total" }
```

Verdict: **Works.**

---

## 20. Metric Compare: `{ to, icon, palette, value, baseline }` — KEEP NESTED

**Current**:
```json
{
  "compare": {
    "to": "baseline",
    "baseline": 0,
    "icon": true,
    "palette": "...",
    "value": true
  }
}
```

This is a **discriminated union** (`to: "baseline" | "primary"`) with variant-specific properties (`baseline` only exists when `to: "baseline"`). It's a structural entity representing a comparison configuration.

Verdict: **Keep nested.** Polymorphic config entity.

---

## 21. Color Schemas (`staticColor`, `colorByValue`, `colorMapping`) — KEEP NESTED

These are all discriminated unions or complex structured objects:
- `staticColor: { type: "static", color: "#fff" }`
- `colorByValue: { type: "dynamic", range: "absolute", steps: [...] }`
- `colorMapping: { mode: "categorical", palette: "...", mapping: [...] }`

They contain arrays of complex items and polymorphic discriminators.

Verdict: **Keep nested.** These are data structures, not flat configuration.

---

## 22. XY Decorations — ALREADY FLAT

**Current**:
```json
{
  "fill_opacity": 0.5,
  "line_interpolation": "smooth",
  "minimum_bar_height": 2,
  "point_visibility": "auto",
  "show_current_time_marker": true,
  "show_end_zones": false,
  "show_value_labels": true
}
```

Already flat! The only issue is the `show_*` naming pattern (should be `*_visible`).

Verdict: **Already flat.** Rename `show_*` → `*_visible` and `point_visibility` → adopt consistent visibility naming.

---

## 23. Rank By (terms operation) — KEEP NESTED

```json
{
  "rank_by": {
    "type": "alphabetical",
    "direction": "asc"
  }
}
```

This is a **discriminated union** with 5 variants (alphabetical, rare, significant, column, custom), each with different properties.

Verdict: **Keep nested.** Polymorphic ranking strategy.

---

## Summary Matrix

| # | Nested Object | Current Depth | Verdict | Flattened Form |
|---|---|---|---|---|
| 1 | Axis `title: { value, visible }` | 1 | **FLAT** | `title_text: "...", title_visible: bool` |
| 2 | Axis `labels: { visible, orientation }` | 1 | **FLAT** | `label_visible, label_orientation` |
| 3 | XY `grid`, `ticks` | 0 (boolean) | **ALREADY FLAT** | Rename to `grid_visible`, `tick_visible` |
| 4 | Axis `extent: { type, ... }` | 1 | **KEEP NESTED** | Discriminated union |
| 5 | Density `height.header/value` | 2 | **FLAT** | `header_max_lines, value_max_lines` |
| 6 | Legends | 0 | **ALREADY FLAT** | Fix naming only |
| 7 | XY legend inside | 0 | **ALREADY FLAT** | — |
| 8 | Heatmap `cells.labels` | 2 | **FLAT** | `cell_label_visible` |
| 9 | Metric `alignments: { labels, value }` | 1 | **FLAT** | `label_alignment, value_alignment` |
| 10 | Metric `icon: { name, align }` | 1 | **FLAT** | `icon_name, icon_alignment` |
| 11 | Metric `background_chart` | 1 | **KEEP NESTED** | Sub-entity with own data source |
| 12 | `value_display: { mode, ... }` | 1 | **FLAT** | `value_mode, value_decimals` |
| 13 | Tagcloud `font_size: { min, max }` | 1 | **FLAT** | `font_size_min, font_size_max` |
| 14 | Gauge `goal/min/max` | 1 | **FLAT** | `goal_column, min_column, max_column` |
| 15 | Annotation `line: { stroke_* }` | 1 | **FLAT** | `stroke_dash, stroke_width` |
| 16 | Annotation `interval: { from, to }` | 1 | **BORDERLINE** | `interval_from, interval_to` or keep |
| 17 | Terms `includes/excludes` | 1 | **FLAT-ISH** | `include_values, include_regex` |
| 18 | Terms `other_bucket` | 1 | **FLAT** | `other_bucket_include_empty` |
| 19 | Datatable `summary: { type, label }` | 1 | **FLAT** | `summary_type, summary_label` |
| 20 | Metric `compare` | 1 | **KEEP NESTED** | Discriminated union |
| 21 | Color schemas | 1+ | **KEEP NESTED** | Polymorphic structures |
| 22 | XY `decorations` | 0 | **ALREADY FLAT** | Rename `show_*` |
| 23 | Terms `rank_by` | 1 | **KEEP NESTED** | Discriminated union |

### Scorecard

- **CAN FLATTEN (or already flat)**: 17 out of 23 (74%)
- **KEEP NESTED**: 6 out of 23 (26%) — all are discriminated unions or structural sub-entities

### The Rule That Emerges

Nesting is justified in exactly two cases:

1. **Discriminated unions** — `extent`, `rank_by`, `compare`, `color*` — where the shape changes based on a `type` discriminator. OpenAPI needs the nesting for schema validation.
2. **Structural sub-entities** — `background_chart` — a distinct visual element with its own data source that happens to be configured inside a parent.

Everything else — attribute pairs like `{ visible, orientation }`, `{ min, max }`, `{ value, visible }`, `{ type, label }` — flattens cleanly with `{subject}_{attribute}`.

### The One Recurring Tension

The `label` property (the custom display text on operations/metrics) coexists with `label_*` prefixed properties at the same level in a few places:

```json
{
  "label": "My Metric",
  "label_alignment": "left",
  "label_visible": true
}
```

This is **technically unambiguous** (string vs enum vs boolean) and commonly seen in well-known APIs (HTML elements have `title` attribute AND `title` as a concept prefix). But if it causes confusion, the escape hatch is to use `label_text` for the display name:

```json
{
  "label_text": "My Metric",
  "label_alignment": "left",
  "label_visible": true
}
```

This is pure `{subject}_{attribute}` everywhere, but requires renaming `label` across all operations, which is a significant migration.

---

## 24. Legacy Metric `alignments` + `size` — FLAT

**Current** (legacyMetricESQL):
```json
{
  "alignments": { "labels": "top", "value": "left" },
  "size": "xl"
}
```

**Flattened**:
```json
{
  "label_alignment": "top",
  "value_alignment": "left",
  "size": "xl"
}
```

`size` is already flat and unambiguous (it applies to the whole metric's font). No prefix needed.

Verdict: **Works.** Same pattern as #9.

---

## 25. Annotation `line: { stroke_dash, stroke_width }` (on manual events AND queries) — FLAT

**Current** (xyAnnotationManualEvent, xyAnnotationQuery):
```json
{ "line": { "stroke_dash": "dashed", "stroke_width": 2 } }
```

**Flattened**:
```json
{ "stroke_dash": "dashed", "stroke_width": 2 }
```

The `line` wrapper adds no value — annotations only have one line. The `stroke_*` prefix self-qualifies.

Verdict: **Works.** Same as #15 above.

---

## 26. Annotation `text`: mixed enum + object — KEEP NESTED

**Current** (xyAnnotationQuery):
```json
"text": "none" | "label" | { "type": "field", "field": "message" }
```

This is a **polymorphic property** — can be a simple enum OR an object with `type: "field"`. The `{ type: "field", field }` variant is a structural entity.

Flattening to `label_source: "none" | "label" | "field"` + `label_field: "message"` would work but introduces conditional properties (`label_field` only valid when `label_source: "field"`), similar to the axis extent pattern.

Verdict: **Keep nested.** It's a discriminated union (polymorphic) — the object variant needs its own shape.

---

## 27. XY Reference Line Thresholds (ESQL) — ALREADY FLAT (mostly)

**Current** (xyReferenceLineLayerESQL → thresholds[]):
```json
{
  "column": "threshold_col",
  "operation": "value",
  "color": "...",
  "axis": "left",
  "fill": "above",
  "icon": "alert",
  "text": "label",
  "stroke_dash": "dashed",
  "stroke_width": 2,
  "decoration_position": "right"
}
```

Already flat! Issues are naming-only:
- `text: "none" | "label"` → should be `label_visible: boolean`
- `decoration_position` → `label_position` (it positions the icon+label decoration)
- Remove `operation: "value"` boilerplate

Verdict: **Already flat.** Rename for consistency.

---

## 28. Annotation Manual Range `interval: { from, to }` + `fill` — BORDERLINE

**Current**:
```json
{
  "interval": { "from": "2024-01-01T00:00:00Z", "to": "2024-06-01T00:00:00Z" },
  "fill": "inside"
}
```

`interval` is a well-known pair (`from`/`to`). Could flatten to `interval_from`, `interval_to`, but the wrapper conveys a clear structural boundary: "this is a time range."

Verdict: **Either works.** Keeping `interval` as a nested object is defensible since it's a domain concept (a time range), not just attribute grouping. Flattening is equally valid.

---

## 29. Gauge `shape`: discriminated union — KEEP NESTED

**Current**:
```json
{ "shape": { "type": "bullet", "direction": "horizontal" } }
```
or
```json
{ "shape": { "type": "circle" } }
```

This is a **discriminated union** — `direction` only exists for bullet type. The `type` discriminator drives the shape of the config.

Verdict: **Keep nested.** Polymorphic entity.

---

## 30. XY Fitting: `{ type, dotted, end_value }` — FLAT-ISH

**Current**:
```json
{ "fitting": { "type": "linear", "dotted": true, "end_value": "zero" } }
```

**Flattened** (into the chart root):
```json
{ "fitting_type": "linear", "fitting_dotted": true, "fitting_end_value": "zero" }
```

But `fitting` is currently a top-level chart property alongside `axis`, `legend`, `decorations`, `layers`. Moving its children to the chart root mixes configuration concerns. Alternatively, keep `fitting` as-is — it's already shallow (one level) and semantically cohesive.

Verdict: **Borderline.** `fitting` is already shallow and contains only 3 properties. Flattening gains nothing and loses the grouping. However, if `fitting` stays as a namespace, its children don't need prefixes inside it.

---

## Revised Summary Matrix

| # | Nested Object | Verdict | Flattened Form |
|---|---|---|---|
| 1 | Axis `title: { value, visible }` | **FLAT** | `title_text: "...", title_visible: bool` |
| 2 | Axis `labels: { visible, orientation }` | **FLAT** | `label_visible, label_orientation` |
| 3 | XY `grid`, `ticks` | **ALREADY FLAT** | Rename to `grid_visible`, `tick_visible` |
| 4 | Axis `extent` | **KEEP NESTED** | Discriminated union |
| 5 | Density `height.header/value` | **FLAT** | `header_max_lines, value_max_lines` |
| 6 | Legends | **ALREADY FLAT** | Fix naming only |
| 7 | XY legend inside | **ALREADY FLAT** | — |
| 8 | Heatmap `cells.labels` | **FLAT** | `cell_label_visible` |
| 9 | Metric `alignments` | **FLAT** | `label_alignment, value_alignment` |
| 10 | Metric `icon: { name, align }` | **FLAT** | `icon_name, icon_alignment` |
| 11 | Metric `background_chart` | **KEEP NESTED** | Sub-entity with own data source |
| 12 | `value_display: { mode, ... }` | **FLAT** | `value_mode, value_decimals` |
| 13 | Tagcloud `font_size: { min, max }` | **FLAT** | `font_size_min, font_size_max` |
| 14 | Gauge `goal/min/max` | **FLAT** | `goal_column, min_column, max_column` |
| 15 | Annotation `line` (manual event) | **FLAT** | `stroke_dash, stroke_width` |
| 16 | Annotation `interval` | **BORDERLINE** | Keep or `interval_from, interval_to` |
| 17 | Terms `includes/excludes` | **FLAT-ISH** | `include_values, include_regex` |
| 18 | Terms `other_bucket` | **FLAT** | `other_bucket_include_empty` |
| 19 | Datatable `summary` | **FLAT** | `summary_type, summary_label` |
| 20 | Metric `compare` | **KEEP NESTED** | Discriminated union |
| 21 | Color schemas | **KEEP NESTED** | Polymorphic structures |
| 22 | XY decorations | **ALREADY FLAT** | Rename `show_*` |
| 23 | Terms `rank_by` | **KEEP NESTED** | Discriminated union |
| 24 | Legacy metric `alignments` | **FLAT** | `label_alignment, value_alignment` |
| 25 | Annotation `line` (query) | **FLAT** | `stroke_dash, stroke_width` |
| 26 | Annotation `text` (query) | **KEEP NESTED** | Polymorphic enum + object |
| 27 | Reference line thresholds | **ALREADY FLAT** | Rename for consistency |
| 28 | Annotation `interval` | **BORDERLINE** | Domain pair |
| 29 | Gauge `shape` | **KEEP NESTED** | Discriminated union |
| 30 | XY `fitting` | **BORDERLINE** | Already shallow, keep grouping |

### Final Scorecard

- **CAN FLATTEN (or already flat)**: 21 out of 30 **(70%)**
- **KEEP NESTED**: 7 out of 30 **(23%)** — all discriminated unions or structural sub-entities
- **BORDERLINE**: 2 out of 30 **(7%)** — domain pairs or already-shallow groupings

---

## Conclusion

The flat `{subject}_{attribute}` pattern **works for the vast majority of configuration objects** in this API. The 7 cases that require nesting are **all structurally justified** — they are either:

1. **Discriminated unions** (`extent`, `rank_by`, `compare`, `color*`, `shape`, annotation `text`) — where the schema shape changes based on a type discriminator
2. **Structural sub-entities** (`background_chart`) — distinct visual elements with their own data sources

### The naming rule

Every configuration property follows the `{subject}_{attribute}` pattern — no exceptions, no bare names:

| Pattern | When to use | Example |
|---|---|---|
| `{subject}_{attribute}` | **Always** — for every configuration property | `title_text: "Revenue"`, `title_visible: true`, `label_text: "Count"`, `label_orientation: "angled"` |
| `{attribute}` alone | Only when the attribute is globally unambiguous at that level and has no related sibling attributes | `sort: "asc"`, `scale: "log"` |

This produces uniform, predictable APIs where every property name is self-describing:

```json
{
  "title_text": "Revenue by Region",
  "title_visible": true,
  "label_visible": true,
  "label_orientation": "angled",
  "grid_visible": true,
  "tick_visible": true,
  "sort": "asc",
  "scale": "log",
  "extent": { "type": "custom", "start": 0, "end": 100 }
}
```

The strict `{subject}_{attribute}` form means `title_text` (not bare `title`), `label_text` (not bare `label`). This avoids the ambiguity of a bare name (`title`) coexisting with prefixed modifiers (`title_visible`) — the consumer never has to guess whether a property is a standalone value or a prefix for a family of related properties.

### Edge cases to watch

1. **`label_text` migration** — The current spec uses bare `label` on every operation. Renaming to `label_text` is a significant migration across all operations and chart types, but it eliminates the entire class of "is this a value or a prefix?" ambiguity. The same applies to `title` → `title_text` on axis configurations.

2. **Prefix chain length** — Flattening can produce long names like `other_bucket_include_empty` (4 words). Keep prefix chains to **2-3 words max** by simplifying the subject name (e.g., `value_mode` instead of `value_display_mode`, `value_decimals` instead of `value_display_percent_decimals`).

3. **Top-level namespaces** — Some groupings like `fitting`, `decorations`, `legend`, `axis` serve as organizational namespaces at the chart level. These should stay as objects because they organize distinct configuration domains, not because their children need nesting. Inside these namespaces, children should follow the flat `{subject}_{attribute}` pattern.
