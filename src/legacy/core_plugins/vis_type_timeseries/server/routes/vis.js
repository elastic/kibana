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

import { getVisData } from '../lib/get_vis_data';
import Boom from 'boom';
import Joi from 'joi';

// The request payload validation could use additional work on default values, allowed values, required vs optional etc.
const requestPayload = {
  payload: Joi.object({
    filters: Joi.array().allow(null),
    panels: Joi.array().items(Joi.object({
      annotations: Joi.array().items(Joi.object({
        color: Joi.string(),
        fields: Joi.string(),
        icon: Joi.string(),
        id: Joi.string(),
        ignore_global_filters: Joi.number().integer(), // allow only 0 and 1
        ignore_panel_filters: Joi.number().integer(), // allow only 0 and 1
        index_pattern: Joi.string(),
        query_string: Joi.object({
          language: Joi.string().allow(''),
          query: Joi.string().allow(''),
        }),
        template: Joi.string().allow(null, ''),
        time_field: Joi.string(),
      })),
      axis_formatter: Joi.string(),
      axis_position: Joi.string(),
      axis_scale: Joi.string(),
      axis_min: Joi.number(),
      axis_max: Joi.number(),
      bar_color_rules: Joi.array().allow(null),
      background_color: Joi.string().optional(),
      background_color_rules: Joi.array().items(Joi.object({
        id: Joi.string(),
      })),
      default_index_pattern: Joi.string(),
      default_timefield: Joi.string(),
      drilldown_url: Joi.string().allow(''),
      drop_last_bucket: Joi.number().integer(),
      filter: Joi.any(),
      // Gauge
      gauge_color_rules: Joi.array().items(
        Joi.object({
          gauge: Joi.string(),
          id: Joi.string(),
          operator: Joi.string(),
          value: Joi.number(),
        })
      ),
      gauge_width: Joi.any(),
      gauge_inner_width: Joi.any(),
      gauge_style: Joi.any(),
      gauge_max: Joi.any(),
      // general
      id: Joi.string(),
      ignore_global_filters: Joi.number(),
      index_pattern: Joi.string().optional(),
      interval: Joi.string(),
      isModelInvalid: Joi.boolean(),
      // unknown
      legend_position: Joi.string(),
      // table ??
      pivot_id: Joi.string(),
      pivot_label: Joi.string(),
      // general
      series: Joi.array()
        .items(
          Joi.object({
            axis_position: Joi.string(),
            chart_type: Joi.string(),
            color: Joi.string(),
            color_rules: Joi.array(),
            fill: Joi.number(),
            filter: Joi.object({
              query: Joi.string().allow(''),
              language: Joi.string(),
            }),
            formatter: Joi.string(),
            hidden: Joi.boolean().optional(),
            id: Joi.string(),
            label: Joi.string().allow('', null),
            line_width: Joi.number(),
            metrics: Joi.array()
              .items(
                Joi.object({
                  field: Joi.string().allow(null),
                  id: Joi.string(),
                  metric_agg: Joi.string(),
                  numerator: Joi.string(),
                  sigma: Joi.string().allow(''),
                  type: Joi.string(),
                })
              ),
            offset_time: Joi.string().allow(''),
            override_index_pattern: Joi.number().optional(),
            point_size: Joi.number(),
            separate_axis: Joi.number().integer(), // Timeseries, Gauge
            seperate_axis: Joi.number().integer(), // Table
            series_index_pattern: Joi.string().allow(''),
            series_time_field: Joi.string().allow(''),
            series_interval: Joi.string(),
            series_drop_last_bucket: Joi.number().integer(),
            split_color_mode: Joi.string(),
            split_filters: Joi.array().items(Joi.object({
              id: Joi.string().allow('', null),
              color: Joi.string(),
              filter: Joi.object({
                language: Joi.string(),
                query: Joi.string().allow('')
              })
            })),
            split_mode: Joi.string(),
            stacked: Joi.string(),
            terms_field: Joi.string(),
            terms_order_by: Joi.string(),
            terms_size: Joi.string(),
            terms_direction: Joi.string(),
            time_range_mode: Joi.string().allow(null),
            trend_arrows: Joi.number(),
            value_template: Joi.string().allow(''),
          }),
        ),
      show_grid: Joi.number().integer(),
      show_legend: Joi.number().integer(),
      time_field: Joi.string().allow(null),
      time_range_mode: Joi.string().optional(),
      type: Joi.string().required(),
    })),
    // general
    query: Joi.array().items(
      Joi.object({
        language: Joi.string(),
        query: Joi.string().allow('')
      })
    ).allow(null),
    state: Joi.object({}),
    timerange: Joi.object({
      timezone: Joi.string(),
      min: Joi.string(),
      max: Joi.string()
    })
  })
};
export const visDataRoutes = server => {
  server.route({
    path: '/api/metrics/vis/data',
    method: 'POST',
    options: {
      validate: requestPayload,
    },
    handler: async req => {
      try {
        return await getVisData(req);
      } catch (err) {
        if (err.isBoom && err.status === 401) {
          return err;
        }

        throw Boom.boomify(err, { statusCode: 500 });
      }
    },
  });
};
