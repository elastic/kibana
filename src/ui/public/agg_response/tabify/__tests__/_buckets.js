describe('Buckets wrapper', function () {
  let Buckets;
  let expect = require('expect.js');
  let ngMock = require('ngMock');

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    Buckets = Private(require('ui/agg_response/tabify/_buckets'));
  }));


  function test(aggResp, count, keys) {
    it('reads the length', function () {
      let buckets = new Buckets(aggResp);
      expect(buckets).to.have.length(count);
    });

    it('itterates properly, passing in the key', function () {
      let buckets = new Buckets(aggResp);
      let keysSent = [];
      buckets.forEach(function (bucket, key) {
        keysSent.push(key);
      });

      expect(keysSent).to.have.length(count);
      expect(keysSent).to.eql(keys);
    });
  }

  describe('with object style buckets', function () {
    let aggResp = {
      buckets: {
        '0-100': {},
        '100-200': {},
        '200-300': {}
      }
    };

    let count = 3;
    let keys = ['0-100', '100-200', '200-300'];

    test(aggResp, count, keys);
  });

  describe('with array style buckets', function () {
    let aggResp = {
      buckets: [
        { key: '0-100', value: {} },
        { key: '100-200', value: {} },
        { key: '200-300', value: {} }
      ]
    };

    let count = 3;
    let keys = ['0-100', '100-200', '200-300'];

    test(aggResp, count, keys);
  });
});
