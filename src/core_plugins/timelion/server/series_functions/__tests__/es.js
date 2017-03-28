const filename = require('path').basename(__filename);
import es from '../es';

import tlConfigFn from './fixtures/tlConfig';
import * as aggResponse from '../es/lib/agg_response_to_series_list';
import buildRequest from '../es/lib/build_request';
import createDateAgg from '../es/lib/create_date_agg';
import esResponse from './fixtures/es_response';

import Promise from 'bluebird';
import _ from 'lodash';
import { expect } from 'chai';
import sinon from 'sinon';
import invoke from './helpers/invoke_series_fn.js';

function stubResponse(response) {
  return {
    server: {
      plugins:{
        elasticsearch: {
          getCluster: sinon.stub().withArgs('data').returns({
            callWithRequest: function () {
              return Promise.resolve(response);
            }
          })
        }
      }
    }
  };
}

describe(filename, () => {
  let tlConfig;

  describe('seriesList processor', () => {
    it('throws an error then the index is missing', () => {
      tlConfig = stubResponse({
        _shards: { total: 0 }
      });
      return invoke(es, [5], tlConfig)
      .then(expect.fail)
      .catch((e) => {
        expect(e).to.be.an('error');
      });
    });

    it('returns a seriesList', () => {
      tlConfig = stubResponse(esResponse);
      return invoke(es, [5], tlConfig)
      .then((r) => {
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
        interval: '1y'
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
      it('adds a metric agg for each metric', () => {
        config.metric = ['sum:beer', 'avg:bytes'];
        agg = createDateAgg(config, tlConfig);
        expect(agg.time_buckets.aggs['sum(beer)']).to.eql({ sum: { field: 'beer' } });
        expect(agg.time_buckets.aggs['avg(bytes)']).to.eql({ avg: { field: 'bytes' } });
      });

      it('has a special `count` metric that uses a script', () => {
        config.metric = ['count'];
        agg = createDateAgg(config, tlConfig);
        expect(agg.time_buckets.aggs.count.bucket_script).to.be.an('object');
        expect(agg.time_buckets.aggs.count.bucket_script.buckets_path).to.eql('_count');
      });
    });
  });

  describe('buildRequest', () => {
    const fn = buildRequest;
    let tlConfig;
    let config;
    beforeEach(() => {
      tlConfig = tlConfigFn();
      config = {
        timefield: '@timestamp',
        interval: '1y',
        index: 'beer'
      };
    });


    it('sets the index on the request', () => {
      config.index = 'beer';
      const request = fn(config, tlConfig);

      expect(request.index).to.equal('beer');
    });

    it('always sets body.size to 0', () => {
      const request = fn(config, tlConfig);

      expect(request.body.size).to.equal(0);
    });

    it('creates a filters agg that contains each of the queries passed', () => {
      config.q = ['foo', 'bar'];
      const request = fn(config, tlConfig);

      expect(request.body.aggs.q.meta.type).to.equal('split');

      const filters = request.body.aggs.q.filters.filters;
      expect(filters.foo.query_string.query).to.eql('foo');
      expect(filters.bar.query_string.query).to.eql('bar');
    });

    describe('query body', () => {
      beforeEach(() => {
        tlConfig = _.merge(tlConfigFn(), {
          time: {
            from: 1,
            to: 5,
          },
          request: { payload: { extended: { es: { filter:{
            bool: {
              must: [
                { query: { query_string: { query: 'foo' } } }
              ],
              must_not: [
                { query: { query_string: { query: 'bar' } } },
                { query: { query_string: { query: 'baz' } } }
              ]
            }
          } } } } }
        });
      });

      it('adds the contents of payload.extended.es.filter to a filter clause of the bool', () => {
        config.kibana = true;
        const request = fn(config, tlConfig);
        const filter = request.body.query.bool.filter.bool;
        expect(filter.must.length).to.eql(1);
        expect(filter.must_not.length).to.eql(2);
      });

      it('does not include filters if config.kibana = false', () => {
        config.kibana = false;
        const request = fn(config, tlConfig);
        expect(request.body.query.bool.filter).to.eql(undefined);
      });

      it('adds a time filter to the bool querys must clause', () => {
        let request = fn(config, tlConfig);
        expect(request.body.query.bool.must.length).to.eql(1);
        expect(request.body.query.bool.must[0]).to.eql({ range: { '@timestamp': {
          lte: 5,
          gte: 1,
          format: 'epoch_millis'
        } } });

        config.kibana = true;
        request = fn(config, tlConfig);
        expect(request.body.query.bool.must.length).to.eql(1);
      });
    });

    it('config.split adds terms aggs, in order, under the filters agg', () => {
      config.split = ['beer:5', 'wine:10'];
      const request = fn(config, tlConfig);

      const aggs = request.body.aggs.q.aggs;

      expect(aggs.beer.meta.type).to.eql('split');
      expect(aggs.beer.terms.field).to.eql('beer');
      expect(aggs.beer.terms.size).to.eql(5);

      expect(aggs.beer.aggs.wine.meta.type).to.eql('split');
      expect(aggs.beer.aggs.wine.terms.field).to.eql('wine');
      expect(aggs.beer.aggs.wine.terms.size).to.eql(10);
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
          { key: 3000, count: { value: 15 } }
        ];

        expect(fn(buckets)).to.eql({
          count:[[1000,3],[2000,14],[3000,15]]
        });
      });

      it('Should convert multiple metric aggs', () => {
        const buckets = [
          { key: 1000, count: { value: 3 },  max: { value: 92 } },
          { key: 2000, count: { value: 14 }, max: { value: 65 } },
          { key: 3000, count: { value: 15 }, max: { value: 35 } }
        ];

        expect(fn(buckets)).to.eql({
          count:[[1000,3],[2000,14],[3000,15]],
          max: [[1000,92],[2000,65],[3000,35]]
        });
      });
    });

    it('should throw an error', () => {
      expect(aggResponse.default(esResponse.aggregations, config)).to.eql([
        {
          data: [[1000,264],[2000,264]],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueA > FieldB:Value2A > MetricA',
          type: 'series',
        },{
          data: [[1000,398],[2000,1124]],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueA > FieldB:Value2A > MetricB',
          type: 'series',
        },{
          data: [[1000,699],[2000,110]],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueA > FieldB:Value2B > MetricA',
          type: 'series',
        },{
          data: [[1000,457],[2000,506]],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueA > FieldB:Value2B > MetricB',
          type: 'series',
        },{
          data: [[1000,152],[2000,518]],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueB > FieldB:Value2B > MetricA',
          type: 'series',
        },{
          data: [[1000,61],[2000,77]],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueB > FieldB:Value2B > MetricB',
          type: 'series',
        },{
          data: [[1000,114],[2000,264]],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueB > FieldB:Value2A > MetricA',
          type: 'series',
        },{
          data: [[1000,23],[2000,45]],
          fit: 'nearest',
          label: 'q:QueryA > FieldA:ValueB > FieldB:Value2A > MetricB',
          type: 'series',
        },{
          data: [[1000,621],[2000,751]],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueA > FieldB:Value2B > MetricA',
          type: 'series',
        },{
          data: [[1000,12],[2000,12]],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueA > FieldB:Value2B > MetricB',
          type: 'series',
        },{
          data: [[1000,110],[2000,648]],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueA > FieldB:Value2A > MetricA',
          type: 'series',
        },{
          data: [[1000,11],[2000,12]],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueA > FieldB:Value2A > MetricB',
          type: 'series',
        },{
          data: [[1000,755],[2000,713]],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueC > FieldB:Value2C > MetricA',
          type: 'series',
        },{
          data: [[1000,10],[2000,18]],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueC > FieldB:Value2C > MetricB',
          type: 'series',
        },{
          data: [[1000,391],[2000,802]],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueC > FieldB:Value2A > MetricA',
          type: 'series',
        },{
          data: [[1000,4],[2000,4]],
          fit: 'nearest',
          label: 'q:QueryB > FieldA:ValueC > FieldB:Value2A > MetricB',
          type: 'series',
        }
      ]);
    });
  });

});
