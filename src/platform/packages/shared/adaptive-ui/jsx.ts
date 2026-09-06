/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// JSX authoring surface for ViewSpec composition. Set `jsxImportSource: 'react'`
// and `jsx: 'react'` in tsconfig, then import from `@kbn/adaptive-ui/jsx`.
//
// `toViewSpec` accepts a `<View>` JSX tree and returns a `ViewSpec` compatible
// with all three packs (components, charts, diagrams). Body-node primitives that
// use JSX children (`Text`, `Callout`, `Panel`, `StatGroup`, `Row`, `Actions`,
// and the item-container primitives) are handled by the components shim; chart
// and diagram nodes are passed through via their props.
//
// Note: `Text` children map to `body` via `textFromChildren`. The `format` prop
// is not yet forwarded by the upstream shim — use the `body` prop explicitly for
// plain-string text, and keep the `text()` builder for `format: 'markdown'` until
// the upstream parser is updated.

export {
  Action,
  Actions,
  Badge,
  BadgeGroup,
  Breadcrumb,
  Breadcrumbs,
  Callout,
  Card,
  Cell,
  Checklist,
  ChecklistItem,
  CodeBlock,
  ContextStrip,
  ContextStripItem,
  DashboardGrid,
  DashboardGridItem,
  DescriptionList,
  DescriptionListItem,
  Diff,
  Divider,
  EmptyPrompt,
  Entity,
  EntityList,
  Health,
  Image,
  List,
  ListItem,
  MediaEmbed,
  MultiSelect,
  OverflowMenu,
  OverflowMenuItem,
  Panel,
  RadioGroup,
  RichText,
  RichTextBlock,
  Row,
  SectionRow,
  SelectInput,
  Stat,
  StatGroup,
  Table,
  Text,
  buildJsxShim,
} from './vendor/adaptive-ui-primitives-components/authoring/jsx';
export type {
  ActionProps,
  ActionsProps,
  AuthorNode,
  BadgeGroupProps,
  BadgeProps,
  BreadcrumbProps,
  BreadcrumbsProps,
  CalloutProps,
  CardProps,
  CellProps,
  ChecklistItemProps,
  ChecklistProps,
  CodeBlockProps,
  ContextStripItemProps,
  ContextStripProps,
  DashboardGridItemProps,
  DashboardGridProps,
  DescriptionListItemProps,
  DescriptionListProps,
  DiffProps,
  DividerProps,
  EmptyPromptProps,
  EntityListProps,
  EntityProps,
  HealthProps,
  ImageProps,
  JsxShim,
  ListItemProps,
  ListProps,
  MediaEmbedProps,
  MultiSelectProps,
  OverflowMenuItemProps,
  OverflowMenuProps,
  PanelProps,
  RadioGroupProps,
  RichTextBlockProps,
  RichTextProps,
  RowProps,
  SectionRowProps,
  SelectInputProps,
  StatGroupProps,
  StatProps,
  TableProps,
  TextProps,
  ViewProps,
} from './vendor/adaptive-ui-primitives-components/authoring/jsx';

export {
  BarList,
  BoxPlot,
  Bullet,
  Donut,
  Gauge,
  Heatmap,
  HeatmapStrip,
  Histogram,
  MetricTrend,
  ScatterPlot,
  Sparkline,
  TimeSeries,
  Treemap,
  XyChart,
} from './vendor/adaptive-ui-primitives-charts/generated/jsx';
export type {
  BarListProps,
  BoxPlotProps,
  BulletProps,
  DonutProps,
  GaugeProps,
  HeatmapProps,
  HeatmapStripProps,
  HistogramProps,
  MetricTrendProps,
  ScatterPlotProps,
  SparklineProps,
  TimeSeriesProps,
  TreemapProps,
  XyChartProps,
} from './vendor/adaptive-ui-primitives-charts/generated/jsx';

export { Graph } from './vendor/adaptive-ui-primitives-diagrams/generated/jsx';
export type { GraphProps } from './vendor/adaptive-ui-primitives-diagrams/generated/jsx';

// Pre-built shim over all three packs. Chart and diagram types are registered
// as extension types so their props map directly to node objects.
import { buildJsxShim as buildKibanaJsxShim } from './vendor/adaptive-ui-primitives-components/authoring/jsx';
import { chartJsxPrimitiveTypes } from './vendor/adaptive-ui-primitives-charts/generated/jsx';
import { diagramJsxPrimitiveTypes } from './vendor/adaptive-ui-primitives-diagrams/generated/jsx';
import type { BodyNode } from './vendor/adaptive-ui-host-kibana/schema';

const { View, toViewSpec } = buildKibanaJsxShim<BodyNode>([
  ...chartJsxPrimitiveTypes.map((type) => ({ type })),
  ...diagramJsxPrimitiveTypes.map((type) => ({ type })),
]);
export { View, toViewSpec };
