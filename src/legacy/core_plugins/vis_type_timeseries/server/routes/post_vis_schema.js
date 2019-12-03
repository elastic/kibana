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
const stringOptional = Joi.string().allow('').optional();
const stringOptionalNullable = Joi.string().allow('', null).optional();
const stringRequired = Joi.string().allow('').required();
const arrayNullable = Joi.array().allow(null);
const numberIntegerOptional = Joi.number().integer().optional();
const numberIntegerRequired = Joi.number().integer().required();
const numberOptional = Joi.number().optional();
const numberRequired = Joi.number().required();
const queryObject = Joi.object({
  language: Joi.string().allow(''),
  query: Joi.string().allow(''),
});

export const visSchema = {
  filters: arrayNullable,
  panels: Joi.array()
    .items(Joi.object({
      annotations: Joi.array()
        .items(Joi.object({
          color: stringOptional,
          fields: stringOptional,
          icon: stringOptional,
          id: stringOptional,
          ignore_global_filters: numberIntegerOptional, // allow only 0 and 1
          ignore_panel_filters: numberIntegerOptional, // allow only 0 and 1
          index_pattern: stringOptional,
          query_string: queryObject.optional(),
          template: stringOptionalNullable,
          time_field: stringOptional,
        })).optional(),
      axis_formatter: stringRequired,
      axis_position: stringRequired,
      axis_scale: stringRequired,
      axis_min: numberOptional,
      axis_max: numberOptional,
      bar_color_rules: arrayNullable.optional(),
      background_color: stringOptional,
      background_color_rules: Joi.array().items(Joi.object({
        id: stringOptional,
      })).optional(),
      default_index_pattern: stringRequired,
      default_timefield: stringRequired,
      drilldown_url: stringOptional,
      drop_last_bucket: numberIntegerOptional,
      filter: stringOptional,
      // Gauge
      gauge_color_rules: Joi.array()
        .items(Joi.object({
          gauge: stringOptional,
          id: stringOptional,
          operator: stringOptional,
          value: Joi.number(),
        })
        ).optional(),
      gauge_width: numberOptional,
      gauge_inner_width: numberOptional,
      gauge_style: stringOptional,
      gauge_max: stringOptional,
      // general
      id: stringRequired,
      ignore_global_filters: numberOptional,
      index_pattern: stringRequired,
      interval: stringRequired,
      isModelInvalid: Joi.boolean().optional(),
      // unknown
      legend_position: stringOptional,
      markdown: stringOptional,
      markdown_scrollbars: numberIntegerOptional,
      markdown_openLinksInNewTab: numberIntegerOptional,
      markdown_vertical_align: stringOptional,
      markdown_less: stringOptional,
      // table ??
      pivot_id: stringOptional,
      pivot_label: stringOptional,
      // general
      series: Joi.array()
        .items(
          Joi.object({
            axis_position: stringRequired,
            chart_type: stringRequired,
            color: stringRequired,
            color_rules: Joi.array()
              .items(Joi.object({
                value: numberOptional,
                id: stringRequired,
                text: stringOptional,
                operator: stringOptional
              })).optional(),
            fill: numberOptional,
            filter: Joi.object({
              query: stringRequired,
              language: stringOptional,
            }).optional(),
            formatter: stringRequired,
            hidden: Joi.boolean().optional(),
            id: stringRequired,
            label: stringOptional,
            line_width: numberOptional,
            metrics: Joi.array()
              .items(
                Joi.object({
                  field: stringOptionalNullable,
                  id: stringRequired,
                  metric_agg: stringOptional,
                  numerator: stringOptional,
                  denominator: stringOptional,
                  sigma: stringOptional,
                  type: stringRequired,
                  values: Joi.array()
                    .items(Joi.string().allow('', null))
                    .allow(null)
                    .optional()
                })
              ),
            offset_time: stringOptional,
            override_index_pattern: numberOptional,
            point_size: numberRequired,
            separate_axis: numberIntegerOptional, // Timeseries, Gauge
            seperate_axis: numberIntegerOptional, // Table
            series_index_pattern: stringOptional,
            series_time_field: stringOptional,
            series_interval: stringOptionalNullable,
            series_drop_last_bucket: numberIntegerOptional,
            split_color_mode: stringOptionalNullable,
            split_filters: Joi.array()
              .items(Joi.object({
                id: stringOptionalNullable,
                color: stringOptionalNullable,
                filter: Joi.object({ queryObject }).optional()
              })).optional(),
            split_mode: stringRequired,
            stacked: stringRequired,
            terms_field: stringOptionalNullable,
            terms_order_by: stringOptionalNullable,
            terms_size: stringOptionalNullable,
            terms_direction: stringOptionalNullable,
            terms_include: stringOptionalNullable,
            terms_exclude: stringOptionalNullable,
            time_range_mode: stringOptionalNullable,
            trend_arrows: numberOptional,
            value_template: stringOptionalNullable,
            var_name: stringOptionalNullable
          }),
        ).required(),
      show_grid: numberIntegerRequired,
      show_legend: numberIntegerRequired,
      time_field: stringOptionalNullable,
      time_range_mode: stringOptionalNullable,
      type: stringRequired,
    })),
  // general
  query: Joi.array()
    .items(queryObject)
    .allow(null)
    .required(),
  state: Joi.object({}).required(),
  timerange: Joi.object({
    timezone: stringRequired,
    min: stringRequired,
    max: stringRequired
  }).required()
};


