/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildRequestBody } from './build_request_body';

const body = JSON.parse(`
{
    "filters": [
        {
           "query": {
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

describe('buildRequestBody(req)', () => {
  test('returns a valid body', async () => {
    const panel = body.panels[0];
    const series = panel.series[0];
    const getValidTimeInterval = jest.fn(() => '10s');
    const capabilities = {
      timezone: 'UTC',
      getValidTimeInterval,
    };
    const config = {
      allowLeadingWildcards: true,
      queryStringOptions: {},
    };
    const indexPattern = {};
    const doc = await buildRequestBody(
      { body },
      panel,
      series,
      config,
      indexPattern,
      capabilities,
      {
        get: async () => 50,
      },
      jest.fn().mockResolvedValue({
        timeField: '@timestamp',
      })
    );

    expect(doc).toEqual({
      size: 0,
      query: {
        bool: {
          filter: [
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
          ],
          must: [
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
            fixed_interval: '10s',
            min_doc_count: 0,
            time_zone: 'UTC',
          },
          meta: {
            intervalString: '10s',
            normalized: true,
            seriesId: 'c9b5f9c0-e403-11e6-be91-6f7688e9fac7',
            timeField: '@timestamp',
            panelId: 'c9b5d2b0-e403-11e6-be91-6f7688e9fac7',
          },
        },
      },
    });
  });
});
