/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PANEL_TYPES, TIME_RANGE_DATA_MODES } from '../../../../common/enums';
interface AggOptions {
  name: string;
  isFullReference: boolean;
  isFieldRequired: boolean;
  supportedPanelTypes: string[];
  supportedTimeRangeModes: string[];
}

// list of supported TSVB aggregation types in Lens
// some of them are supported on the quick functions tab and some of them
// are supported with formulas

export const SUPPORTED_METRICS: { [key: string]: AggOptions } = {
  avg: {
    name: 'average',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  cardinality: {
    name: 'unique_count',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  count: {
    name: 'count',
    isFullReference: false,
    isFieldRequired: false,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  positive_rate: {
    name: 'counter_rate',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  moving_average: {
    name: 'moving_average',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES],
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE],
  },
  derivative: {
    name: 'differences',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES],
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE],
  },
  cumulative_sum: {
    name: 'cumulative_sum',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES],
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE],
  },
  avg_bucket: {
    name: 'overall_average',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES],
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE],
  },
  max_bucket: {
    name: 'overall_max',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES],
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE],
  },
  min_bucket: {
    name: 'overall_min',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES],
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE],
  },
  sum_bucket: {
    name: 'overall_sum',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES],
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE],
  },
  max: {
    name: 'max',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  min: {
    name: 'min',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  percentile: {
    name: 'percentile',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  percentile_rank: {
    name: 'percentile_rank',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  sum: {
    name: 'sum',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  filter_ratio: {
    name: 'filter_ratio',
    isFullReference: false,
    isFieldRequired: false,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  top_hit: {
    name: 'last_value',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  math: {
    name: 'formula',
    isFullReference: true,
    isFieldRequired: false,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  positive_only: {
    name: 'pick_max',
    isFullReference: true,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES],
    supportedTimeRangeModes: [TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE],
  },
  static: {
    name: 'static_value',
    isFullReference: true,
    isFieldRequired: false,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  value_count: {
    name: 'count',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
  std_deviation: {
    name: 'standard_deviation',
    isFullReference: false,
    isFieldRequired: true,
    supportedPanelTypes: [PANEL_TYPES.TIMESERIES, PANEL_TYPES.TOP_N],
    supportedTimeRangeModes: [
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      TIME_RANGE_DATA_MODES.LAST_VALUE,
    ],
  },
};
