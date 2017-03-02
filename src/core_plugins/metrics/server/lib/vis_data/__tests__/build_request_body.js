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
                    "seperate_axis": 0,
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
        "max": "2017-01-26T20:52:35.881Z",
        "min": "2017-01-26T20:37:35.881Z"
    }
}
`);

import buildRequestBody from '../build_request_body';
import { expect } from 'chai';

describe('buildRequestBody(req)', () => {
  it('returns a valid body', () => {
    const panel = body.panels[0];
    const series = panel.series[0];
    const doc = buildRequestBody({ payload: body }, panel, series);
    expect(doc).to.eql({
      'size': 0,
      'query': {
        'bool': {
          'must': [
            {
              'range': {
                '@timestamp': {
                  'gte': 1485463055881,
                  'lte': 1485463945881,
                  'format': 'epoch_millis'
                }
              }
            },
            {
              'bool': {
                'must': [
                  {
                    'query_string': {
                      'analyze_wildcard': true,
                      'query': '*'
                    }
                  }
                ],
                'must_not': []
              }
            }
          ]
        }
      },
      'aggs': {
        'c9b5f9c0-e403-11e6-be91-6f7688e9fac7': {
          'filter': {
            'match_all': {}
          },
          'aggs': {
            'timeseries': {
              'date_histogram': {
                'field': '@timestamp',
                'interval': '10s',
                'min_doc_count': 0,
                'extended_bounds': {
                  'min': 1485463055881,
                  'max': 1485463945881
                }
              },
              'aggs': {
                'c9b5f9c1-e403-11e6-be91-6f7688e9fac7': {
                  'bucket_script': {
                    'buckets_path': {
                      'count': '_count'
                    },
                    'script': {
                      'inline': 'count * 1',
                      'lang': 'expression'
                    },
                    'gap_policy': 'skip'
                  }
                }
              }
            }
          }
        }
      }
    });
  });
});

