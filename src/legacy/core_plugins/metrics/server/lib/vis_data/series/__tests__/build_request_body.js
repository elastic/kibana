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

const body = JSON.parse(`
{
    "filters": [
        {
            "bool": {
                "must": [
                    {
                        "query_string": {
                            "analyze_wildcard": true,
                            "query": "*"
                        }
                    }
                ],
                "must_not": []
            }
        }
    ],
    "panels": [
        {
            "axis_formatter": "number",
            "axis_position": "left",
            "id": "c9b5d2b0-e403-11e6-be91-6f7688e9fac7",
            "index_pattern": "*",
            "interval": "auto",
            "series": [
                {
                    "axis_position": "right",
                    "chart_type": "line",
                    "color": "rgba(250,40,255,1)",
                    "fill": 0,
                    "formatter": "number",
                    "id": "c9b5f9c0-e403-11e6-be91-6f7688e9fac7",
                    "line_width": 1,
                    "metrics": [
                        {
                            "id": "c9b5f9c1-e403-11e6-be91-6f7688e9fac7",
                            "type": "count"
                        }
                    ],
                    "point_size": 1,
                    "separate_axis": 0,
                    "split_mode": "everything",
                    "stacked": 0
                }
            ],
            "show_legend": 1,
            "time_field": "@timestamp",
            "type": "timeseries"
        }
    ],
    "timerange": {
        "timezone": "UTC",
        "max": "2017-01-26T20:52:35.881Z",
        "min": "2017-01-26T20:37:35.881Z"
    }
}
`);

import sinon from 'sinon';
import { expect } from 'chai';
import { buildRequestBody } from '../build_request_body';

describe('buildRequestBody(req)', () => {
  it('returns a valid body', () => {
    const panel = body.panels[0];
    const series = panel.series[0];
    const getValidTimeInterval = sinon.spy(() => '10s');
    const capabilities = {
      searchTimezone: 'UTC',
      getValidTimeInterval,
    };
    const config = {
      allowLeadingWildcards: true,
      queryStringOptions: {},
    };
    const indexPatternObject = {};
    const doc = buildRequestBody(
      { payload: body },
      panel,
      series,
      config,
      indexPatternObject,
      capabilities
    );

    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          filter: [],
          must: [
            {
              bool: {
                must: [
                  {
                    query_string: {
                      analyze_wildcard: true,
                      query: '*',
                    },
                  },
                ],
                must_not: [],
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: '2017-01-26T20:37:35.881Z',
                  lte: '2017-01-26T20:52:35.881Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
      aggs: {
        timeseries: {
          aggs: {
            'c9b5f9c1-e403-11e6-be91-6f7688e9fac7': {
              bucket_script: {
                buckets_path: {
                  count: '_count',
                },
                gap_policy: 'skip',
                script: {
                  lang: 'expression',
                  source: 'count * 1',
                },
              },
            },
          },
          date_histogram: {
            extended_bounds: {
              max: 1485463955881,
              min: 1485463055881,
            },
            field: '@timestamp',
            interval: '10s',
            min_doc_count: 0,
            time_zone: 'UTC',
          },
          meta: {
            bucketSize: 10,
            intervalString: '10s',
            seriesId: 'c9b5f9c0-e403-11e6-be91-6f7688e9fac7',
            timeField: '@timestamp',
          },
        },
      },
    });
  });
});
