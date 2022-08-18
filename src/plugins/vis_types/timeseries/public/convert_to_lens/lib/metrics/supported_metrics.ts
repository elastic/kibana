/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { Operation, Operations } from '@kbn/visualizations-plugin/common';
import { MetricType } from '../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';

export type AggOptions<T> = {
  isFullReference: boolean;
} & (T extends Exclude<Operation, 'formula'>
  ? {
      isFormula?: false;
    }
  : {
      isFormula: true;
      formula: string;
    });

// list of supported TSVB aggregation types in Lens
// some of them are supported on the quick functions tab and some of them
// are supported with formulas

export type SupportedMetric<T extends Operation | string> = { name: T } & AggOptions<T>;
interface LocalSupportedMetrics {
  [METRIC_TYPES.AVG]: SupportedMetric<typeof Operations.AVERAGE>;
  [METRIC_TYPES.CARDINALITY]: SupportedMetric<typeof Operations.UNIQUE_COUNT>;
  [METRIC_TYPES.COUNT]: SupportedMetric<typeof Operations.COUNT>;
  [METRIC_TYPES.DERIVATIVE]: SupportedMetric<typeof Operations.DIFFERENCES>;
  [METRIC_TYPES.CUMULATIVE_SUM]: SupportedMetric<typeof Operations.CUMULATIVE_SUM>;
  [METRIC_TYPES.AVG_BUCKET]: SupportedMetric<typeof Operations.FORMULA>;
  [METRIC_TYPES.MAX_BUCKET]: SupportedMetric<typeof Operations.FORMULA>;
  [METRIC_TYPES.MIN_BUCKET]: SupportedMetric<typeof Operations.FORMULA>;
  [METRIC_TYPES.SUM_BUCKET]: SupportedMetric<typeof Operations.FORMULA>;
  [METRIC_TYPES.MAX]: SupportedMetric<typeof Operations.MAX>;
  [METRIC_TYPES.MIN]: SupportedMetric<typeof Operations.MIN>;
  [METRIC_TYPES.SUM]: SupportedMetric<typeof Operations.SUM>;
  [TSVB_METRIC_TYPES.PERCENTILE]: SupportedMetric<typeof Operations.PERCENTILE>;
  [TSVB_METRIC_TYPES.PERCENTILE_RANK]: SupportedMetric<typeof Operations.PERCENTILE_RANK>;
  [TSVB_METRIC_TYPES.PERCENTILE_RANK]: SupportedMetric<typeof Operations.PERCENTILE_RANK>;
  [TSVB_METRIC_TYPES.FILTER_RATIO]: SupportedMetric<typeof Operations.FORMULA>;
  [TSVB_METRIC_TYPES.TOP_HIT]: SupportedMetric<typeof Operations.LAST_VALUE>;
  [TSVB_METRIC_TYPES.MATH]: SupportedMetric<typeof Operations.FORMULA>;
  [TSVB_METRIC_TYPES.POSITIVE_ONLY]: SupportedMetric<typeof Operations.FORMULA>;
  [TSVB_METRIC_TYPES.STATIC]: SupportedMetric<typeof Operations.STATIC_VALUE>;

  [TSVB_METRIC_TYPES.POSITIVE_RATE]: SupportedMetric<typeof Operations.COUNTER_RATE>;
  [TSVB_METRIC_TYPES.MOVING_AVERAGE]: SupportedMetric<typeof Operations.MOVING_AVERAGE>;
}

type UnsupportedSupportedMetrics = Exclude<MetricType, keyof LocalSupportedMetrics>;
export type SupportedMetrics = LocalSupportedMetrics & {
  [Key in UnsupportedSupportedMetrics]?: null;
};

export const SUPPORTED_METRICS: SupportedMetrics = {
  avg: {
    name: 'average',
    isFullReference: false,
  },
  cardinality: {
    name: 'unique_count',
    isFullReference: false,
  },
  count: {
    name: 'count',
    isFullReference: false,
  },
  positive_rate: {
    name: 'counter_rate',
    isFullReference: true,
  },
  moving_average: {
    name: 'moving_average',
    isFullReference: true,
  },
  derivative: {
    name: 'differences',
    isFullReference: true,
  },
  cumulative_sum: {
    name: 'cumulative_sum',
    isFullReference: true,
  },
  avg_bucket: {
    name: 'formula',
    isFullReference: true,
    isFormula: true,
    formula: 'overall_average',
  },
  max_bucket: {
    name: 'formula',
    isFullReference: true,
    isFormula: true,
    formula: 'overall_max',
  },
  min_bucket: {
    name: 'formula',
    isFullReference: true,
    isFormula: true,
    formula: 'overall_min',
  },
  sum_bucket: {
    name: 'formula',
    isFullReference: true,
    isFormula: true,
    formula: 'overall_sum',
  },
  max: {
    name: 'max',
    isFullReference: false,
  },
  min: {
    name: 'min',
    isFullReference: false,
  },
  percentile: {
    name: 'percentile',
    isFullReference: false,
  },
  percentile_rank: {
    name: 'percentile_rank',
    isFullReference: false,
  },
  sum: {
    name: 'sum',
    isFullReference: false,
  },
  filter_ratio: {
    name: 'formula',
    isFullReference: false,
    isFormula: true,
    formula: 'filter_ratio',
  },
  top_hit: {
    name: 'last_value',
    isFullReference: false,
  },
  math: {
    name: 'formula',
    isFullReference: true,
    isFormula: true,
    formula: 'math',
  },
  positive_only: {
    name: 'formula',
    isFullReference: true,
    isFormula: true,
    formula: 'pick_max',
  },
  static: {
    name: 'static_value',
    isFullReference: true,
  },
};
