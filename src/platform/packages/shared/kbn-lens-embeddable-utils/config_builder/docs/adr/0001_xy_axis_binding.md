# ADR-0001: Replace `axis_id` with `axis`, rename `secondary_y` to `y2`, remove `anchor`

- **Status:** Accepted
- **Date:** 2026-04-10
- **Scope:** XY chart config builder schema and transforms

## Context

The Lens Visualization API exposes an XY chart schema where Y metrics and reference line
thresholds are bound to axes via an `axis_id` property with values `'y' | 'secondary_y'`
(metrics) or `'x' | 'y' | 'secondary_y'` (reference lines). The root axis configuration
uses matching keys: `axis.x`, `axis.y`, `axis.secondary_y`. Each Y axis also has an
`anchor` property (`'start' | 'end'`) that controls which physical side it renders on.

Feedback identified three problems:

1. **`axis_id` reads as an opaque identifier** (like a database ID), not a meaningful enum.
   Users must discover that the values match root axis config keys.

2. **`secondary_y` is verbose and implies a hierarchy that does not exist.** Lens treats both
   Y axes identically in schema and capability. The only asymmetry is which axis is the
   default when unspecified.

3. **`anchor` creates a round-trip fidelity problem.** Lens internally stores axis settings
   in physical slots (`yLeft`, `yRight`) with no memory of the original logical axis name.
   When `y.anchor: 'end'` and `y2.anchor: 'start'` are used (swapping the default sides),
   the settings land on the correct physical sides but the logical names are lost. On the
   way back out, the code always reconstructs `y = left, y2 = right`, swapping the names.
   This makes `anchor` a source of instability rather than a useful abstraction.

## Decision

Three changes:

1. **Rename the per-metric binding property** from `axis_id` to `axis`.
2. **Rename the secondary Y axis** from `secondary_y` to `y2` everywhere (root config key
   and enum values).
3. **Remove `anchor`** from the Y axis schema. Axis position is determined solely by the
   key name: `y` is always on the start side, `y2` is always on the end side.

### Axis binding

| Context         | Property | Values                       | Default |
|-----------------|----------|------------------------------|---------|
| Y metrics       | `axis`   | `'y'` or `'y2'`             | `'y'`   |
| Reference lines | `axis`   | `'x'`, `'y'`, or `'y2'`     | `'y'`   |
| Root axis keys  | --       | `x`, `y`, `y2`               | --      |

`axis` is omitted from the API output when the value is the default (`'y'`). It is only
emitted for `'y2'` on Y metrics, and for `'x'` or `'y2'` on reference lines.

### Fixed axis positions

The axis key determines the physical side, replacing the previous
`anchor: 'start' | 'end'` property:

| Key  | Side                                           |
|------|------------------------------------------------|
| `y`  | Start (left in vertical, bottom in horizontal) |
| `y2` | End (right in vertical, top in horizontal)     |

This means:
- A single axis on the start side: define `y` only.
- A single axis on the end side: define `y2` only (omit `y`).
- Dual axes: define both `y` and `y2`.

This eliminates the round-trip instability caused by `anchor`, since Lens internally
only has `yLeft`/`yRight` physical slots with no memory of the original logical name.

## Rationale

### Property name: `axis`

We surveyed how major charting libraries bind series to axes:

| Library / Platform | Property name          | Values                        | Style              |
|--------------------|------------------------|-------------------------------|--------------------|
| Datadog            | `on_right_yaxis`       | `true` / `false`              | Boolean, `on_` prefix |
| Chart.js           | `yAxisID`              | `'y'`, `'y1'`, ...           | String ID matching |
| Recharts           | `yAxisId`              | `'left'`, `'right'`, ...     | String ID matching |
| Highcharts         | `yAxis`                | `0`, `1`, ... or axis id     | Index or ID        |
| ECharts            | `yAxisIndex`           | `0`, `1`, ...                | Numeric index      |
| Google Charts      | `targetAxisIndex`      | `0`, `1`                     | Numeric index      |
| Plotly             | `secondary_y`          | `True` / `False`             | Boolean parameter  |
| Grafana            | `custom.axisPlacement` | `'left'`, `'right'`, ...     | Physical position  |
| Elastic Charts     | `groupId`              | arbitrary string              | Group matching     |

`axis` is the simplest possible name. Its values directly match the root axis configuration
keys (`axis.y`, `axis.y2`, `axis.x`), so usage reads naturally: `"axis": "y2"` means
"plot this on the y2 axis." This follows the fixed-value enum approach from
Chart.js/Recharts where values match named axis config keys.

