/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { TypeOptions } from '@kbn/config-schema/target/types/types';

const stringOptionalNullable = schema.maybe(schema.nullable(schema.string()));

const stringRequired = schema.string();

const arrayNullable = schema.arrayOf(schema.nullable(schema.any()));

const validateInteger: TypeOptions<number>['validate'] = (value) => {
  if (!Number.isInteger(value)) {
    return `${value} is not an integer`;
  }
};
const numberIntegerOptional = schema.maybe(schema.number({ validate: validateInteger }));
const numberIntegerRequired = schema.number({ validate: validateInteger });

const numberOptional = schema.maybe(schema.number());

const queryObject = schema.object({
  language: schema.string(),
  query: schema.string(),
});
const stringOrNumberOptionalNullable = schema.nullable(
  schema.oneOf([stringOptionalNullable, numberOptional])
);
const numberOptionalOrEmptyString = schema.maybe(
  schema.oneOf([numberOptional, schema.literal('')])
);

export const fieldObject = stringOptionalNullable;

export const annotationsItems = schema.object({
  color: stringOptionalNullable,
  fields: stringOptionalNullable,
  hidden: schema.maybe(schema.boolean()),
  icon: stringOptionalNullable,
  id: schema.string(),
  ignore_global_filters: numberIntegerOptional,
  ignore_panel_filters: numberIntegerOptional,
  index_pattern: stringOptionalNullable,
  query_string: schema.maybe(queryObject),
  template: stringOptionalNullable,
  time_field: fieldObject,
});

const backgroundColorRulesItems = schema.object({
  value: schema.maybe(schema.nullable(schema.number())),
  id: stringOptionalNullable,
  background_color: stringOptionalNullable,
  color: stringOptionalNullable,
  operator: stringOptionalNullable,
});

const gaugeColorRulesItems = schema.object({
  gauge: stringOptionalNullable,
  text: stringOptionalNullable,
  id: stringOptionalNullable,
  operator: stringOptionalNullable,
  value: schema.maybe(schema.nullable(schema.number())),
});
export const metricsItems = schema.object({
  field: fieldObject,
  id: stringRequired,
  alias: stringOptionalNullable,
  metric_agg: stringOptionalNullable,
  numerator: schema.maybe(queryObject),
  denominator: schema.maybe(queryObject),
  sigma: stringOptionalNullable,
  unit: stringOptionalNullable,
  model_type: stringOptionalNullable,
  mode: stringOptionalNullable,
  lag: numberOptionalOrEmptyString,
  alpha: numberOptional,
  beta: numberOptional,
  gamma: numberOptional,
  period: numberOptional,
  multiplicative: schema.maybe(schema.boolean()),
  window: numberOptional,
  function: stringOptionalNullable,
  script: stringOptionalNullable,
  variables: schema.maybe(
    schema.arrayOf(
      schema.object({
        field: fieldObject,
        id: stringRequired,
        name: stringOptionalNullable,
      })
    )
  ),
  numberOfSignificantValueDigits: numberOptional,
  percentiles: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: stringRequired,
        field: fieldObject,
        mode: schema.oneOf([schema.literal('line'), schema.literal('band')]),
        shade: schema.oneOf([numberOptional, stringOptionalNullable]),
        value: schema.maybe(schema.oneOf([numberOptional, stringOptionalNullable])),
        percentile: stringOptionalNullable,
      })
    )
  ),
  type: stringRequired,
  value: stringOptionalNullable,
  values: schema.maybe(schema.nullable(schema.arrayOf(schema.nullable(schema.string())))),
  size: stringOrNumberOptionalNullable,
  agg_with: stringOptionalNullable,
  order: stringOptionalNullable,
  order_by: fieldObject,
});

const splitFiltersItems = schema.object({
  id: stringOptionalNullable,
  color: stringOptionalNullable,
  filter: schema.maybe(queryObject),
  label: stringOptionalNullable,
});

