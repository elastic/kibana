# @kbn/trace-latency-map

A latency map: time on X, request duration on a log scale on Y, one cell per (time bin, duration row).
Opacity is how many spans are in a cell, hue is how many of them failed. The user draws a region,
then moves or resizes it (pointer or keyboard), and the region becomes an ES|QL condition the host
uses: filter a table, rewrite a query, hand it to another tool. The component never navigates.

It is self-contained: data comes through an injected `runEsql`, and the package imports no APM,
Discover or Lens code.

```tsx
<LatencyMap
  source={{ timeRange: { from, to }, filters: ['service.name == "checkout"'] }}
  runEsql={(query, { signal }) => runQuery(query, signal)}
  selection={selection}
  onSelectionCommit={(next, esqlCondition) => setSelection(next)}
/>
```

The map is controlled: keep the selection the commit gives and pass it back.

## How it reads the data

1. A statistics query (min, p90, p95, p99, max, count) sets the rows: 23 log-scale rows from the
   fastest span to the p99, plus one reserved row from the p99 to the slowest span, so a few slow
   outliers stay visible without squashing the body of the distribution.
2. A grid query counts spans and failed spans per (time column, row), binned in Elasticsearch.
3. Above 500,000 spans, failed spans and the slowest 5% are read exactly and the rest from a random
   sample, scaled up (`onStats` reports `sampled`).

Duration and outcome are normalized across classic APM, legacy APM and OTel in
`src/query/fields.ts`: the one place to change when the field matrix does.

## Selections

A committed selection is always a whole number of cells, so what is highlighted, what the tooltip
counts and what the condition selects are the same spans. `selectionToEsqlCondition` is exported for
hosts that restore a selection from the URL.

## Layout

- `src/query`, `src/selection/to_esql.ts`: React-free, so they can move to a common package.
- `src/geometry`, `src/selection/{gesture,keyboard}.ts`: pure pixel, cell and interaction logic.
- `src/hooks`, `src/components`: React.
- `src/stories`: Storybook with a fake `runEsql` producing bimodal, moving, burst and outlier
  patterns. `yarn storybook trace_latency_map`.
