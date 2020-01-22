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

const filename = require('path').basename(__filename);
import es from '../es';

import tlConfigFn from './fixtures/tlConfig';
import * as aggResponse from '../es/lib/agg_response_to_series_list';
import buildRequest from '../es/lib/build_request';
import createDateAgg from '../es/lib/create_date_agg';
import esResponse from './fixtures/es_response';

import Bluebird from 'bluebird';
import _ from 'lodash';
import { expect } from 'chai';
import sinon from 'sinon';
import invoke from './helpers/invoke_series_fn.js';

function stubRequestAndServer(response, indexPatternSavedObjects = []) {
  return {
    server: {
      plugins: {
        elasticsearch: {
          getCluster: sinon
            .stub()
            .withArgs('data')
            .returns({
              callWithRequest: function() {
                return Bluebird.resolve(response);
              },
            }),
        },
      },
    },
    request: {
      getSavedObjectsClient: function() {
        return {
          find: function() {
            return Bluebird.resolve({
              saved_objects: indexPatternSavedObjects,
            });
          },
        };
      },
    },
  };
}

describe(filename, () => {
  let tlConfig;

  describe('seriesList processor', () => {
    it('throws an error then the index is missing', () => {
      tlConfig = stubRequestAndServer({
        _shards: { total: 0 },
      });
      return invoke(es, [5], tlConfig)
        .then(expect.fail)
        .catch(e => {
          expect(e).to.be.an('error');
        });
    });

    it('returns a seriesList', () => {
      tlConfig = stubRequestAndServer(esResponse);
      return invoke(es, [5], tlConfig).then(r => {
        expect(r.output.type).to.eql('seriesList');
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

    it('creates a date_histogram with meta.type of time_buckets', () => {
      expect(agg.time_buckets.meta.type).to.eql('time_buckets');
      expect(agg.time_buckets.date_histogram).to.be.an('object');
    });

    it('has extended_bounds that match tlConfig', () => {
      expect(agg.time_buckets.date_histogram.extended_bounds.min).to.equal(tlConfig.time.from);
      expect(agg.time_buckets.date_histogram.extended_bounds.max).to.equal(tlConfig.time.to);
    });

    it('sets the timezone', () => {
      expect(agg.time_buckets.date_histogram.time_zone).to.equal('Etc/UTC');
    });

    it('sets the field and interval', () => {
      expect(agg.time_buckets.date_histogram.field).to.equal('@timestamp');
      expect(agg.time_buckets.date_histogram.interval).to.equal('1y');
    });

    it('sets min_doc_count to 0', () => {
      expect(agg.time_buckets.date_histogram.min_doc_count).to.equal(0);
    });

    describe('metric aggs', () => {
      const emptyScriptedFields = [];

      it('adds a metric agg for each metric', () => {
        config.metric = ['sum:beer', 'avg:bytes', 'percentiles:bytes'];
        agg = createDateAgg(config, tlConfig, emptyScriptedFields);
        expect(agg.time_buckets.aggs['sum(beer)']).to.eql({ sum: { field: 'beer' } });
        expect(agg.time_buckets.aggs['avg(bytes)']).to.eql({ avg: { field: 'bytes' } });
        expect(agg.time_buckets.aggs['percentiles(bytes)']).to.eql({
          percentiles: { field: 'bytes' },
        });
      });

      it('adds a scripted metric agg for each scripted metric', () => {
        config.metric = ['avg:scriptedBytes'];
        const scriptedFields = [
          {
            name: 'scriptedBytes',
            script: 'doc["bytes"].value',
            lang: 'painless',
          },
        ];
        agg = createDateAgg(config, tlConfig, scriptedFields);
        expect(agg.time_buckets.aggs['avg(scriptedBytes)']).to.eql({
          avg: {
            script: {
              source: 'doc["bytes"].value',
              lang: 'painless',
            },
          },
        });
      });

      it('has a special `count` metric that uses a script', () => {
        config.metric = ['count'];
        agg = createDateAgg(config, tlConfig, emptyScriptedFields);
        expect(agg.time_buckets.aggs.count.bucket_script).to.be.an('object');
        expect(agg.time_buckets.aggs.count.bucket_script.buckets_path).to.eql('_count');
      });
    });
  });

  describe('buildRequest', () => {
    const fn = buildRequest;
    const emptyScriptedFields = [];
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

    it('sets the index on the request', () => {
      config.index = 'beer';
      const request = fn(config, tlConfig, emptyScriptedFields);

      expect(request.index).to.equal('beer');
    });

    it('always sets body.size to 0', () => {
      const request = fn(config, tlConfig, emptyScriptedFields);

      expect(request.body.size).to.equal(0);
    });

    it('creates a filters agg that contains each of the queries passed', () => {
      config.q = ['foo', 'bar'];
      const request = fn(config, tlConfig, emptyScriptedFields);

      expect(request.body.aggs.q.meta.type).to.equal('split');

      const filters = request.body.aggs.q.filters.filters;
      expect(filters.foo.query_string.query).to.eql('foo');
      expect(filters.bar.query_string.query).to.eql('bar');
    });

    describe('timeouts', () => {
      it('sets the timeout on the request', () => {
        config.index = 'beer';
        const request = fn(config, tlConfig, emptyScriptedFields, 30000);

        expect(request.timeout).to.equal('30000ms');
      });

      it('sets no timeout if elasticsearch.shardTimeout is set to 0', () => {
        config.index = 'beer';
        const request = fn(config, tlConfig, emptyScriptedFields, 0);

        expect(request).to.not.have.property('timeout');
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

      it('sets ignore_throttled=true on the request', () => {
        config.index = 'beer';
        tlConfig.settings['search:includeFrozen'] = false;
        const request = fn(config, tlConfig, emptyScriptedFields);

        expect(request.ignore_throttled).to.equal(true);
      });

      it('sets no timeout if elasticsearch.shardTimeout is set to 0', () => {
        tlConfig.settings['search:includeFrozen'] = true;
        config.index = 'beer';
        const request = fn(config, tlConfig, emptyScriptedFields);

        expect(request.ignore_throttled).to.equal(false);
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
            payload: {
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

      it('adds the contents of payload.extended.es.filter to a filter clause of the bool', () => {
        config.kibana = true;
        const request = fn(config, tlConfig, emptyScriptedFields);
        const filter = request.body.query.bool.filter.bool;
        expect(filter.must.length).to.eql(1);
        expect(filter.must_not.length).to.eql(2);
      });

      it('does not include filters if config.kibana = false', () => {
        config.kibana = false;
        const request = fn(config, tlConfig, emptyScriptedFields);
        expect(request.body.query.bool.filter).to.eql(undefined);
      });

      it('adds a time filter to the bool querys must clause', () => {
        let request = fn(config, tlConfig, emptyScriptedFields);
        expect(request.body.query.bool.must.length).to.eql(1);
        expect(request.body.query.bool.must[0]).to.eql({
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: '1970-01-01T00:00:00.001Z',
              lte: '1970-01-01T00:00:00.005Z',
            },
          },
        });

        config.kibana = true;
        request = fn(config, tlConfig, emptyScriptedFields);
        expect(request.body.query.bool.must.length).to.eql(1);
      });
    });

    describe('config.split', () => {
      it('adds terms aggs, in order, under the filters agg', () => {
        config.split = ['beer:5', 'wine:10'];
        const request = fn(config, tlConfig, emptyScriptedFields);

        const aggs = request.body.aggs.q.aggs;

        expect(aggs.beer.meta.type).to.eql('split');
        expect(aggs.beer.terms.field).to.eql('beer');
        expect(aggs.beer.terms.size).to.eql(5);

        expect(aggs.beer.aggs.wine.meta.type).to.eql('split');
        expect(aggs.beer.aggs.wine.terms.field).to.eql('wine');
        expect(aggs.beer.aggs.wine.terms.size).to.eql(10);
      });

      it('adds scripted terms aggs, in order, under the filters agg', () => {
        config.split = ['scriptedBeer:5', 'scriptedWine:10'];
        const scriptedFields = [
          {
            name: 'scriptedBeer',
            script: 'doc["beer"].value',
            lang: 'painless',
          },
          {
            name: 'scriptedWine',
            script: 'doc["wine"].value',
            lang: 'painless',
          },
        ];
        const request = fn(config, tlConfig, scriptedFields);

        const aggs = request.body.aggs.q.aggs;

        expect(aggs.scriptedBeer.meta.type).to.eql('split');
        expect(aggs.scriptedBeer.terms.script).to.eql({
          source: 'doc["beer"].value',
          lang: 'painless',
        });
        expect(aggs.scriptedBeer.terms.size).to.eql(5);

        expect(aggs.scriptedBeer.aggs.scriptedWine.meta.type).to.eql('split');
        expect(aggs.scriptedBeer.aggs.scriptedWine.terms.script).to.eql({
          source: 'doc["wine"].value',
          lang: 'painless',
        });
        expect(aggs.scriptedBeer.aggs.scriptedWine.terms.size).to.eql(10);
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

      it('Should convert a single metric agg', () => {
        const buckets = [
          { key: 1000, count: { value: 3 } },
          { key: 2000, count: { value: 14 } },
          { key: 3000, count: { value: 15 } },
        ];

        expect(fn(buckets)).to.eql({
          count: [
            [1000, 3],
            [2000, 14],
            [3000, 15],
          ],
        });
      });

      it('Should convert multiple metric aggs', () => {
        const buckets = [
          { key: 1000, count: { value: 3 }, max: { value: 92 } },
          { key: 2000, count: { value: 14 }, max: { value: 65 } },
          { key: 3000, count: { value: 15 }, max: { value: 35 } },
        ];

        expect(fn(buckets)).to.eql({
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

      it('Should convert percentiles metric aggs', () => {
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

        expect(fn(buckets)).to.eql({
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

    it('should throw an error', () => {
      expect(aggResponse.default(esResponse.aggregations, config)).to.eql([
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
