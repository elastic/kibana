/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { buildSearchParams, fetchAndCalculateFieldStats } from './field_stats_utils';

const dataView = createStubDataView({
  spec: {
    id: 'test',
    title: 'test',
    fields: {
      bytes: {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        aggregatable: true,
        searchable: true,
        count: 10,
        readFromDocValues: true,
        scripted: false,
        isMapped: true,
      },
      bytes_counter: {
        timeSeriesMetric: 'counter',
        name: 'bytes_counter',
        type: 'number',
        esTypes: ['long'],
        aggregatable: true,
        searchable: true,
        count: 10,
        readFromDocValues: true,
        scripted: false,
        isMapped: true,
      },
      'extension.keyword': {
        name: 'extension.keyword',
        type: 'string',
        esTypes: ['keyword'],
        aggregatable: true,
        searchable: true,
        count: 0,
        readFromDocValues: true,
        scripted: false,
        subType: {
          multi: {
            parent: 'extension',
          },
        },
        isMapped: true,
      },
      _id: {
        name: '_id',
        type: 'string',
        esTypes: ['_id'],
        aggregatable: false,
        searchable: true,
        readFromDocValues: true,
        isMapped: true,
      },
    },
  },
});

describe('fieldStatsUtils', function () {
  describe('buildSearchParams()', () => {
    it('should work correctly for aggregations and a data view time field', () => {
      expect(
        buildSearchParams({
          dataViewPattern: 'kibana_sample_data_logs',
          timeFieldName: 'timestamp',
          fromDate: '2022-12-05T23:00:00.000Z',
          toDate: '2023-01-05T09:33:05.359Z',
          dslQuery: {
            bool: {
              must: [],
              filter: [
                {
                  match_phrase: {
                    'geo.src': 'US',
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          },
          runtimeMappings: {
            hour_of_day: {
              type: 'long',
              script: {
                source: "emit(doc['timestamp'].value.getHour());",
              },
            },
          },
          aggs: {
            sample: {
              sampler: {
                shard_size: 5000,
              },
              aggs: {
                sample_count: {
                  value_count: {
                    field: 'extension.keyword',
                  },
                },
                top_values: {
                  terms: {
                    field: 'extension.keyword',
                    size: 10,
                    shard_size: 25,
                  },
                },
              },
            },
          },
        })
      ).toMatchSnapshot();
    });

    it('should work correctly for aggregations without a data view time field', () => {
      expect(
        buildSearchParams({
          dataViewPattern: 'kibana_sample*',
          timeFieldName: '',
          fromDate: '2022-12-05T23:00:00.000Z',
          toDate: '2023-01-05T09:33:53.717Z',
          dslQuery: {
            bool: {
              must: [],
              filter: [
                {
                  match_phrase: {
                    'geo.src': 'US',
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          },
          runtimeMappings: {},
          aggs: {
            sample: {
              sampler: {
                shard_size: 5000,
              },
              aggs: {
                sample_count: {
                  value_count: {
                    field: 'extension.keyword',
                  },
                },
                top_values: {
                  terms: {
                    field: 'extension.keyword',
                    size: 10,
                    shard_size: 25,
                  },
                },
              },
            },
          },
        })
      ).toMatchSnapshot();
    });

    it('should work correctly for fetching field examples', () => {
      expect(
        buildSearchParams({
          dataViewPattern: 'kibana_sample_data_logs',
          timeFieldName: 'timestamp',
          fromDate: '2022-12-05T23:00:00.000Z',
          toDate: '2023-01-05T09:35:24.109Z',
          dslQuery: {
            bool: {
              must: [],
              filter: [
                {
                  match_phrase: {
                    'geo.src': 'US',
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          },
          runtimeMappings: {
            hour_of_day: {
              type: 'long',
              script: {
                source: "emit(doc['timestamp'].value.getHour());",
              },
            },
          },
          fields: [
            {
              field: '_id',
            },
          ],
          size: 100,
        })
      ).toMatchSnapshot();
    });
  });

  describe('fetchAndCalculateFieldStats()', () => {
    it('should provide data to render a number summary for some number fields (time series metric counter)', async () => {
      const searchMock = jest.fn(async () => ({
        took: 1,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 6460,
          max_score: null,
          hits: [],
        },
        aggregations: {
          sample: {
            doc_count: 5000,
            min_max_summary: {
              doc_count: 5000,
              min: {
                value: 29674,
              },
              max: {
                value: 36821994,
              },
            },
          },
        },
      }));

      const result = await fetchAndCalculateFieldStats({
        searchHandler: searchMock,
        dataView,
        field: dataView.getFieldByName('bytes_counter')!,
        fromDate: '2022-12-05T23:00:00.000Z',
        toDate: '2023-01-05T09:33:05.359Z',
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "numberSummary": Object {
            "maxValue": 36821994,
            "minValue": 29674,
          },
          "sampledDocuments": 5000,
          "sampledValues": 5000,
          "totalDocuments": 6460,
        }
      `);

      expect(searchMock).toHaveBeenCalledWith({
        aggs: {
          sample: {
            sampler: { shard_size: 5000 },
            aggs: {
              min_max_summary: {
                filter: { exists: { field: 'bytes_counter' } },
                aggs: {
                  min: { min: { field: 'bytes_counter' } },
                  max: { max: { field: 'bytes_counter' } },
                },
              },
            },
          },
        },
      });
    });

    it('should provide data for rendering top values and value distribution for a number field', async () => {
      const searchMock = jest.fn(async ({ aggs }) =>
        aggs?.sample?.aggs?.histo
          ? {
              took: 1,
              timed_out: false,
              _shards: {
                total: 10,
                successful: 10,
                skipped: 0,
                failed: 0,
              },
              hits: {
                total: 2,
                max_score: null,
                hits: [],
              },
              aggregations: {
                sample: {
                  doc_count: 2,
                  histo: {
                    buckets: [
                      {
                        key: 1620,
                        doc_count: 1,
                      },
                      {
                        key: 1944,
                        doc_count: 0,
                      },
                      {
                        key: 2268,
                        doc_count: 0,
                      },
                      {
                        key: 2592,
                        doc_count: 0,
                      },
                      {
                        key: 2916,
                        doc_count: 0,
                      },
                      {
                        key: 3240,
                        doc_count: 0,
                      },
                      {
                        key: 3564,
                        doc_count: 0,
                      },
                      {
                        key: 3888,
                        doc_count: 0,
                      },
                      {
                        key: 4212,
                        doc_count: 0,
                      },
                      {
                        key: 4536,
                        doc_count: 0,
                      },
                      {
                        key: 4860,
                        doc_count: 1,
                      },
                    ],
                  },
                },
              },
            }
          : {
              took: 2,
              timed_out: false,
              _shards: {
                total: 10,
                successful: 10,
                skipped: 0,
                failed: 0,
              },
              hits: {
                total: 2,
                max_score: null,
                hits: [],
              },
              aggregations: {
                sample: {
                  doc_count: 2,
                  top_values: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      {
                        key: 1880,
                        doc_count: 1,
                      },
                      {
                        key: 5115,
                        doc_count: 1,
                      },
                    ],
                  },
                  min_value: {
                    value: 1880,
                  },
                  sample_count: {
                    value: 2,
                  },
                  max_value: {
                    value: 5115,
                  },
                },
              },
            }
      );

      const result = await fetchAndCalculateFieldStats({
        searchHandler: searchMock,
        dataView,
        field: dataView.getFieldByName('bytes')!,
        fromDate: '2022-12-05T23:00:00.000Z',
        toDate: '2023-01-05T09:33:05.359Z',
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "histogram": Object {
            "buckets": Array [
              Object {
                "count": 1,
                "key": 1620,
              },
              Object {
                "count": 0,
                "key": 1944,
              },
              Object {
                "count": 0,
                "key": 2268,
              },
              Object {
                "count": 0,
                "key": 2592,
              },
              Object {
                "count": 0,
                "key": 2916,
              },
              Object {
                "count": 0,
                "key": 3240,
              },
              Object {
                "count": 0,
                "key": 3564,
              },
              Object {
                "count": 0,
                "key": 3888,
              },
              Object {
                "count": 0,
                "key": 4212,
              },
              Object {
                "count": 0,
                "key": 4536,
              },
              Object {
                "count": 1,
                "key": 4860,
              },
            ],
          },
          "sampledDocuments": 2,
          "sampledValues": 2,
          "topValues": Object {
            "buckets": Array [
              Object {
                "count": 1,
                "key": 1880,
              },
              Object {
                "count": 1,
                "key": 5115,
              },
            ],
          },
          "totalDocuments": 2,
        }
      `);

      expect(searchMock).toHaveBeenNthCalledWith(1, {
        aggs: {
          sample: {
            sampler: { shard_size: 5000 },
            aggs: {
              min_value: { min: { field: 'bytes' } },
              max_value: { max: { field: 'bytes' } },
              sample_count: { value_count: { field: 'bytes' } },
              top_values: { terms: { field: 'bytes', size: 10 } },
            },
          },
        },
      });

      expect(searchMock).toHaveBeenNthCalledWith(2, {
        aggs: {
          sample: {
            sampler: { shard_size: 5000 },
            aggs: { histo: { histogram: { field: 'bytes', interval: 324 } } },
          },
        },
      });
    });

    it('should provide data for string top values', async () => {
      const searchMock = jest.fn(async () => ({
        took: 3,
        timed_out: false,
        _shards: {
          total: 10,
          successful: 10,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 75026,
          max_score: null,
          hits: [],
        },
        aggregations: {
          sample: {
            doc_count: 50000,
            top_values: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'jpg',
                  doc_count: 32039,
                },
                {
                  key: 'css',
                  doc_count: 8155,
                },
                {
                  key: 'png',
                  doc_count: 4823,
                },
                {
                  key: 'gif',
                  doc_count: 3317,
                },
                {
                  key: 'php',
                  doc_count: 1666,
                },
              ],
            },
            sample_count: {
              value: 50000,
            },
          },
        },
      }));

      const result = await fetchAndCalculateFieldStats({
        searchHandler: searchMock,
        dataView,
        field: dataView.getFieldByName('extension.keyword')!,
        fromDate: '2022-12-05T23:00:00.000Z',
        toDate: '2023-01-05T09:33:05.359Z',
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "sampledDocuments": 50000,
          "sampledValues": 50000,
          "topValues": Object {
            "buckets": Array [
              Object {
                "count": 32039,
                "key": "jpg",
              },
              Object {
                "count": 8155,
                "key": "css",
              },
              Object {
                "count": 4823,
                "key": "png",
              },
              Object {
                "count": 3317,
                "key": "gif",
              },
              Object {
                "count": 1666,
                "key": "php",
              },
            ],
          },
          "totalDocuments": 75026,
        }
      `);

      expect(searchMock).toHaveBeenCalledWith({
        aggs: {
          sample: {
            sampler: { shard_size: 5000 },
            aggs: {
              sample_count: { value_count: { field: 'extension.keyword' } },
              top_values: { terms: { field: 'extension.keyword', size: 10, shard_size: 25 } },
            },
          },
        },
      });
    });

    it('should provide examples for a non-aggregatable field', async () => {
      const searchMock = jest.fn(async () => ({
        took: 2,
        timed_out: false,
        _shards: {
          total: 10,
          successful: 10,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 2,
          max_score: 0,
          hits: [
            {
              _index: 'logstash-0',
              _id: 'py8MyIcBz-pNi9QsLMYl',
              _score: 0,
              fields: {
                _id: ['py8MyIcBz-pNi9QsLMYl'],
              },
            },
            {
              _index: 'logstash-0',
              _id: '_S8MyIcBz-pNi9QsIoj5',
              _score: 0,
              fields: {
                _id: ['_S8MyIcBz-pNi9QsIoj5'],
              },
            },
          ],
        },
      }));

      const result = await fetchAndCalculateFieldStats({
        searchHandler: searchMock,
        dataView,
        field: dataView.getFieldByName('_id')!,
        fromDate: '2022-12-05T23:00:00.000Z',
        toDate: '2023-01-05T09:33:05.359Z',
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "sampledDocuments": 2,
          "sampledValues": 2,
          "topValues": Object {
            "areExamples": true,
            "buckets": Array [
              Object {
                "count": 1,
                "key": "_S8MyIcBz-pNi9QsIoj5",
              },
              Object {
                "count": 1,
                "key": "py8MyIcBz-pNi9QsLMYl",
              },
            ],
          },
          "totalDocuments": 2,
        }
      `);

      expect(searchMock).toHaveBeenCalledWith({ size: 100, fields: [{ field: '_id' }] });
    });
  });
});
