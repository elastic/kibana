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

import { DefaultSearchCapabilities } from '../../../search_strategies/default_search_capabilities';
import { dateHistogram } from './date_histogram';

describe('dateHistogram(req, panel, series)', () => {
  let panel;
  let series;
  let req;
  let capabilities;
  let config;
  let indexPatternObject;

  beforeEach(() => {
    req = {
      payload: {
        timerange: {
          timezone: 'UTC',
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    panel = {
      index_pattern: '*',
      time_field: '@timestamp',
      interval: '10s',
    };
    series = { id: 'test' };
    config = {
      allowLeadingWildcards: true,
      queryStringOptions: {},
    };
    indexPatternObject = {};
    capabilities = new DefaultSearchCapabilities(req);
  });

  test('calls next when finished', () => {
    const next = jest.fn();
    dateHistogram(req, panel, series, config, indexPatternObject, capabilities)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns valid date histogram', () => {
    const next = doc => doc;
    const doc = dateHistogram(req, panel, series, config, indexPatternObject, capabilities)(next)(
      {}
    );
    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: '10s',
                min_doc_count: 0,
                time_zone: 'UTC',
                extended_bounds: {
                  min: 1483228800000,
                  max: 1483232400000,
                },
              },
            },
          },
          meta: {
            bucketSize: 10,
            intervalString: '10s',
            timeField: '@timestamp',
            seriesId: 'test',
          },
        },
      },
    });
  });

  test('returns valid date histogram (offset by 1h)', () => {
    series.offset_time = '1h';
    const next = doc => doc;
    const doc = dateHistogram(req, panel, series, config, indexPatternObject, capabilities)(next)(
      {}
    );
    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: '10s',
                min_doc_count: 0,
                time_zone: 'UTC',
                extended_bounds: {
                  min: 1483225200000,
                  max: 1483228800000,
                },
              },
            },
          },
          meta: {
            bucketSize: 10,
            intervalString: '10s',
            timeField: '@timestamp',
            seriesId: 'test',
          },
        },
      },
    });
  });

  test('returns valid date histogram with overridden index pattern', () => {
    series.override_index_pattern = 1;
    series.series_index_pattern = '*';
    series.series_time_field = 'timestamp';
    series.series_interval = '20s';
    const next = doc => doc;
    const doc = dateHistogram(req, panel, series, config, indexPatternObject, capabilities)(next)(
      {}
    );
    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              date_histogram: {
                field: 'timestamp',
                fixed_interval: '20s',
                min_doc_count: 0,
                time_zone: 'UTC',
                extended_bounds: {
                  min: 1483228800000,
                  max: 1483232400000,
                },
              },
            },
          },
          meta: {
            bucketSize: 20,
            intervalString: '20s',
            timeField: 'timestamp',
            seriesId: 'test',
          },
        },
      },
    });
  });

  describe('dateHistogram for entire time range mode', () => {
    test('should ignore entire range mode for timeseries', () => {
      panel.time_range_mode = 'entire_time_range';
      panel.type = 'timeseries';

      const next = doc => doc;
      const doc = dateHistogram(req, panel, series, config, indexPatternObject, capabilities)(next)(
        {}
      );

      expect(doc.aggs.test.aggs.timeseries.auto_date_histogram).toBeUndefined();
      expect(doc.aggs.test.aggs.timeseries.date_histogram).toBeDefined();
    });

    test('should returns valid date histogram for entire range mode', () => {
      panel.time_range_mode = 'entire_time_range';

      const next = doc => doc;
      const doc = dateHistogram(req, panel, series, config, indexPatternObject, capabilities)(next)(
        {}
      );
      expect(doc).toEqual({
        aggs: {
          test: {
            aggs: {
              timeseries: {
                auto_date_histogram: {
                  field: '@timestamp',
                  buckets: 1,
                },
              },
            },
            meta: {
              timeField: '@timestamp',
              seriesId: 'test',
              bucketSize: 10,
              intervalString: '10s',
            },
          },
        },
      });
    });
  });
});
