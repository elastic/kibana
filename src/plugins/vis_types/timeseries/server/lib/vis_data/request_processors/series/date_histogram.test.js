/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DefaultSearchCapabilities } from '../../../search_strategies/capabilities/default_search_capabilities';
import { dateHistogram } from './date_histogram';
import { getIntervalAndTimefield } from '../../get_interval_and_timefield';
import { UI_SETTINGS } from '../../../../../../../data/common';

describe('dateHistogram(req, panel, series)', () => {
  let panel;
  let series;
  let req;
  let capabilities;
  let config;
  let indexPattern;
  let uiSettings;
  let buildSeriesMetaParams;

  beforeEach(() => {
    req = {
      body: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    panel = {
      index_pattern: '*',
      time_field: '@timestamp',
      interval: '10s',
      id: 'panelId',
    };
    series = { id: 'test', metrics: [{ type: 'avg' }] };
    config = {
      allowLeadingWildcards: true,
      queryStringOptions: {},
    };
    indexPattern = {};
    capabilities = new DefaultSearchCapabilities({ timezone: 'UTC', maxBucketsLimit: 2000 });
    uiSettings = {
      get: async (key) => (key === UI_SETTINGS.HISTOGRAM_MAX_BARS ? 100 : 50),
    };
    buildSeriesMetaParams = jest.fn(async () => {
      return getIntervalAndTimefield(
        panel,
        indexPattern,
        {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
          maxBuckets: 1000,
        },
        series
      );
    });
  });

  test('calls next when finished', async () => {
    const next = jest.fn();

    await dateHistogram(
      req,
      panel,
      series,
      config,
      indexPattern,
      capabilities,
      uiSettings,
      buildSeriesMetaParams
    )(next)({});

    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns valid date histogram', async () => {
    const next = (doc) => doc;
    const doc = await dateHistogram(
      req,
      panel,
      series,
      config,
      indexPattern,
      capabilities,
      uiSettings,
      buildSeriesMetaParams
    )(next)({});

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
            intervalString: '10s',
            timeField: '@timestamp',
            seriesId: 'test',
            panelId: 'panelId',
          },
        },
      },
    });
  });

  test('returns valid date histogram (offset by 1h)', async () => {
    series.offset_time = '1h';
    const next = (doc) => doc;
    const doc = await dateHistogram(
      req,
      panel,
      series,
      config,
      indexPattern,
      capabilities,
      uiSettings,
      buildSeriesMetaParams
    )(next)({});

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
            intervalString: '10s',
            timeField: '@timestamp',
            seriesId: 'test',
            panelId: 'panelId',
          },
        },
      },
    });
  });

  test('returns valid date histogram with overridden index pattern', async () => {
    series.override_index_pattern = 1;
    series.series_index_pattern = '*';
    series.series_time_field = 'timestamp';
    series.series_interval = '20s';
    const next = (doc) => doc;
    const doc = await dateHistogram(
      req,
      panel,
      series,
      config,
      indexPattern,
      capabilities,
      uiSettings,
      buildSeriesMetaParams
    )(next)({});

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
            intervalString: '20s',
            timeField: 'timestamp',
            seriesId: 'test',
            panelId: 'panelId',
          },
        },
      },
    });
  });

  describe('dateHistogram for entire time range mode', () => {
    beforeEach(() => {
      panel.time_range_mode = 'entire_time_range';
    });

    test('should ignore entire range mode for timeseries', async () => {
      panel.type = 'timeseries';

      const next = (doc) => doc;
      const doc = await dateHistogram(
        req,
        panel,
        series,
        config,
        indexPattern,
        capabilities,
        uiSettings,
        buildSeriesMetaParams
      )(next)({});

      expect(doc.aggs.test.aggs.timeseries.auto_date_histogram).toBeUndefined();
      expect(doc.aggs.test.aggs.timeseries.date_histogram).toBeDefined();
    });

    test('should set meta values', async () => {
      // set 15 minutes (=== 900000ms) interval;
      req.body.timerange = {
        min: '2021-01-01T00:00:00Z',
        max: '2021-01-01T00:15:00Z',
      };

      const next = (doc) => doc;
      const doc = await dateHistogram(
        req,
        panel,
        series,
        config,
        indexPattern,
        capabilities,
        uiSettings,
        buildSeriesMetaParams
      )(next)({});

      expect(doc.aggs.test.meta).toMatchInlineSnapshot(`
        Object {
          "dataViewId": undefined,
          "indexPatternString": undefined,
          "intervalString": "900000ms",
          "panelId": "panelId",
          "seriesId": "test",
          "timeField": "@timestamp",
        }
      `);
    });

    test('should returns valid date histogram for entire range mode', async () => {
      const next = (doc) => doc;
      const doc = await dateHistogram(
        req,
        panel,
        series,
        config,
        indexPattern,
        capabilities,
        uiSettings,
        buildSeriesMetaParams
      )(next)({});

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
              intervalString: '3600000ms',
              panelId: 'panelId',
            },
          },
        },
      });
    });
  });
});
