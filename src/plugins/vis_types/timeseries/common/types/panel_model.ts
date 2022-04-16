/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Query, METRIC_TYPES, KBN_FIELD_TYPES } from '@kbn/data-plugin/common';
import { PANEL_TYPES, TOOLTIP_MODES, TSVB_METRIC_TYPES } from '../enums';
import type { IndexPatternValue, Annotation } from '.';
import type {
  ColorRules,
  BackgroundColorRules,
  BarColorRules,
  GaugeColorRules,
} from './color_rules';

interface MetricVariable {
  field?: string;
  id: string;
  name?: string;
}

interface Percentile {
  id: string;
  mode: 'line' | 'band';
  field?: string;
  shade?: number | string;
  value?: number | string;
  percentile?: string;
  color?: string;
}

export type MetricType = METRIC_TYPES | TSVB_METRIC_TYPES;

export interface Metric {
  field?: string;
  id: string;
  alias?: string;
  metric_agg?: string;
  numerator?: Query;
  denominator?: Query;
  sigma?: string;
  unit?: string;
  model_type?: string;
  mode?: string;
  lag?: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
  period?: number;
  multiplicative?: boolean;
  window?: number;
  function?: string;
  script?: string;
  variables?: MetricVariable[];
  numberOfSignificantValueDigits?: number;
  percentiles?: Percentile[];
  type: MetricType;
  value?: string;
  values?: string[];
  colors?: string[];
  size?: string | number;
  agg_with?: string;
  order?: string;
  order_by?: string;
}

interface SplitFilters {
  color?: string;
  filter?: Query;
  id?: string;
  label?: string;
}

export interface Series {
  aggregate_by?: string;
  aggregate_function?: string;
  axis_min?: string | number;
  axis_max?: string | number;
  axis_position: string;
  chart_type: string;
  color: string;
  color_rules?: ColorRules[];
  fill?: string;
  filter?: Query;
  formatter: string;
  hidden?: boolean;
  hide_in_legend?: number;
  id: string;
  ignore_global_filter?: number;
  label?: string;
  line_width?: number;
  metrics: Metric[];
  offset_time?: string;
  override_index_pattern?: number;
  palette: {
    type: string;
    name: string;
  };
  point_size?: number;
  separate_axis: number;
  seperate_axis: number;
  series_drop_last_bucket: number;
  series_index_pattern: IndexPatternValue;
  series_interval?: string;
  series_max_bars: number;
  series_time_field?: string;
  split_color_mode?: string;
  split_filters?: SplitFilters[];
  split_mode: string;
  stacked: string;
  steps: number;
  terms_direction?: string;
  terms_exclude?: string;
  terms_field?: string | Array<string | null>;
  terms_include?: string;
  terms_order_by?: string;
  terms_size?: string;
  time_range_mode?: string;
  trend_arrows?: number;
  value_template?: string;
  var_name?: string;
}

export interface Panel {
  annotations?: Annotation[];
  axis_formatter: string;
  axis_max?: string | number;
  axis_min?: string | number;
  axis_position: string;
  axis_scale: string;
  background_color?: string;
  background_color_rules?: BackgroundColorRules[];
  bar_color_rules: BarColorRules[];
  drilldown_url?: string;
  drop_last_bucket: number;
  filter?: Query;
  gauge_color_rules?: GaugeColorRules[];
  gauge_inner_color?: string;
  gauge_inner_width?: string | number;
  gauge_max?: number | '';
  gauge_style?: string;
  gauge_width?: string | number;
  hide_last_value_indicator: boolean;
  id: string;
  ignore_daylight_time: boolean;
  ignore_global_filter?: number;
  ignore_global_filters?: number;
  index_pattern: IndexPatternValue;
  interval: string;
  isModelInvalid?: boolean;
  legend_position?: string;
  markdown?: string;
  markdown_css?: string;
  markdown_less?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  markdown_openLinksInNewTab: number;
  markdown_scrollbars: number;
  markdown_vertical_align?: string;
  max_bars: number;
  pivot_id?: string | Array<string | null>;
  pivot_label?: string;
  pivot_rows?: string;
  pivot_type?: KBN_FIELD_TYPES | Array<KBN_FIELD_TYPES | null>;
  series: Series[];
  show_grid: number;
  show_legend: number;
  truncate_legend?: number;
  max_lines_legend?: number;
  time_field?: string;
  time_range_mode?: string;
  tooltip_mode?: TOOLTIP_MODES;
  type: PANEL_TYPES;
  use_kibana_indexes?: boolean;
}
