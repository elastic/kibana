/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ColorRules,
  BackgroundColorRules,
  BarColorRules,
  GaugeColorRules,
} from './color_rules_types';
import { PANEL_TYPES } from '../panel_types';
import { TOOLTIP_MODES } from './index';

export type IndexPatternValue = { id: string } | string | undefined;

interface QueryObject {
  language: string;
  query: string | { [key: string]: any };
}

export interface Annotation {
  color?: string | null;
  fields?: string | null;
  hidden?: boolean;
  icon?: string | null;
  id: string;
  ignore_global_filters?: number;
  ignore_panel_filters?: number;
  index_pattern: IndexPatternValue;
  query_string?: QueryObject;
  template?: string | null;
  time_field?: string | null;
}

interface MetricVariable {
  field?: string | null;
  id: string;
  name?: string | null;
}

interface Percentile {
  id: string;
  mode: 'line' | 'band';
  field?: string | null;
  shade?: number | string | null;
  value?: number | string | null;
  percentile?: string | null;
}

export interface Metric {
  field?: string | null;
  id: string;
  alias?: string | null;
  metric_agg?: string | null;
  numerator?: QueryObject;
  denominator?: QueryObject;
  sigma?: string | null;
  unit?: string | null;
  model_type?: string | null;
  mode?: string | null;
  lag?: number | '';
  alpha?: number;
  beta?: number;
  gamma?: number;
  period?: number;
  multiplicative?: boolean;
  window?: number;
  function?: string | null;
  script?: string | null;
  variables?: MetricVariable[];
  numberOfSignificantValueDigits?: number;
  percentiles?: Percentile[];
  type: string;
  value?: string | null;
  values?: Array<string | null> | null;
  size?: string | number | null;
  agg_with?: string | null;
  order?: string | null;
  order_by?: string | null;
}

interface SplitFilters {
  color?: string | null;
  filter?: QueryObject;
  id?: string | null;
  label?: string | null;
}

export interface Series {
  aggregate_by?: string | null;
  aggregate_function?: string | null;
  axis_min?: string | number | null;
  axis_max?: string | number | null;
  axis_position: string;
  chart_type: string;
  color: string;
  color_rules?: ColorRules[];
  fill?: number | '';
  filter?: QueryObject | '';
  formatter: string;
  hidden?: boolean;
  hide_in_legend?: number;
  id: string;
  ignore_global_filter?: number;
  label?: string | null;
  line_width?: number | '';
  metrics: Metric[];
  offset_time?: string | null;
  override_index_pattern?: number;
  palette: {
    type: string;
    name: string;
  };
  point_size?: number | '';
  separate_axis: number;
  seperate_axis: number;
  series_drop_last_bucket: number;
  series_index_pattern: IndexPatternValue;
  series_interval?: string | null;
  series_max_bars: number;
  series_time_field?: string | null;
  split_color_mode?: string | null;
  split_filters?: SplitFilters[];
  split_mode: string;
  stacked: string;
  steps: number;
  terms_direction?: string | null;
  terms_exclude?: string | null;
  terms_field?: string | null;
  terms_include?: string | null;
  terms_order_by?: string | null;
  terms_size?: string | null;
  time_range_mode?: string | null;
  trend_arrows?: number;
  type?: string | null;
  value_template?: string | null;
  var_name?: string | null;
}

export interface Panel {
  annotations?: Annotation[];
  axis_formatter: string;
  axis_max?: string | number | null;
  axis_min?: string | number | null;
  axis_position: string;
  axis_scale: string;
  background_color?: string | null;
  background_color_rules?: BackgroundColorRules[];
  bar_color_rules: BarColorRules[];
  drilldown_url?: string;
  drop_last_bucket: number;
  filter?: QueryObject;
  gauge_color_rules?: GaugeColorRules[];
  gauge_inner_color?: string | null;
  gauge_inner_width?: string | number | null;
  gauge_max?: number | '';
  gauge_style?: string | null;
  gauge_width?: string | number | null;
  hide_last_value_indicator: boolean;
  id: string;
  ignore_global_filter?: number;
  ignore_global_filters?: number;
  index_pattern: IndexPatternValue;
  interval: string;
  isModelInvalid?: boolean;
  legend_position?: string | null;
  markdown?: string | null;
  markdown_css?: string | null;
  markdown_less?: string | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  markdown_openLinksInNewTab: number;
  markdown_scrollbars: number;
  markdown_vertical_align?: string | null;
  max_bars: number;
  pivot_id?: string | null;
  pivot_label?: string | null;
  pivot_rows?: string | null;
  pivot_type?: string | null;
  series: Series[];
  show_grid: number;
  show_legend: number;
  time_field?: string | null;
  time_range_mode?: string | null;
  tooltip_mode?: TOOLTIP_MODES;
  type: PANEL_TYPES;
  use_kibana_indexes?: boolean;
}

export interface VisPayload {
  filters: Array<any | null>;
  panels: Panel[];
  // general
  query: QueryObject[] | null;
  state: {
    sort?: {
      column: string;
      order: 'asc' | 'desc';
    };
  };
  timerange: {
    timezone: string;
    min: string;
    max: string;
  };
  searchSession?: {
    sessionId: string;
    isRestore: boolean;
    isStored: boolean;
  };
}
