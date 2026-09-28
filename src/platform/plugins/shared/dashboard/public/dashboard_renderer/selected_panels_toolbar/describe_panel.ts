/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PublishesTitle } from '@kbn/presentation-publishing';

/** Minimal shape of the Lens attributes read here; everything is optional and best-effort */
interface LensColumn {
  label?: string;
  customLabel?: boolean;
  isBucketed?: boolean;
  dataType?: string;
  sourceField?: string;
  /** ES|QL (text based) columns */
  fieldName?: string;
  meta?: { type?: string };
}

interface LensAttributes {
  title?: string;
  visualizationType?: string;
  state?: {
    visualization?: {
      shape?: string;
      preferredSeriesType?: string;
      layers?: Array<{ seriesType?: string; layerType?: string }>;
    };
    datasourceStates?: Record<
      string,
      { layers?: Record<string, { columns?: Record<string, LensColumn> | LensColumn[] }> }
    >;
  };
}

interface ChartKind {
  name: string;
  icon: IconType;
}

const chartKind = (name: string, icon: IconType): ChartKind => ({ name, icon });

const CHART_KINDS = {
  bar: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.barChart', { defaultMessage: 'Bar chart' }),
      'chartBarVertical'
    ),
  line: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.lineChart', { defaultMessage: 'Line chart' }),
      'chartLine'
    ),
  area: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.areaChart', { defaultMessage: 'Area chart' }),
      'chartArea'
    ),
  pie: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.pieChart', { defaultMessage: 'Pie chart' }),
      'chartPie'
    ),
  donut: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.donutChart', { defaultMessage: 'Donut chart' }),
      'chartPie'
    ),
  treemap: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.treemap', { defaultMessage: 'Treemap' }),
      'chartPie'
    ),
  mosaic: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.mosaic', { defaultMessage: 'Mosaic' }),
      'chartPie'
    ),
  waffle: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.waffle', { defaultMessage: 'Waffle' }),
      'chartPie'
    ),
  heatmap: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.heatmap', { defaultMessage: 'Heatmap' }),
      'chartHeatmap'
    ),
  metric: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.metric', { defaultMessage: 'Metric' }),
      'chartMetric'
    ),
  gauge: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.gauge', { defaultMessage: 'Gauge' }),
      'chartGauge'
    ),
  tagcloud: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.tagCloud', { defaultMessage: 'Tag cloud' }),
      'chartTagCloud'
    ),
  table: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.table', { defaultMessage: 'Table' }),
      'visTable'
    ),
  other: () =>
    chartKind(
      i18n.translate('dashboard.describePanel.chart', { defaultMessage: 'Chart' }),
      'chartBarVertical'
    ),
};

const getChartKind = (attributes: LensAttributes): ChartKind => {
  const visualization = attributes.state?.visualization;
  switch (attributes.visualizationType) {
    case 'lnsXY': {
      const seriesType =
        visualization?.layers?.find((layer) => layer.seriesType)?.seriesType ??
        visualization?.preferredSeriesType ??
        '';
      if (seriesType.startsWith('line')) return CHART_KINDS.line();
      if (seriesType.startsWith('area')) return CHART_KINDS.area();
      return CHART_KINDS.bar();
    }
    case 'lnsPie': {
      const shape = visualization?.shape as keyof typeof CHART_KINDS | undefined;
      return shape && shape in CHART_KINDS ? CHART_KINDS[shape]() : CHART_KINDS.pie();
    }
    case 'lnsHeatmap':
      return CHART_KINDS.heatmap();
    case 'lnsMetric':
    case 'lnsLegacyMetric':
      return CHART_KINDS.metric();
    case 'lnsGauge':
      return CHART_KINDS.gauge();
    case 'lnsTagcloud':
      return CHART_KINDS.tagcloud();
    case 'lnsDatatable':
      return CHART_KINDS.table();
    default:
      return CHART_KINDS.other();
  }
};

const getColumns = (attributes: LensAttributes): LensColumn[] =>
  Object.values(attributes.state?.datasourceStates ?? {}).flatMap((datasource) =>
    Object.values(datasource?.layers ?? {}).flatMap((layer) =>
      Array.isArray(layer?.columns) ? layer.columns : Object.values(layer?.columns ?? {})
    )
  );

const isDateColumn = (column: LensColumn) =>
  column.dataType === 'date' || column.meta?.type === 'date';

/** "Median of bytes" for metrics; the field ("machine.os.keyword") for breakdowns */
const getMetricLabel = (column: LensColumn) => column.label || column.fieldName;
const getBreakdownLabel = (column: LensColumn) =>
  (column.customLabel && column.label) || column.sourceField || column.fieldName || column.label;

/**
 * Describes what a Lens panel shows, so panels can be told apart even without a title:
 * e.g. "Bar chart · Median of bytes by machine.os.keyword".
 */
export const describePanel = (api: unknown): { description: string; icon: IconType } => {
  const attributes =
    (api as { getFullAttributes?: () => LensAttributes | undefined })?.getFullAttributes?.() ?? {};
  const kind = getChartKind(attributes);
  const columns = getColumns(attributes);

  const metric = columns.find((column) => !column.isBucketed && getMetricLabel(column));
  // prefer a real breakdown (terms, filters…) over the time axis
  const breakdown =
    columns.find((column) => column.isBucketed && !isDateColumn(column)) ??
    columns.find((column) => column.isBucketed);

  const metricLabel = metric && getMetricLabel(metric);
  const breakdownLabel = breakdown && !isDateColumn(breakdown) && getBreakdownLabel(breakdown);

  const details = metricLabel
    ? breakdownLabel
      ? i18n.translate('dashboard.describePanel.metricByBreakdown', {
          defaultMessage: '{metric} by {breakdown}',
          values: { metric: metricLabel, breakdown: breakdownLabel },
        })
      : metricLabel
    : undefined;

  return {
    description: details ? `${kind.name} · ${details}` : kind.name,
    icon: kind.icon,
  };
};

/**
 * A panel's name: its custom title, else the visualization's default title, else the title saved in
 * its attributes. Empty strings count as missing: panels whose header is hidden (the name is drawn
 * inside the chart instead) publish `''` as their title.
 */
export const getPanelTitle = (api: unknown): string | undefined => {
  const { title$, defaultTitle$ } = (api ?? {}) as Partial<PublishesTitle>;
  const attributesTitle = (
    api as { getFullAttributes?: () => LensAttributes | undefined } | undefined
  )?.getFullAttributes?.()?.title;
  return (
    [title$?.value, defaultTitle$?.value, attributesTitle]
      .map((title) => title?.trim())
      .find((title) => title) || undefined
  );
};
