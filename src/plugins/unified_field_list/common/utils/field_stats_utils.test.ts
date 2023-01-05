/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildSearchParams } from './field_stats_utils';

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
});
