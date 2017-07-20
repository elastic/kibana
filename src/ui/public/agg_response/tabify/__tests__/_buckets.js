import expect from 'expect.js';
import ngMock from 'ng_mock';
import { AggResponseBucketsProvider } from 'ui/agg_response/tabify/_buckets';

describe('Buckets wrapper', function () {
  let Buckets;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Buckets = Private(AggResponseBucketsProvider);
  }));


  function test(aggResp, count, keys) {
    it('reads the length', function () {
      const buckets = new Buckets(aggResp);
      expect(buckets).to.have.length(count);
    });

    it('itterates properly, passing in the key', function () {
      const buckets = new Buckets(aggResp);
      const keysSent = [];
      buckets.forEach(function (bucket, key) {
        keysSent.push(key);
      });

      expect(keysSent).to.have.length(count);
      expect(keysSent).to.eql(keys);
    });
  }

  describe('with object style buckets', function () {
    const aggResp = {
      buckets: {
        '0-100': {},
        '100-200': {},
        '200-300': {}
      }
    };

    const count = 3;
    const keys = ['0-100', '100-200', '200-300'];

    test(aggResp, count, keys);
  });

  describe('with array style buckets', function () {
    const aggResp = {
      buckets: [
        { key: '0-100', value: {} },
        { key: '100-200', value: {} },
        { key: '200-300', value: {} }
      ]
    };

    const count = 3;
    const keys = ['0-100', '100-200', '200-300'];

    test(aggResp, count, keys);
  });
});
