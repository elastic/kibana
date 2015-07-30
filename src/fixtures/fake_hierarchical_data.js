define(function (require) {
  var data = {  };

  data.metricOnly = {
    hits: { total: 1000, hits: [], max_score: 0 },
    aggregations: {
      agg_1: { value: 412032 },
    }
  };

  data.threeTermBuckets = {
    hits: { total: 1000, hits: [], max_score: 0 },
    aggregations: {
      agg_2: {
        buckets: [
          {
            key: 'png',
            doc_count: 50,
            agg_1: { value: 412032 },
            agg_3: {
              buckets: [
                {
                  key: 'IT',
                  doc_count: 10,
                  agg_1: { value: 9299 },
                  agg_4: {
                    buckets: [
                      { key: 'win', doc_count: 4, agg_1: { value: 0 } },
                      { key: 'mac', doc_count: 6, agg_1: { value: 9299 } }
                    ]
                  }
                },
                {
                  key: 'US',
                  doc_count: 20,
                  agg_1: { value: 8293 },
                  agg_4: {
                    buckets: [
                      { key: 'linux', doc_count: 12, agg_1: { value: 3992 } },
                      { key: 'mac', doc_count: 8, agg_1: { value: 3029 } }
                    ]
                  }
                }
              ]
            }
          },
          {
            key: 'css',
            doc_count: 20,
            agg_1: { value: 412032 },
            agg_3: {
              buckets: [
                {
                  key: 'MX',
                  doc_count: 7,
                  agg_1: { value: 9299 },
                  agg_4: {
                    buckets: [
                      { key: 'win', doc_count: 3, agg_1: { value: 4992 } },
                      { key: 'mac', doc_count: 4, agg_1: { value: 5892 } }
                    ]
                  }
                },
                {
                  key: 'US',
                  doc_count: 13,
                  agg_1: { value: 8293 },
                  agg_4: {
                    buckets: [
                      { key: 'linux', doc_count: 12, agg_1: { value: 3992 } },
                      { key: 'mac', doc_count: 1, agg_1: { value: 3029 } }
                    ]
                  }
                }
              ]
            }
          },
          {
            key: 'html',
            doc_count: 90,
            agg_1: { value: 412032 },
            agg_3: {
              buckets: [
                {
                  key: 'CN',
                  doc_count: 85,
                  agg_1: { value: 9299 },
                  agg_4: {
                    buckets: [
                      { key: 'win', doc_count: 46, agg_1: { value: 4992 } },
                      { key: 'mac', doc_count: 39, agg_1: { value: 5892 } }
                    ]
                  }
                },
                {
                  key: 'FR',
                  doc_count: 15,
                  agg_1: { value: 8293 },
                  agg_4: {
                    buckets: [
                      { key: 'win', doc_count: 3, agg_1: { value: 3992 } },
                      { key: 'mac', doc_count: 12, agg_1: { value: 3029 } }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  };

  data.oneRangeBucket = {
    'took': 35,
    'timed_out': false,
    '_shards': {
      'total': 1,
      'successful': 1,
      'failed': 0
    },
    'hits': {
      'total': 6039,
      'max_score': 0,
      'hits': []
    },
    'aggregations': {
      'agg_2': {
        'buckets': {
          '0.0-1000.0': {
            'from': 0,
            'from_as_string': '0.0',
            'to': 1000,
            'to_as_string': '1000.0',
            'doc_count': 606
          },
          '1000.0-2000.0': {
            'from': 1000,
            'from_as_string': '1000.0',
            'to': 2000,
            'to_as_string': '2000.0',
            'doc_count': 298
          }
        }
      }
    }
  };

  data.oneFilterBucket = {
    'took': 11,
    'timed_out': false,
    '_shards': {
      'total': 1,
      'successful': 1,
      'failed': 0
    },
    'hits': {
      'total': 6005,
      'max_score': 0,
      'hits': []
    },
    'aggregations': {
      'agg_2': {
        'buckets': {
          '_type:apache': {
            'doc_count': 4844
          },
          '_type:nginx': {
            'doc_count': 1161
          }
        }
      }
    }
  };

  data.oneHistogramBucket = {
    'took': 37,
    'timed_out': false,
    '_shards': {
      'total': 6,
      'successful': 6,
      'failed': 0
    },
    'hits': {
      'total': 49208,
      'max_score': 0,
      'hits': []
    },
    'aggregations': {
      'agg_2': {
        'buckets': [
          {
            'key_as_string': '2014-09-28T00:00:00.000Z',
            'key': 1411862400000,
            'doc_count': 8247
          },
          {
            'key_as_string': '2014-09-29T00:00:00.000Z',
            'key': 1411948800000,
            'doc_count': 8184
          },
          {
            'key_as_string': '2014-09-30T00:00:00.000Z',
            'key': 1412035200000,
            'doc_count': 8269
          },
          {
            'key_as_string': '2014-10-01T00:00:00.000Z',
            'key': 1412121600000,
            'doc_count': 8141
          },
          {
            'key_as_string': '2014-10-02T00:00:00.000Z',
            'key': 1412208000000,
            'doc_count': 8148
          },
          {
            'key_as_string': '2014-10-03T00:00:00.000Z',
            'key': 1412294400000,
            'doc_count': 8219
          }
        ]
      }
    }
  };

  return data;
});
