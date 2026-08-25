/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Spec builders for every primitive this distribution renders — the Elastic
// components pack, the charts pack, and the diagrams pack, one import path.
// `view` is typed
// against the pack-agnostic `PrimitiveNode`, so a chart node and a components
// node compose in the same body array.
//
// Builds no runtime, so importing this from browser-reachable code costs
// nothing beyond the builder table itself.

export {
  actions,
  badge,
  barList,
  boxPlot,
  breadcrumbs,
  builders,
  bullet,
  callout,
  card,
  checkList,
  codeBlock,
  contextStrip,
  dashboardGrid,
  descriptionList,
  diff,
  divider,
  donut,
  emptyPrompt,
  gauge,
  graph,
  health,
  heatmap,
  heatmapStrip,
  histogram,
  image,
  itemList,
  list,
  mediaEmbed,
  metricTrend,
  multiSelect,
  overflowMenu,
  panel,
  radioGroup,
  richText,
  row,
  scatterPlot,
  sectionRow,
  selectInput,
  sparkline,
  statGroup,
  table,
  text,
  timeSeries,
  treemap,
  view,
  xyChart,
} from './vendor/adaptive-ui-host-kibana/builders';
