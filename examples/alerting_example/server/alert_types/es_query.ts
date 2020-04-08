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

import { AlertType } from '../../../../x-pack/plugins/alerting/server';
import { IEsSearchResponse } from '../../../../src/plugins/data/common';

export const alertType: AlertType = {
  id: 'example.es-query',
  name: 'ES Query',
  actionGroups: [{ id: 'default', name: 'default' }],
  defaultActionGroupId: 'default',
  async executor({ services, params, state: { totalLastRun } }) {
    const { strategy = EXAMPLE.serverStrategy, searchRequest = EXAMPLE } = params;

    const res = (await services.search(searchRequest, {}, strategy)) as IEsSearchResponse;
    const {
      rawResponse: { hits: { total = 0, hits = [] } = {} },
    } = res;

    hits.map(hit => {
      services
        .alertInstanceFactory(hit._id)
        .replaceState(hit)
        .scheduleActions('default');
    });

    return {
      totalLastRun: total,
    };
  },
};

const EXAMPLE = {
  params: {
    ignoreThrottled: true,
    preference: 1586335820660,
    index: 'kibana_sample_data_logs',
    body: {
      version: true,
      size: 500,
      sort: [
        {
          timestamp: {
            order: 'desc',
            unmapped_type: 'boolean',
          },
        },
      ],
      aggs: {
        '2': {
          date_histogram: {
            field: 'timestamp',
            fixed_interval: '30s',
            time_zone: 'Europe/London',
            min_doc_count: 1,
          },
        },
      },
      stored_fields: ['*'],
      script_fields: {
        hour_of_day: {
          script: {
            source: "doc['timestamp'].value.getHour()",
            lang: 'painless',
          },
        },
      },
      docvalue_fields: [
        {
          field: '@timestamp',
          format: 'date_time',
        },
        {
          field: 'timestamp',
          format: 'date_time',
        },
        {
          field: 'utc_time',
          format: 'date_time',
        },
      ],
      _source: {
        excludes: [],
      },
      query: {
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      should: [
                        {
                          match_phrase: {
                            'geo.dest': 'CN',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [
                        {
                          exists: {
                            field: 'host',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              range: {
                timestamp: {
                  gte: '2020-04-08T10:33:22.033Z',
                  lte: '2020-04-08T10:48:22.033Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
          should: [],
          must_not: [
            {
              match_phrase: {
                agent: 'gidi',
              },
            },
          ],
        },
      },
      highlight: {
        pre_tags: ['@kibana-highlighted-field@'],
        post_tags: ['@/kibana-highlighted-field@'],
        fields: {
          '*': {},
        },
        fragment_size: 2147483647,
      },
    },
    rest_total_hits_as_int: true,
    ignore_unavailable: true,
    ignore_throttled: true,
    timeout: '30000ms',
  },
  serverStrategy: 'es',
  debug: true,
};
