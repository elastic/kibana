/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import es from './index';
import tlConfigFn from '../fixtures/tl_config';
import * as aggResponse from './lib/agg_response_to_series_list';
import buildRequest from './lib/build_request';
import createDateAgg from './lib/create_date_agg';
import esResponse from '../fixtures/es_response';

import _ from 'lodash';
import sinon from 'sinon';
import invoke from '../helpers/invoke_series_fn.js';
import { UI_SETTINGS } from '../../../../../data/server';

describe('es', () => {
  let tlConfig;

  function stubRequestAndServer(response) {
    return {
      context: { search: { search: jest.fn().mockReturnValue(of(response)) } },
      getIndexPatternsService: () => ({
        find: async () => [],
      }),
      request: {
        events: {
          aborted$: of(),
        },
        body: {},
      },
    };
  }

  describe('seriesList processor', () => {
    test('throws an error then the index is missing', () => {
      tlConfig = stubRequestAndServer({
        rawResponse: {
          _shards: { total: 0 },
        },
      });
      return invoke(es, [5], tlConfig)
        .then(expect.fail)
        .catch((e) => {
          expect(e instanceof Error).toBeTruthy();
        });
    });

    test('should call data search with sessionId, isRestore and isStored', async () => {
      const baseTlConfig = stubRequestAndServer({ rawResponse: esResponse });
      tlConfig = {
        ...baseTlConfig,
        request: {
          ...baseTlConfig.request,
          body: {
            searchSession: {
              sessionId: '1',
              isRestore: true,
              isStored: false,
            },
          },
        },
      };

      await invoke(es, [5], tlConfig);

      const res = tlConfig.context.search.search.mock.calls[0][1];
      expect(res).toHaveProperty('sessionId', '1');
      expect(res).toHaveProperty('isRestore', true);
      expect(res).toHaveProperty('isStored', false);
    });

    test('returns a seriesList', () => {
      tlConfig = stubRequestAndServer({ rawResponse: esResponse });
      return invoke(es, [5], tlConfig).then((r) => {
        expect(r.output.type).toEqual('seriesList');
      });
    });
  });

  describe('createDateAgg', () => {
    let tlConfig;
    let config;
    let agg;
    beforeEach(() => {
      tlConfig = tlConfigFn();
      config = {
        timefield: '@timestamp',
        interval: '1y',
      };
      agg = createDateAgg(config, tlConfig);
    });

    test('creates a date_histogram with meta.type of time_buckets', () => {
      expect(agg.time_buckets.meta.type).toEqual('time_buckets');
      expect(typeof agg.time_buckets.date_histogram).toBe('object');
    });

    test('has extended_bounds that match tlConfig', () => {
      expect(agg.time_buckets.date_histogram.extended_bounds.min).toEqual(tlConfig.time.from);
      expect(agg.time_buckets.date_histogram.extended_bounds.max).toEqual(tlConfig.time.to);
    });

    test('sets the timezone', () => {
      expect(agg.time_buckets.date_histogram.time_zone).toEqual('Etc/UTC');
    });

    test('sets the field', () => {
      expect(agg.time_buckets.date_histogram.field).toEqual('@timestamp');
    });

    test('sets the interval for calendar_interval correctly', () => {
      expect(agg.time_buckets.date_histogram).toHaveProperty('calendar_interval', '1y');
    });

    test('sets the interval for fixed_interval correctly', () => {
      const a = createDateAgg({ timefield: '@timestamp', interval: '24h' }, tlConfig);
      expect(a.time_buckets.date_histogram).toHaveProperty('fixed_interval', '24h');
    });

    test('sets min_doc_count to 0', () => {
      expect(agg.time_buckets.date_histogram.min_doc_count).toEqual(0);
    });

    describe('metric aggs', () => {
      const emptyScriptFields = {};

      test('adds a metric agg for each metric', () => {
        config.metric = [
          'sum:beer',
          'avg:bytes',
          'percentiles:bytes',
          'cardinality:\\:sample',
          'sum:\\:beer',
          'percentiles:\\:\\:bytes:1.2,1.3,2.7',
          'percentiles:\\:bytes\\:123:20.0,50.0,100.0',
          'percentiles:a:2',
        ];
        agg = createDateAgg(config, tlConfig, emptyScriptFields);
        expect(agg.time_buckets.aggs['sum(beer)']).toEqual({ sum: { field: 'beer' } });
        expect(agg.time_buckets.aggs['avg(bytes)']).toEqual({ avg: { field: 'bytes' } });
        expect(agg.time_buckets.aggs['percentiles(bytes)']).toEqual({
          percentiles: { field: 'bytes' },
        });
        expect(agg.time_buckets.aggs['cardinality(:sample)']).toEqual({
          cardinality: { field: ':sample' },
        });
        expect(agg.time_buckets.aggs['sum(:beer)']).toEqual({ sum: { field: ':beer' } });
        expect(agg.time_buckets.aggs['percentiles(::bytes)']).toEqual({
          percentiles: { field: '::bytes', percents: [1.2, 1.3, 2.7] },
        });
        expect(agg.time_buckets.aggs['percentiles(:bytes:123)']).toEqual({
          percentiles: { field: ':bytes:123', percents: [20.0, 50.0, 100.0] },
        });
        expect(agg.time_buckets.aggs['percentiles(a)']).toEqual({
          percentiles: { field: 'a', percents: [2] },
        });
      });

      test('adds a scripted metric agg for each scripted metric', () => {
        config.metric = ['avg:scriptedBytes'];
        const scriptFields = {
          scriptedBytes: {
            script: {
              source: 'doc["bytes"].value',
              lang: 'painless',
            },
          },
        };
        agg = createDateAgg(config, tlConfig, scriptFields);
        expect(agg.time_buckets.aggs['avg(scriptedBytes)']).toEqual({
          avg: {
            script: {
              source: 'doc["bytes"].value',
              lang: 'painless',
            },
          },
        });
      });

      test('has a special `count` metric that uses a script', () => {
        config.metric = ['count'];
        agg = createDateAgg(config, tlConfig, emptyScriptFields);
        expect(typeof agg.time_buckets.aggs.count.bucket_script).toBe('object');
        expect(agg.time_buckets.aggs.count.bucket_script.buckets_path).toEqual('_count');
      });

      test('has a special `count` metric with redundant field which use a script', () => {
        config.metric = ['count:beer'];
        agg = createDateAgg(config, tlConfig, emptyScriptFields);
        expect(typeof agg.time_buckets.aggs.count.bucket_script).toBe('object');
        expect(agg.time_buckets.aggs.count.bucket_script.buckets_path).toEqual('_count');
      });
    });
  });

  describe('buildRequest', () => {
    const fn = buildRequest;
    const emptyScriptFields = {};
    let tlConfig;
    let config;
    beforeEach(() => {
      tlConfig = tlConfigFn();
      config = {
        timefield: '@timestamp',
        interval: '1y',
        index: 'beer',
      };
    });

    test('sets the index on the request', () => {
      config.index = 'beer';
      const request = fn(config, tlConfig, emptyScriptFields);

      expect(request.params.index).toEqual('beer');
    });

    test('always sets body.size to 0', () => {
      const request = fn(config, tlConfig, emptyScriptFields);

      expect(request.params.body.size).toEqual(0);
    });

    test('creates a filters agg that contains each of the queries passed', () => {
      config.q = ['foo', 'bar'];
      const request = fn(config, tlConfig, emptyScriptFields);

      expect(request.params.body.aggs.q.meta.type).toEqual('split');

      const filters = request.params.body.aggs.q.filters.filters;
      expect(filters.foo.query_string.query).toEqual('foo');
      expect(filters.bar.query_string.query).toEqual('bar');
    });

    describe('timeouts', () => {
      test('sets the timeout on the request', () => {
        config.index = 'beer';
        const request = fn(config, tlConfig, emptyScriptFields, {}, 30000);

        expect(request.params.timeout).toEqual('30000ms');
      });

      test('sets no timeout if elasticsearch.shardTimeout is set to 0', () => {
        config.index = 'beer';
        const request = fn(config, tlConfig, emptyScriptFields, {}, 0);

        expect(request.params).not.toHaveProperty('timeout');
      });
    });

    describe('frozen indices', () => {
      let sandbox;

      beforeEach(() => {
        sandbox = sinon.createSandbox();
      });

      afterEach(() => {
        sandbox.restore();
      });

      test('sets ignore_throttled=false on the request', () => {
        config.index = 'beer';
        tlConfig.settings[UI_SETTINGS.SEARCH_INCLUDE_FROZEN] = true;
        const request = fn(config, tlConfig, emptyScriptFields);

        expect(request.params.ignore_throttled).toEqual(false);
      });

      test('sets no ignore_throttled if SEARCH_INCLUDE_FROZEN is false', () => {
        config.index = 'beer';
        tlConfig.settings[UI_SETTINGS.SEARCH_INCLUDE_FROZEN] = false;
        const request = fn(config, tlConfig, emptyScriptFields);

        expect(request.params).not.toHaveProperty('ignore_throttled');
      });

      test('sets no timeout if elasticsearch.shardTimeout is set to 0', () => {
        tlConfig.settings[UI_SETTINGS.SEARCH_INCLUDE_FROZEN] = true;
        config.index = 'beer';
        const request = fn(config, tlConfig, emptyScriptFields);

        expect(request.params.ignore_throttled).toEqual(false);
      });
    });

    describe('query body', () => {
      beforeEach(() => {
        tlConfig = _.merge(tlConfigFn(), {
          time: {
            from: 1,
            to: 5,
          },
          request: {
            body: {
              extended: {
                es: {
                  filter: {
                    bool: {
                      must: [{ query: { query_string: { query: 'foo' } } }],
                      must_not: [
                        { query: { query_string: { query: 'bar' } } },
                        { query: { query_string: { query: 'baz' } } },
                      ],
                    },
                  },
                },
              },
            },
          },
        });
      });

      test('adds the contents of body.extended.es.filter to a filter clause of the bool', () => {
        config.kibana = true;
        const request = fn(config, tlConfig, emptyScriptFields);
        const filter = request.params.body.query.bool.filter.bool;
        expect(filter.must.length).toEqual(1);
        expect(filter.must_not.length).toEqual(2);
      });

      test('does not include filters if config.kibana = false', () => {
        config.kibana = false;
        const request = fn(config, tlConfig, emptyScriptFields);
        expect(request.params.body.query.bool.filter).toEqual(undefined);
      });

      test('adds a time filter to the bool querys must clause', () => {
        let request = fn(config, tlConfig, emptyScriptFields);
        expect(request.params.body.query.bool.must.length).toEqual(1);
        expect(request.params.body.query.bool.must[0]).toEqual({
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: '1970-01-01T00:00:00.001Z',
              lte: '1970-01-01T00:00:00.005Z',
            },
          },
        });

        config.kibana = true;
        request = fn(config, tlConfig, emptyScriptFields);
        expect(request.params.body.query.bool.must.length).toEqual(1);
      });
    });

    describe('config.split', () => {
      test('adds terms aggs, in order, under the filters agg', () => {
        config.split = ['beer:5', 'wine:10', ':lemo:nade::15', ':jui:ce:723::45'];
        const request = fn(config, tlConfig, {});

        let aggs = request.params.body.aggs.q.aggs;

        expect(aggs.beer.meta.type).toEqual('split');
        expect(aggs.beer.terms.field).toEqual('beer');
        expect(aggs.beer.terms.size).toEqual(5);

        expect(aggs.beer.aggs.wine.meta.type).toEqual('split');
        expect(aggs.beer.aggs.wine.terms.field).toEqual('wine');
        expect(aggs.beer.aggs.wine.terms.size).toEqual(10);

        aggs = aggs.beer.aggs.wine.aggs;
        expect(aggs).toHaveProperty(':lemo:nade:');
        expect(aggs[':lemo:nade:'].meta.type).toEqual('split');
        expect(aggs[':lemo:nade:'].terms.field).toEqual(':lemo:nade:');
        expect(aggs[':lemo:nade:'].terms.size).toEqual(15);

        aggs = aggs[':lemo:nade:'].aggs;
        expect(aggs).toHaveProperty(':jui:ce:723:');
        expect(aggs[':jui:ce:723:'].meta.type).toEqual('split');
        expect(aggs[':jui:ce:723:'].terms.field).toEqual(':jui:ce:723:');
        expect(aggs[':jui:ce:723:'].terms.size).toEqual(45);
      });

      test('adds scripted terms aggs, in order, under the filters agg', () => {
        config.split = ['scriptedBeer:5', 'scriptedWine:10'];
        const scriptFields = {
          scriptedBeer: {
            script: {
              source: 'doc["beer"].value',
              lang: 'painless',
            },
          },
          scriptedWine: {
            script: {
              source: 'doc["wine"].value',
              lang: 'painless',
            },
          },
        };
        const request = fn(config, tlConfig, scriptFields);

        const aggs = request.params.body.aggs.q.aggs;

        expect(aggs.scriptedBeer.meta.type).toEqual('split');
        expect(aggs.scriptedBeer.terms.script).toEqual({
          source: 'doc["beer"].value',
          lang: 'painless',
        });
        expect(aggs.scriptedBeer.terms.size).toEqual(5);

        expect(aggs.scriptedBeer.aggs.scriptedWine.meta.type).toEqual('split');
        expect(aggs.scriptedBeer.aggs.scriptedWine.terms.script).toEqual({
          source: 'doc["wine"].value',
          lang: 'painless',
        });
        expect(aggs.scriptedBeer.aggs.scriptedWine.terms.size).toEqual(10);
      });
    });
  });

  describe('Aggregation flattening', () => {
    let config;
    beforeEach(() => {
      config = { fit: 'nearest' };
    });

    describe('timeBucketsToPairs', () => {
      const fn = aggResponse.timeBucketsToPairs;

      test('Should convert a single metric agg', () => {
        const buckets = [
          { key: 1000, count: { value: 3 } },
          { key: 2000, count: { value: 14 } },
          { key: 3000, count: { value: 15 } },
        ];

        expect(fn(buckets)).toEqual({
          count: [
            [1000, 3],
            [2000, 14],
            [3000, 15],
          ],
        });
      });

      test('Should convert multiple metric aggs', () => {
        const buckets = [
          { key: 1000, count: { value: 3 }, max: { value: 92 } },
          { key: 2000, count: { value: 14 }, max: { value: 65 } },
          { key: 3000, count: { value: 15 }, max: { value: 35 } },
        ];

        expect(fn(buckets)).toEqual({
          count: [
            [1000, 3],
            [2000, 14],
            [3000, 15],
          ],
          max: [
            [1000, 92],
            [2000, 65],
            [3000, 35],
          ],
        });
      });

      test('Should convert percentiles metric aggs', () => {
        const buckets = [
          {
            key: 1000,
            percentiles: { values: { '50.0': 'NaN', '75.0': 65, '95.0': 73, '99.0': 75 } },
          },
          {
            key: 2000,
            percentiles: { values: { '50.0': 25, '75.0': 32, '95.0': 'NaN', '99.0': 67 } },
          },
          {
            key: 3000,
            percentiles: { values: { '50.0': 15, '75.0': 15, '95.0': 15, '99.0': 15 } },
          },
        ];

        expect(fn(buckets)).toEqual({
          'percentiles:50.0': [
            [1000, NaN],
            [2000, 25],
            [3000, 15],
          ],
          'percentiles:75.0': [
            [1000, 65],
            [2000, 32],
            [3000, 15],
          ],
          'percentiles:95.0': [
            [1000, 73],
            [2000, NaN],
            [3000, 15],
          ],
          'percentiles:99.0': [
            [1000, 75],
            [2000, 67],
            [3000, 15],
          ],
        });
      });
    });

    test('should throw an error', () => {
      expect(aggResponse.default(esResponse.aggregations, config)).toEqual([
        {
          data: [
            [1000, 264],
            [2000, 264],
          ],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueA > FieldB:Value2A > MetricA',
          split: 'Value2A',
          type: 'series',
        },
        {
          data: [
            [1000, 398],
            [2000, 1124],
          ],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueA > FieldB:Value2A > MetricB',
          split: 'Value2A',
          type: 'series',
        },
        {
          data: [
            [1000, 699],
            [2000, 110],
          ],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueA > FieldB:Value2B > MetricA',
          split: 'Value2B',
          type: 'series',
        },
        {
          data: [
            [1000, 457],
            [2000, 506],
          ],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueA > FieldB:Value2B > MetricB',
          split: 'Value2B',
          type: 'series',
        },
        {
          data: [
            [1000, 152],
            [2000, 518],
          ],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueB > FieldB:Value2B > MetricA',
          split: 'Value2B',
          type: 'series',
        },
        {
          data: [
            [1000, 61],
            [2000, 77],
          ],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueB > FieldB:Value2B > MetricB',
          split: 'Value2B',
          type: 'series',
        },
        {
          data: [
            [1000, 114],
            [2000, 264],
          ],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueB > FieldB:Value2A > MetricA',
          split: 'Value2A',
          type: 'series',
        },
        {
          data: [
            [1000, 23],
            [2000, 45],
          ],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueB > FieldB:Value2A > MetricB',
          split: 'Value2A',
          type: 'series',
        },
        {
          data: [
            [1000, 621],
            [2000, 751],
          ],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueA > FieldB:Value2B > MetricA',
          split: 'Value2B',
          type: 'series',
        },
        {
          data: [
            [1000, 12],
            [2000, 12],
          ],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueA > FieldB:Value2B > MetricB',
          split: 'Value2B',
          type: 'series',
        },
        {
          data: [
            [1000, 110],
            [2000, 648],
          ],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueA > FieldB:Value2A > MetricA',
          split: 'Value2A',
          type: 'series',
        },
        {
          data: [
            [1000, 11],
            [2000, 12],
          ],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueA > FieldB:Value2A > MetricB',
          split: 'Value2A',
          type: 'series',
        },
        {
          data: [
            [1000, 755],
            [2000, 713],
          ],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueC > FieldB:Value2C > MetricA',
          split: 'Value2C',
          type: 'series',
        },
        {
          data: [
            [1000, 10],
            [2000, 18],
          ],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueC > FieldB:Value2C > MetricB',
          split: 'Value2C',
          type: 'series',
        },
        {
          data: [
            [1000, 391],
            [2000, 802],
          ],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueC > FieldB:Value2A > MetricA',
          split: 'Value2A',
          type: 'series',
        },
        {
          data: [
            [1000, 4],
            [2000, 4],
          ],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueC > FieldB:Value2A > MetricB',
          split: 'Value2A',
          type: 'series',
        },
      ]);
    });
  });
});
