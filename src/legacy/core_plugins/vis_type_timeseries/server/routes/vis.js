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
      bar_color_rules: Joi.array().allow(null),
      background_color_rules: Joi.object({
        id: Joi.string(),
      }),
      default_index_pattern: Joi.string(),
      default_timefield: Joi.string(),
      drilldown_url: Joi.string().allow(''),
      drop_last_bucket: Joi.number().integer(),
      id: Joi.string(),
      index_pattern: Joi.string().optional(),
      interval: Joi.string(),
      isModelInvalid: Joi.boolean(),
      legend_position: Joi.string(),
      pivot_id: Joi.string(),
      pivot_label: Joi.string(),
      series: Joi.array()
        .items(
          Joi.object({
            axis_position: Joi.string(),
            chart_type: Joi.string(),
            color: Joi.string(),
            color_rules: Joi.array(),
            fill: Joi.number(),
            formatter: Joi.string(),
            id: Joi.string(),
            label: Joi.string().allow('', null),
            line_width: Joi.number(),
            metrics: Joi.array()
              .items(
                Joi.object({
                  id: Joi.string(),
                  numerator: Joi.string(),
                  type: Joi.string(),
                  field: Joi.string(),
                  sigma: Joi.string().allow('')
                })
              ),
            point_size: Joi.number(),
            separate_axis: Joi.number().integer(),
            seperate_axis: Joi.number().integer(),
            split_mode: Joi.string(),
            stacked: Joi.string(),
            terms_field: Joi.string(),
            terms_order_by: Joi.string(),
            split_color_mode: Joi.string(),
            offset_time: Joi.string().allow(''),
            value_template: Joi.string().allow(''),
            trend_arrows: Joi.number(),
          }),
        ),
      show_grid: Joi.number().integer(),
      show_legend: Joi.number().integer(),
      time_field: Joi.string(),
      type: Joi.string(),
    })),
    query: Joi.array().allow(null),
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
