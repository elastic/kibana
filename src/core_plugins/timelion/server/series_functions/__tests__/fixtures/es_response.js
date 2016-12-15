/* eslint-disable quotes */

/*
 Really didn't want to do this, but testing the agg flatten logic
 in units isn't really possible since the functions depend on each other

 You ValueBn test each function, but at the end you really have to check the
 output of the entire thing.
*/

module.exports = {
  _shards: {
    total: 1
  },
  aggregations: {
    q: {
      meta: { type: 'split' },
      buckets: {
        QueryA: {
          FieldA: {
            meta: { type: 'split' },
            buckets: [
              {
                key: 'ValueA',
                FieldB: {
                  meta: { type: 'split' },
                  buckets: [
                    {
                      key: 'Value2A',
                      time_buckets: {
                        meta: { type: 'time_buckets' },
                        buckets: [
                          {
                            key: 1000,
                            MetricA: { value: 264 },
                            MetricB: { value: 398 }
                          },
                          {
                            key: 2000,
                            MetricA: { value: 264 },
                            MetricB: { value: 1124 }
                          }
                        ]
                      }
                    },
                    {
                      key: 'Value2B',
                      time_buckets: {
                        meta: { type: 'time_buckets' },
                        buckets: [
                          {
                            key: 1000,
                            MetricA: { value: 699 },
                            MetricB: { value: 457 }
                          },
                          {
                            key: 2000,
                            MetricA: { value: 110 },
                            MetricB: { value: 506 }
                          }
                        ]
                      }
                    }
                  ]
                }
              },
              {
                key: 'ValueB',
                FieldB: {
                  meta: { type: 'split' },
                  buckets: [
                    {
                      key: 'Value2B',
                      time_buckets: {
                        meta: { type: 'time_buckets' },
                        buckets: [
                          {
                            key: 1000,
                            MetricA: { value: 152 },
                            MetricB: { value: 61 }
                          },
                          {
                            key: 2000,
                            MetricA: { value: 518 },
                            MetricB: { value: 77 }
                          }
                        ]
                      }
                    },
                    {
                      key: 'Value2A',
                      time_buckets: {
                        meta: { type: 'time_buckets' },
                        buckets: [
                          {
                            key: 1000,
                            MetricA: { value: 114 },
                            MetricB: { value: 23 }
                          },
                          {
                            key: 2000,
                            MetricA: { value: 264 },
                            MetricB: { value: 45 }
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        QueryB: {
          FieldA: {
            meta: { type: 'split' },
            buckets: [
              {
                key: 'ValueA',
                FieldB: {
                  meta: { type: 'split' },
                  buckets: [
                    {
                      key: 'Value2B',
                      time_buckets: {
                        meta: { type: 'time_buckets' },
                        buckets: [
                          {
                            key: 1000,
                            MetricA: { value: 621 },
                            MetricB: { value: 12 }
                          },
                          {
                            key: 2000,
                            MetricA: { value: 751 },
                            MetricB: { value: 12 }
                          }
                        ]
                      }
                    },
                    {
                      key: 'Value2A',
                      time_buckets: {
                        meta: { type: 'time_buckets' },
                        buckets: [
                          {
                            key: 1000,
                            MetricA: { value: 110 },
                            MetricB: { value: 11 }
                          },
                          {
                            key: 2000,
                            MetricA: { value: 648 },
                            MetricB: { value: 12 }
                          }
                        ]
                      }
                    }
                  ]
                }
              },
              {
                key: 'ValueC',
                FieldB: {
                  meta: { type: 'split' },
                  buckets: [
                    {
                      key: 'Value2C',
                      time_buckets: {
                        meta: { type: 'time_buckets' },
                        buckets: [
                          {
                            key: 1000,
                            MetricA: { value: 755 },
                            MetricB: { value: 10 }
                          },
                          {
                            key: 2000,
                            MetricA: { value: 713 },
                            MetricB: { value: 18 }
                          }
                        ]
                      }
                    },
                    {
                      key: 'Value2A',
                      time_buckets: {
                        meta: { type: 'time_buckets' },
                        buckets: [
                          {
                            key: 1000,
                            MetricA: { value: 391 },
                            MetricB: { value: 4 }
                          },
                          {
                            key: 2000,
                            MetricA: { value: 802 },
                            MetricB: { value: 4 }
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    }
  }
};
