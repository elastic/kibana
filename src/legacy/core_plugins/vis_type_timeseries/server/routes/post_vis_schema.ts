/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Joi from 'joi';
const stringOptionalNullable = Joi.string()
  .allow('', null)
  .optional();
const stringRequired = Joi.string()
  .allow('')
  .required();
const arrayNullable = Joi.array().allow(null);
const numberIntegerOptional = Joi.number()
  .integer()
  .optional();
const numberIntegerRequired = Joi.number()
  .integer()
  .required();
const numberOptional = Joi.number().optional();
const numberRequired = Joi.number().required();
const queryObject = Joi.object({
  language: Joi.string().allow(''),
  query: Joi.string().allow(''),
});

const annotationsItems = Joi.object({
  color: stringOptionalNullable,
  fields: stringOptionalNullable,
  hidden: Joi.boolean().optional(),
  icon: stringOptionalNullable,
  id: stringOptionalNullable,
  ignore_global_filters: numberIntegerOptional,
  ignore_panel_filters: numberIntegerOptional,
  index_pattern: stringOptionalNullable,
  query_string: queryObject.optional(),
  template: stringOptionalNullable,
  time_field: stringOptionalNullable,
});

const backgroundColorRulesItems = Joi.object({
  value: Joi.number()
    .allow(null)
    .optional(),
  id: stringOptionalNullable,
  background_color: stringOptionalNullable,
  color: stringOptionalNullable,
});

const gaugeColorRulesItems = Joi.object({
  gauge: stringOptionalNullable,
  id: stringOptionalNullable,
  operator: stringOptionalNullable,
  value: Joi.number(),
});
const metricsItems = Joi.object({
  field: stringOptionalNullable,
  id: stringRequired,
  metric_agg: stringOptionalNullable,
  numerator: stringOptionalNullable,
  denominator: stringOptionalNullable,
  sigma: stringOptionalNullable,
  function: stringOptionalNullable,
  script: stringOptionalNullable,
  variables: Joi.array()
    .items(
      Joi.object({
        field: stringOptionalNullable,
        id: stringRequired,
        name: stringOptionalNullable,
      })
    )
    .optional(),
  type: stringRequired,
  value: stringOptionalNullable,
  values: Joi.array()
    .items(Joi.string().allow('', null))
    .allow(null)
    .optional(),
});

const splitFiltersItems = Joi.object({
  id: stringOptionalNullable,
  color: stringOptionalNullable,
  filter: Joi.object({
    language: Joi.string().allow(''),
    query: Joi.string().allow(''),
  }).optional(),
  label: stringOptionalNullable,
});

const seriesItems = Joi.object({
  aggregate_by: stringOptionalNullable,
  aggregate_function: stringOptionalNullable,
  axis_position: stringRequired,
  axis_max: stringOptionalNullable,
  axis_min: stringOptionalNullable,
  chart_type: stringRequired,
  color: stringRequired,
  color_rules: Joi.array()
    .items(
      Joi.object({
        value: numberOptional,
        id: stringRequired,
        text: stringOptionalNullable,
        operator: stringOptionalNullable,
      })
    )
    .optional(),
  fill: numberOptional,
  filter: Joi.object({
    query: stringRequired,
    language: stringOptionalNullable,
  }).optional(),
  formatter: stringRequired,
  hide_in_legend: numberIntegerOptional,
  hidden: Joi.boolean().optional(),
  id: stringRequired,
  label: stringOptionalNullable,
  line_width: numberOptional,
  metrics: Joi.array().items(metricsItems),
  offset_time: stringOptionalNullable,
  override_index_pattern: numberOptional,
  point_size: numberRequired,
  separate_axis: numberIntegerOptional,
  seperate_axis: numberIntegerOptional,
  series_index_pattern: stringOptionalNullable,
  series_time_field: stringOptionalNullable,
  series_interval: stringOptionalNullable,
  series_drop_last_bucket: numberIntegerOptional,
  split_color_mode: stringOptionalNullable,
  split_filters: Joi.array()
    .items(splitFiltersItems)
    .optional(),
  split_mode: stringRequired,
  stacked: stringRequired,
  steps: numberIntegerOptional,
  terms_field: stringOptionalNullable,
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

export const visPayloadSchema = Joi.object({
  filters: arrayNullable,
  panels: Joi.array().items(
    Joi.object({
      annotations: Joi.array()
        .items(annotationsItems)
        .optional(),
      axis_formatter: stringRequired,
      axis_position: stringRequired,
      axis_scale: stringRequired,
      axis_min: stringOptionalNullable,
      axis_max: stringOptionalNullable,
      bar_color_rules: arrayNullable.optional(),
      background_color: stringOptionalNullable,
      background_color_rules: Joi.array()
        .items(backgroundColorRulesItems)
        .optional(),
      default_index_pattern: stringOptionalNullable,
      default_timefield: stringOptionalNullable,
      drilldown_url: stringOptionalNullable,
      drop_last_bucket: numberIntegerOptional,
      filter: Joi.alternatives(
        stringOptionalNullable,
        Joi.object({
          language: stringOptionalNullable,
          query: stringOptionalNullable,
        })
      ),
      gauge_color_rules: Joi.array()
        .items(gaugeColorRulesItems)
        .optional(),
      gauge_width: [stringOptionalNullable, numberOptional],
      gauge_inner_color: stringOptionalNullable,
      gauge_inner_width: Joi.alternatives(stringOptionalNullable, numberIntegerOptional),
      gauge_style: stringOptionalNullable,
      gauge_max: stringOptionalNullable,
      id: stringRequired,
      ignore_global_filters: numberOptional,
      ignore_global_filter: numberOptional,
      index_pattern: stringRequired,
      interval: stringRequired,
      isModelInvalid: Joi.boolean().optional(),
      legend_position: stringOptionalNullable,
      markdown: stringOptionalNullable,
      markdown_scrollbars: numberIntegerOptional,
      markdown_openLinksInNewTab: numberIntegerOptional,
      markdown_vertical_align: stringOptionalNullable,
      markdown_less: stringOptionalNullable,
      markdown_css: stringOptionalNullable,
      pivot_id: stringOptionalNullable,
      pivot_label: stringOptionalNullable,
      pivot_type: stringOptionalNullable,
      pivot_rows: stringOptionalNullable,
      series: Joi.array()
        .items(seriesItems)
        .required(),
      show_grid: numberIntegerRequired,
      show_legend: numberIntegerRequired,
      time_field: stringOptionalNullable,
      time_range_mode: stringOptionalNullable,
      type: stringRequired,
    })
  ),
  // general
  query: Joi.array()
    .items(queryObject)
    .allow(null)
    .required(),
  state: Joi.object({
    sort: Joi.object({
      column: stringRequired,
      order: Joi.string()
        .valid(['asc', 'desc'])
        .required(),
    }).optional(),
  }).required(),
  timerange: Joi.object({
    timezone: stringRequired,
    min: stringRequired,
    max: stringRequired,
  }).required(),
});