### Values: `y` and `y2`

| Library  | Default Y axis | Additional Y axis |
|----------|----------------|-------------------|
| Chart.js | `y`            | `y1`              |
| Plotly   | `yaxis`        | `yaxis2`          |
| Recharts | `left`         | `right`           |

Industry convention: the default axis is unnumbered; the additional one gets a numeric
suffix. We use `y` + `y2` (not `y1` since the default is already `y`).

### Why remove `anchor`

The `anchor` property allowed placing either Y axis on either physical side. However,
Lens internally only has `yLeft` and `yRight` slots — there is no field to store which
logical axis name was assigned to which side. This means:

- **Input:** `y.anchor: 'end'`, `y2.anchor: 'start'` (swapped sides)
- **Lens state:** settings correctly land on `yRight` and `yLeft`
- **Output:** code reconstructs `y = left (start)`, `y2 = right (end)` — names are swapped

By fixing the position convention (`y` = start, `y2` = end), the axis key fully determines
the physical side, and the round-trip is stable.

## Alternatives considered

### Structural arrays (`y` + `y2` as separate metric arrays on the data layer)

Eliminates the binding property entirely: metrics placed in the `y` array go to the default
axis, metrics in the `y2` array go to the additional axis. Inspired by Vega-Lite's
independent layer scales.

Rejected because the restructuring cost is disproportionate to the clarity gain, and
reference lines would still need a separate pattern for the X axis.

### Boolean on Y metrics (`on_secondary_axis: true`)

Inspired by Datadog (`on_right_yaxis`) and Plotly (`secondary_y`). Simple for the binary
Y-metric case.

Rejected because it creates two different binding mechanisms: a boolean on Y metrics vs an
enum on reference lines. A single property name with context-appropriate values is more
consistent.

### Role-based enum (`y_scale: 'primary' | 'secondary'`)

"Primary" and "secondary" suggest a semantic ranking that does not exist. Lens treats both
axes identically; only the default differs. The values would also not match root axis config
keys, requiring a mapping table.

### Physical placement (`y_side: 'left' | 'right'` or `'start' | 'end'`)

Grafana uses physical placement per field. This is a poor fit for the Lens API because:

1. **Horizontal charts break positional names.** The same chart configuration can describe
   vertical and horizontal bar charts (e.g., `bar` vs `bar_horizontal`). With positional
   names, rotating the chart would require rewriting every metric binding (`left`/`right` to
   `top`/`bottom`) even though the logical data-to-scale relationship has not changed. With
   logical names like `y`/`y2`, switching orientation only changes the layer `type`; all axis
   bindings remain valid.
2. **Lens has no persistent axis identity.** Internally Lens only knows `yLeft` and `yRight`.
   A per-metric physical placement property would be redundant with the axis key convention
   and could not survive a round-trip without extra stored state.

### Keep `anchor` with normalization on input

Instead of removing `anchor`, normalize swapped anchors on input (swap axis configs and
remap metric `axis` values when `y.anchor: 'end'`).

Rejected because it adds complexity for no user benefit: the normalization is invisible to
the user, and the result is the same as if `anchor` did not exist. Removing `anchor`
entirely is simpler and makes the constraint explicit.

### Rename only (`axis_id` to `axis`, keep `'y' | 'secondary_y'`)

Cheapest change but smallest improvement. `secondary_y` remains verbose and the values still
look like internal config keys.

## Consequences

- Breaking change: consumers of `axis_id`, `axis.secondary_y`, and `anchor` must migrate.
- Migration is mechanical (see table below).
- All transforms (API-to-Lens and Lens-to-API) updated to read/emit the new property names.
- Types derived from schema (`TypeOf<typeof ...>`) update automatically.
- Round-trip stability is guaranteed: the API output from Lens state always matches the
  canonical input form.

### Migration table

| Old                                | New                           |
|------------------------------------|-------------------------------|
| Root `axis.secondary_y`           | `axis.y2`                     |
| `anchor: 'start'` on Y axis      | Remove (implied by `y` key)   |
| `anchor: 'end'` on Y axis        | Move config to `y2` key       |
| Y metric `axis_id: 'y'`          | Omit (or `axis: 'y'`)        |
| Y metric `axis_id: 'secondary_y'`| `axis: 'y2'`                 |
| Ref line `axis_id: 'y'`          | Omit (or `axis: 'y'`)        |
| Ref line `axis_id: 'secondary_y'`| `axis: 'y2'`                 |
| Ref line `axis_id: 'x'`          | `axis: 'x'`                  |
