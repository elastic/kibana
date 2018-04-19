import expect from 'expect.js';
import { TabifyBuckets } from '../_buckets';

describe('Buckets wrapper', function () {

  function test(aggResp, count, keys) {
    it('reads the length', function () {
      const buckets = new TabifyBuckets(aggResp);
      expect(buckets).to.have.length(count);
    });

    it('itterates properly, passing in the key', function () {
      const buckets = new TabifyBuckets(aggResp);
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

  describe('with single bucket aggregations (filter)', function () {
    it('creates single bucket from agg content', function () {
      const aggResp = {
        single_bucket: {},
        doc_count: 5
      };
      const buckets = new TabifyBuckets(aggResp);
      expect(buckets).to.have.length(1);
    });
  });
});
