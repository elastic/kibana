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

import _ from 'lodash';

export function validateEsRoute(server) {
  server.route({
    method: 'GET',
    path: '/api/timelion/validate/es',
    handler: async function(request) {
      const uiSettings = await request.getUiSettingsService().getAll();

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

      const timefield = uiSettings['timelion:es.timefield'];

      const body = {
        index: uiSettings['es.default_index'],
        body: {
          aggs: {
            maxAgg: {
              max: {
                field: timefield,
              },
            },
            minAgg: {
              min: {
                field: timefield,
              },
            },
          },
          size: 0,
        },
      };

      let resp = {};
      try {
        resp = await callWithRequest(request, 'search', body);
      } catch (errResp) {
        resp = errResp;
      }

      if (_.has(resp, 'aggregations.maxAgg.value') && _.has(resp, 'aggregations.minAgg.value')) {
        return {
          ok: true,
          field: timefield,
          min: _.get(resp, 'aggregations.minAgg.value'),
          max: _.get(resp, 'aggregations.maxAgg.value'),
        };
      }

      return {
        ok: false,
        resp: resp,
      };
    },
  });
}
