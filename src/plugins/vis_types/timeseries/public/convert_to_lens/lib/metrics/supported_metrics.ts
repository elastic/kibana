/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { Operation, Operations } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { MetricType } from '../../../../common/types';
import { TSVB_METRIC_TYPES, PANEL_TYPES, TIME_RANGE_DATA_MODES } from '../../../../common/enums';

interface Agg {
  isFormula?: false;
}
interface AggWithFormula {
  isFormula: true;
  formula: string;
}

export type AggOptions<T> = {
  isFullReference: boolean;
  isFieldRequired: boolean;
  supportedPanelTypes: readonly PANEL_TYPES[];
  supportedTimeRangeModes: readonly TIME_RANGE_DATA_MODES[];
} & (T extends Exclude<Operation, 'formula'> ? Agg : AggWithFormula);

// list of supported TSVB aggregation types in Lens
// some of them are supported on the quick functions tab and some of them
// are supported with formulas

export type Metric<T extends Operation | string> = { name: T } & AggOptions<T>;
interface LocalSupportedMetrics {
  [METRIC_TYPES.AVG]: Metric<typeof Operations.AVERAGE>;
  [METRIC_TYPES.CARDINALITY]: Metric<typeof Operations.UNIQUE_COUNT>;
  [METRIC_TYPES.COUNT]: Metric<typeof Operations.COUNT>;
  [METRIC_TYPES.DERIVATIVE]: Metric<typeof Operations.DIFFERENCES>;
  [METRIC_TYPES.CUMULATIVE_SUM]: Metric<typeof Operations.CUMULATIVE_SUM>;
  [METRIC_TYPES.AVG_BUCKET]: Metric<typeof Operations.FORMULA>;
  [METRIC_TYPES.MAX_BUCKET]: Metric<typeof Operations.FORMULA>;
  [METRIC_TYPES.MIN_BUCKET]: Metric<typeof Operations.FORMULA>;
  [METRIC_TYPES.SUM_BUCKET]: Metric<typeof Operations.FORMULA>;
  [METRIC_TYPES.MAX]: Metric<typeof Operations.MAX>;
  [METRIC_TYPES.MIN]: Metric<typeof Operations.MIN>;
  [METRIC_TYPES.SUM]: Metric<typeof Operations.SUM>;
  [METRIC_TYPES.VALUE_COUNT]: Metric<typeof Operations.COUNT>;
  [TSVB_METRIC_TYPES.STD_DEVIATION]: Metric<typeof Operations.STANDARD_DEVIATION>;
  [TSVB_METRIC_TYPES.PERCENTILE]: Metric<typeof Operations.PERCENTILE>;
  [TSVB_METRIC_TYPES.PERCENTILE_RANK]: Metric<typeof Operations.PERCENTILE_RANK>;
  [TSVB_METRIC_TYPES.FILTER_RATIO]: Metric<typeof Operations.FORMULA>;
  [TSVB_METRIC_TYPES.TOP_HIT]: Metric<typeof Operations.LAST_VALUE>;
  [TSVB_METRIC_TYPES.MATH]: Metric<typeof Operations.FORMULA>;
  [TSVB_METRIC_TYPES.POSITIVE_ONLY]: Metric<typeof Operations.FORMULA>;
  [TSVB_METRIC_TYPES.STATIC]: Metric<typeof Operations.STATIC_VALUE>;
  [TSVB_METRIC_TYPES.POSITIVE_RATE]: Metric<typeof Operations.COUNTER_RATE>;
  [TSVB_METRIC_TYPES.MOVING_AVERAGE]: Metric<typeof Operations.MOVING_AVERAGE>;
  [TSVB_METRIC_TYPES.VARIANCE]: Metric<typeof Operations.FORMULA>;
}

type UnsupportedSupportedMetrics = Exclude<MetricType, keyof LocalSupportedMetrics>;
export type SupportedMetrics = LocalSupportedMetrics & {
  [Key in UnsupportedSupportedMetrics]?: null;
};

const supportedPanelTypes: readonly PANEL_TYPES[] = [
  PANEL_TYPES.TIMESERIES,
  PANEL_TYPES.TOP_N,
  PANEL_TYPES.METRIC,
  PANEL_TYPES.GAUGE,
  PANEL_TYPES.TABLE,
];

const supportedTimeRangeModes: readonly TIME_RANGE_DATA_MODES[] = [
  TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
  TIME_RANGE_DATA_MODES.LAST_VALUE,
];

export const SUPPORTED_METRICS: SupportedMetrics = {
  avg: {
    name: 'average',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  cardinality: {
    name: 'unique_count',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  count: {
    name: 'count',
    isFullReference: false,
    isFieldRequired: false,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  positive_rate: {
    name: 'counter_rate',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES] as const,
    supportedTimeRangeModes,
  },
  moving_average: {
    name: 'moving_average',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES] as const,
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE] as const,
  },
  derivative: {
    name: 'differences',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES] as const,
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE] as const,
  },
  cumulative_sum: {
    name: 'cumulative_sum',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES] as const,
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE] as const,
  },
  avg_bucket: {
    name: 'formula',
    isFullReference: true,
    isFieldRequired: true,
    isFormula: true,
    formula: 'overall_average',
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES] as const,
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE] as const,
  },
  max_bucket: {
    name: 'formula',
    isFullReference: true,
    isFieldRequired: true,
    isFormula: true,
    formula: 'overall_max',
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES] as const,
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE] as const,
  },
  min_bucket: {
    name: 'formula',
    isFullReference: true,
    isFieldRequired: true,
    isFormula: true,
    formula: 'overall_min',
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES] as const,
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE] as const,
  },
  sum_bucket: {
    name: 'formula',
    isFullReference: true,
    isFieldRequired: true,
    isFormula: true,
    formula: 'overall_sum',
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES] as const,
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE] as const,
  },
  max: {
    name: 'max',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  min: {
    name: 'min',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  percentile: {
    name: 'percentile',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  percentile_rank: {
    name: 'percentile_rank',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  sum: {
    name: 'sum',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  filter_ratio: {
    name: 'formula',
    isFullReference: false,
    isFormula: true,
    formula: 'filter_ratio',
    isFieldRequired: false,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  top_hit: {
    name: 'last_value',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  math: {
    name: 'formula',
    isFormula: true,
    formula: 'math',
    isFullReference: false,
    isFieldRequired: false,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  positive_only: {
    name: 'formula',
    isFullReference: true,
    isFieldRequired: true,
    isFormula: true,
    formula: 'pick_max',
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES] as const,
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE] as const,
  },
  static: {
    name: 'static_value',
    isFullReference: true,
    isFieldRequired: false,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  value_count: {
    name: 'count',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  std_deviation: {
    name: 'standard_deviation',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
  variance: {
    name: 'formula',
    isFormula: true,
    formula: 'pow',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes,
    supportedTimeRangeModes,
  },
} as const;

type SupportedMetricsKeys = keyof LocalSupportedMetrics;

export type SupportedMetric = (typeof SUPPORTED_METRICS)[SupportedMetricsKeys];

export const getFormulaFromMetric = (metric: SupportedMetric) => {
  if (metric.isFormula) {
    return metric.formula;
  }
  return metric.name;
};
