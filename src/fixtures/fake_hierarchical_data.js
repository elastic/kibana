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

const data = {};

data.metricOnly = {
  hits: { total: 1000, hits: [], max_score: 0 },
  aggregations: {
    agg_1: { value: 412032 },
  },
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
                    { key: 'mac', doc_count: 6, agg_1: { value: 9299 } },
                  ],
                },
              },
              {
                key: 'US',
                doc_count: 20,
                agg_1: { value: 8293 },
                agg_4: {
                  buckets: [
                    { key: 'linux', doc_count: 12, agg_1: { value: 3992 } },
                    { key: 'mac', doc_count: 8, agg_1: { value: 3029 } },
                  ],
                },
              },
            ],
          },
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
                    { key: 'mac', doc_count: 4, agg_1: { value: 5892 } },
                  ],
                },
              },
              {
                key: 'US',
                doc_count: 13,
                agg_1: { value: 8293 },
                agg_4: {
                  buckets: [
                    { key: 'linux', doc_count: 12, agg_1: { value: 3992 } },
                    { key: 'mac', doc_count: 1, agg_1: { value: 3029 } },
                  ],
                },
              },
            ],
          },
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
                    { key: 'mac', doc_count: 39, agg_1: { value: 5892 } },
                  ],
                },
              },
              {
                key: 'FR',
                doc_count: 15,
                agg_1: { value: 8293 },
                agg_4: {
                  buckets: [
                    { key: 'win', doc_count: 3, agg_1: { value: 3992 } },
                    { key: 'mac', doc_count: 12, agg_1: { value: 3029 } },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
};

data.oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative = {
  hits: { total: 1000, hits: [], max_score: 0 },
  aggregations: {
    agg_3: {
      buckets: [
        {
          key: 'png',
          doc_count: 50,
          agg_4: {
            buckets: [
              {
                key_as_string: '2014-09-28T00:00:00.000Z',
                key: 1411862400000,
                doc_count: 1,
                agg_1: { value: 9283 },
                agg_2: { value: 1411862400000 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 23,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-29T00:00:00.000Z',
                key: 1411948800000,
                doc_count: 2,
                agg_1: { value: 28349 },
                agg_2: { value: 1411948800000 },
                agg_5: { value: 203 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 39,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-30T00:00:00.000Z',
                key: 1412035200000,
                doc_count: 3,
                agg_1: { value: 84330 },
                agg_2: { value: 1412035200000 },
                agg_5: { value: 200 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 329,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-01T00:00:00.000Z',
                key: 1412121600000,
                doc_count: 4,
                agg_1: { value: 34992 },
                agg_2: { value: 1412121600000 },
                agg_5: { value: 103 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 22,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-02T00:00:00.000Z',
                key: 1412208000000,
                doc_count: 5,
                agg_1: { value: 145432 },
                agg_2: { value: 1412208000000 },
                agg_5: { value: 153 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 93,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-03T00:00:00.000Z',
                key: 1412294400000,
                doc_count: 35,
                agg_1: { value: 220943 },
                agg_2: { value: 1412294400000 },
                agg_5: { value: 239 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 72,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
        {
          key: 'css',
          doc_count: 20,
          agg_4: {
            buckets: [
              {
                key_as_string: '2014-09-28T00:00:00.000Z',
                key: 1411862400000,
                doc_count: 1,
                agg_1: { value: 9283 },
                agg_2: { value: 1411862400000 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 75,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-29T00:00:00.000Z',
                key: 1411948800000,
                doc_count: 2,
                agg_1: { value: 28349 },
                agg_2: { value: 1411948800000 },
                agg_5: { value: 10 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 11,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-30T00:00:00.000Z',
                key: 1412035200000,
                doc_count: 3,
                agg_1: { value: 84330 },
                agg_2: { value: 1412035200000 },
                agg_5: { value: 24 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 238,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-01T00:00:00.000Z',
                key: 1412121600000,
                doc_count: 4,
                agg_1: { value: 34992 },
                agg_2: { value: 1412121600000 },
                agg_5: { value: 49 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 343,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-02T00:00:00.000Z',
                key: 1412208000000,
                doc_count: 5,
                agg_1: { value: 145432 },
                agg_2: { value: 1412208000000 },
                agg_5: { value: 100 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 837,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-03T00:00:00.000Z',
                key: 1412294400000,
                doc_count: 5,
                agg_1: { value: 220943 },
                agg_2: { value: 1412294400000 },
                agg_5: { value: 23 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 302,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
        {
          key: 'html',
          doc_count: 90,
          agg_4: {
            buckets: [
              {
                key_as_string: '2014-09-28T00:00:00.000Z',
                key: 1411862400000,
                doc_count: 10,
                agg_1: { value: 9283 },
                agg_2: { value: 1411862400000 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 30,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-29T00:00:00.000Z',
                key: 1411948800000,
                doc_count: 20,
                agg_1: { value: 28349 },
                agg_2: { value: 1411948800000 },
                agg_5: { value: 1 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 43,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-30T00:00:00.000Z',
                key: 1412035200000,
                doc_count: 30,
                agg_1: { value: 84330 },
                agg_2: { value: 1412035200000 },
                agg_5: { value: 5 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 88,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-01T00:00:00.000Z',
                key: 1412121600000,
                doc_count: 11,
                agg_1: { value: 34992 },
                agg_2: { value: 1412121600000 },
                agg_5: { value: 10 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 91,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-02T00:00:00.000Z',
                key: 1412208000000,
                doc_count: 12,
                agg_1: { value: 145432 },
                agg_2: { value: 1412208000000 },
                agg_5: { value: 43 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 534,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-03T00:00:00.000Z',
                key: 1412294400000,
                doc_count: 7,
                agg_1: { value: 220943 },
                agg_2: { value: 1412294400000 },
                agg_5: { value: 1 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 553,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

data.oneRangeBucket = {
  took: 35,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    failed: 0,
  },
  hits: {
    total: 6039,
    max_score: 0,
    hits: [],
  },
  aggregations: {
    agg_2: {
      buckets: {
        '0.0-1000.0': {
          from: 0,
          from_as_string: '0.0',
          to: 1000,
          to_as_string: '1000.0',
          doc_count: 606,
        },
        '1000.0-2000.0': {
          from: 1000,
          from_as_string: '1000.0',
          to: 2000,
          to_as_string: '2000.0',
          doc_count: 298,
        },
      },
    },
  },
};

data.oneFilterBucket = {
  took: 11,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    failed: 0,
  },
  hits: {
    total: 6005,
    max_score: 0,
    hits: [],
  },
  aggregations: {
    agg_2: {
      buckets: {
        'type:apache': {
          doc_count: 4844,
        },
        'type:nginx': {
          doc_count: 1161,
        },
      },
    },
  },
};

data.oneHistogramBucket = {
  took: 37,
  timed_out: false,
  _shards: {
    total: 6,
    successful: 6,
    failed: 0,
  },
  hits: {
    total: 49208,
    max_score: 0,
    hits: [],
  },
  aggregations: {
    agg_2: {
      buckets: [
        {
          key_as_string: '2014-09-28T00:00:00.000Z',
          key: 1411862400000,
          doc_count: 8247,
        },
        {
          key_as_string: '2014-09-29T00:00:00.000Z',
          key: 1411948800000,
          doc_count: 8184,
        },
        {
          key_as_string: '2014-09-30T00:00:00.000Z',
          key: 1412035200000,
          doc_count: 8269,
        },
        {
          key_as_string: '2014-10-01T00:00:00.000Z',
          key: 1412121600000,
          doc_count: 8141,
        },
        {
          key_as_string: '2014-10-02T00:00:00.000Z',
          key: 1412208000000,
          doc_count: 8148,
        },
        {
          key_as_string: '2014-10-03T00:00:00.000Z',
          key: 1412294400000,
          doc_count: 8219,
        },
      ],
    },
  },
};

export default data;
