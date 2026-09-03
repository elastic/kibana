# expressionXY

Expression XY plugin adds a `xy` renderer and function to the expression plugin. The renderer will display the `xy` chart.

## Design

- [XY axis format language](./CONTEXT.md)
- [Axis-owned format policy decision](./docs/adr/0001_axis_owned_format_policy.md)

### Axis-owned formatting

Each left or right Y-axis group uses its first data series as the axis anchor. Axis ticks, detailed tooltips, and reference-line labels use that anchor's effective formatter.

When the anchor is duration-formatted, chart-only layer copies normalize valid duration values from their source units into the anchor's output unit. Human-readable duration output uses seconds as its coordinate unit. Original datatables are logged to Inspector before normalization.

---

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
