import expect from 'expect.js';
import mapUri from '../map_uri';
import sinon from 'sinon';

describe('plugins/elasticsearch', function () {
  describe('lib/map_uri', function () {

    let request;

    beforeEach(function () {
      request = {
        path: '/elasticsearch/some/path',
        headers: {
          cookie: 'some_cookie_string',
          'accept-encoding': 'gzip, deflate',
          origin: 'https://localhost:5601',
          'content-type': 'application/json',
          'x-my-custom-header': '42',
          accept: 'application/json, text/plain, */*',
          authorization: '2343d322eda344390fdw42'
        }
      };
    });

    it('sends custom headers if set', function () {
      const get = sinon.stub();
      get.withArgs('elasticsearch.requestHeadersWhitelist').returns([]);
      get.withArgs('elasticsearch.customHeaders').returns({ foo: 'bar' });
      const server = { config: () => ({ get }) };

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('foo', 'bar');
      });
    });

    it('sends configured custom headers even if the same named header exists in request', function () {
      const get = sinon.stub();
      get.withArgs('elasticsearch.requestHeadersWhitelist').returns(['x-my-custom-header']);
      get.withArgs('elasticsearch.customHeaders').returns({'x-my-custom-header': 'asconfigured'});
      const server = { config: () => ({ get }) };

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('x-my-custom-header', 'asconfigured');
      });
    });

    it('only proxies the whitelisted request headers', function () {
      const get = sinon.stub();
      get.withArgs('elasticsearch.requestHeadersWhitelist').returns(['x-my-custom-HEADER', 'Authorization']);
      get.withArgs('elasticsearch.customHeaders').returns({});
      const server = { config: () => ({ get }) };

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('authorization');
        expect(upstreamHeaders).to.have.property('x-my-custom-header');
        expect(Object.keys(upstreamHeaders).length).to.be(2);
      });
    });

    it('proxies no headers if whitelist is set to []', function () {
      const get = sinon.stub();
      get.withArgs('elasticsearch.requestHeadersWhitelist').returns([]);
      get.withArgs('elasticsearch.customHeaders').returns({});
      const server = { config: () => ({ get }) };

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(Object.keys(upstreamHeaders).length).to.be(0);
      });
    });

    it('proxies no headers if whitelist is set to no value', function () {
      const get = sinon.stub();
      get.withArgs('elasticsearch.requestHeadersWhitelist').returns([ null ]); // This is how Joi returns it
      get.withArgs('elasticsearch.customHeaders').returns({});
      const server = { config: () => ({ get }) };

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(Object.keys(upstreamHeaders).length).to.be(0);
      });
    });

  });
});
