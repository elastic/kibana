const filename = require('path').basename(__filename);
import es from '../es';

import tlConfigFn from './fixtures/tlConfig';
import * as aggResponse from '../es/lib/agg_response_to_series_list';
import buildRequest from '../es/lib/build_request';
import createDateAgg from '../es/lib/create_date_agg';

import Promise from 'bluebird';
import _ from 'lodash';
import {expect} from 'chai';
import invoke from './helpers/invoke_series_fn.js';

function stubResponse(response) {
  return {
    server: {plugins:{
      elasticsearch: {
        callWithRequest: function () {
          return Promise.resolve(response);
        }
      }
    }}
  };
}

describe(filename, () => {
  var tlConfig;

  describe('Missing indices', () => {
    beforeEach(() => {
      tlConfig = stubResponse({
        _shards: {total: 0}
      });
    });

    it('should throw an error', () => {
      return invoke(es, [5], tlConfig)
      .then(expect.fail)
      .catch((e) => {
        expect(e).to.be.an('error');
      });
    });
  });


  describe('createDateAgg', () => {
    const createDateAgg = require('../es/lib/create_date_agg');
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
        expect(agg.time_buckets.aggs['sum(beer)']).to.eql({sum: {field: 'beer'}});
        expect(agg.time_buckets.aggs['avg(bytes)']).to.eql({avg: {field: 'bytes'}});
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
          request: {payload: {extended: {es: {filters:[
            {query: {query_string: {query: 'foo'}}, meta: {negate: false}},
            {query: {query_string: {query: 'foo'}}, meta: {negate: true}},
          ]}}}}
        });
      });

      it('push any filters supplied in payload.extended.es.filters into the bool', () => {
        config.kibana = true;
        let request = fn(config, tlConfig);
        let must = request.body.query.bool.must;
        let mustNot = request.body.query.bool.must_not;
        expect(must.length).to.eql(2);
        expect(mustNot.length).to.eql(1);
      });

      it('does not include filters if config.kibana = false', () => {
        config.kibana = false;
        let request = fn(config, tlConfig);
        let must = request.body.query.bool.must;
        let mustNot = request.body.query.bool.must_not;
        expect(must.length).to.eql(1);
        expect(mustNot.length).to.eql(0);
      });

      it('adds a time filter to the bool query first', () => {
        let request = fn(config, tlConfig);
        expect(request.body.query.bool.must.length).to.eql(1);
        expect(request.body.query.bool.must[0]).to.eql({range: {'@timestamp': {
          lte: 5,
          gte: 1,
          format: 'epoch_millis'
        }}});

        config.kibana = true;
        request = fn(config, tlConfig);
        expect(request.body.query.bool.must.length).to.eql(2);
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
      config = {fit: 'nearest'};
    });

    it('should throw an error', () => {
      const aggs = {
        q: {
          meta: {type: 'split'},
          buckets: {
            '*': {
              time_buckets: {
                meta: {type: 'time_buckets'},
                buckets: [
                  {
                    key: 1,
                    count: {value: 3}
                  },
                  {
                    key: 2,
                    count: {value: 14}
                  }
                ]
              }
            }
          }
        }
      };
      //expect(aggResponse.default(aggs, config)).to.eql([]);
    });
  });

});