export const seriesItems = schema.object({
  aggregate_by: fieldObject,
  aggregate_function: stringOptionalNullable,
  axis_position: stringRequired,
  axis_max: stringOrNumberOptionalNullable,
  axis_min: stringOrNumberOptionalNullable,
  chart_type: stringRequired,
  color: stringRequired,
  color_rules: schema.maybe(
    schema.arrayOf(
      schema.object({
        value: numberOptional,
        id: stringRequired,
        text: stringOptionalNullable,
        operator: stringOptionalNullable,
      })
    )
  ),
  fill: numberOptionalOrEmptyString,
  filter: schema.maybe(
    schema.oneOf([
      schema.object({
        query: stringRequired,
        language: stringOptionalNullable,
      }),
      schema.literal(''),
    ])
  ),
  formatter: stringRequired,
  hide_in_legend: numberIntegerOptional,
  hidden: schema.maybe(schema.boolean()),
  id: stringRequired,
  ignore_global_filter: numberOptional,
  label: stringOptionalNullable,
  line_width: numberOptionalOrEmptyString,
  metrics: schema.arrayOf(metricsItems),
  offset_time: stringOptionalNullable,
  override_index_pattern: numberOptional,
  point_size: numberOptionalOrEmptyString,
  separate_axis: numberIntegerOptional,
  seperate_axis: numberIntegerOptional,
  series_index_pattern: stringOptionalNullable,
  series_max_bars: numberIntegerOptional,
  series_time_field: fieldObject,
  series_interval: stringOptionalNullable,
  series_drop_last_bucket: numberIntegerOptional,
  split_color_mode: stringOptionalNullable,
  split_filters: schema.maybe(schema.arrayOf(splitFiltersItems)),
  split_mode: stringRequired,
  stacked: stringRequired,
  steps: numberIntegerOptional,
  terms_field: fieldObject,
  terms_order_by: stringOptionalNullable,
  terms_size: stringOptionalNullable,
  terms_direction: stringOptionalNullable,
  terms_include: stringOptionalNullable,
  terms_exclude: stringOptionalNullable,
  time_range_mode: stringOptionalNullable,
  trend_arrows: numberOptional,
  type: stringOptionalNullable,
  value_template: stringOptionalNullable,
  var_name: stringOptionalNullable,
});

export const panel = schema.object({
  annotations: schema.maybe(schema.arrayOf(annotationsItems)),
  axis_formatter: stringRequired,
  axis_position: stringRequired,
  axis_scale: stringRequired,
  axis_min: stringOrNumberOptionalNullable,
  axis_max: stringOrNumberOptionalNullable,
  bar_color_rules: schema.maybe(arrayNullable),
  background_color: stringOptionalNullable,
  background_color_rules: schema.maybe(schema.arrayOf(backgroundColorRulesItems)),
  default_index_pattern: stringOptionalNullable,
  default_timefield: stringOptionalNullable,
  drilldown_url: stringOptionalNullable,
  drop_last_bucket: numberIntegerOptional,
  filter: schema.nullable(
    schema.oneOf([
      stringOptionalNullable,
      schema.object({
        language: stringOptionalNullable,
        query: stringOptionalNullable,
      }),
    ])
  ),
  gauge_color_rules: schema.maybe(schema.arrayOf(gaugeColorRulesItems)),
  gauge_width: schema.nullable(schema.oneOf([stringOptionalNullable, numberOptional])),
  gauge_inner_color: stringOptionalNullable,
  gauge_inner_width: stringOrNumberOptionalNullable,
  gauge_style: stringOptionalNullable,
  gauge_max: stringOrNumberOptionalNullable,
  id: stringRequired,
  ignore_global_filters: numberOptional,
  ignore_global_filter: numberOptional,
  index_pattern: stringRequired,
  max_bars: numberIntegerOptional,
  interval: stringRequired,
  isModelInvalid: schema.maybe(schema.boolean()),
  legend_position: stringOptionalNullable,
  markdown: stringOptionalNullable,
  markdown_scrollbars: numberIntegerOptional,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  markdown_openLinksInNewTab: numberIntegerOptional,
  markdown_vertical_align: stringOptionalNullable,
  markdown_less: stringOptionalNullable,
  markdown_css: stringOptionalNullable,
  pivot_id: fieldObject,
  pivot_label: stringOptionalNullable,
  pivot_type: stringOptionalNullable,
  pivot_rows: stringOptionalNullable,
  series: schema.arrayOf(seriesItems),
  show_grid: numberIntegerRequired,
  show_legend: numberIntegerRequired,
  tooltip_mode: schema.maybe(
    schema.oneOf([schema.literal('show_all'), schema.literal('show_focused')])
  ),
  time_field: fieldObject,
  time_range_mode: stringOptionalNullable,
  type: schema.oneOf([
    schema.literal('table'),
    schema.literal('gauge'),
    schema.literal('markdown'),
    schema.literal('top_n'),
    schema.literal('timeseries'),
    schema.literal('metric'),
  ]),
});

export const visPayloadSchema = schema.object({
  filters: arrayNullable,
  panels: schema.arrayOf(panel),
  // general
  query: schema.nullable(schema.arrayOf(queryObject)),
  state: schema.object({
    sort: schema.maybe(
      schema.object({
        column: stringRequired,
        order: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
      })
    ),
  }),
  timerange: schema.object({
    timezone: stringRequired,
    min: stringRequired,
    max: stringRequired,
  }),

  searchSession: schema.maybe(
    schema.object({
      sessionId: schema.string(),
      isRestore: schema.boolean({ defaultValue: false }),
      isStored: schema.boolean({ defaultValue: false }),
    })
  ),
});
