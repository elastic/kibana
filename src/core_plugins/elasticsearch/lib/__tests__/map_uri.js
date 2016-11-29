import expect from 'expect.js';
import mapUri from '../map_uri';
import { get, defaults } from 'lodash';
import sinon from 'sinon';

describe('plugins/elasticsearch', function () {
  describe('lib/map_uri', function () {

    let request;

    function stubServer(settings) {
      const values = defaults(settings || {}, {
        'elasticsearch.url': 'http://localhost:9200',
        'elasticsearch.requestHeadersWhitelist': ['authorization'],
        'elasticsearch.customHeaders': {}
      });
      const config = { get: (key, def) => get(values, key, def) };
      return { config: () => config };
    }

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
      const server = stubServer({
        'elasticsearch.customHeaders': { foo: 'bar' }
      });

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('foo', 'bar');
      });
    });

    it('sends configured custom headers even if the same named header exists in request', function () {
      const server = stubServer({
        'elasticsearch.requestHeadersWhitelist': ['x-my-custom-header'],
        'elasticsearch.customHeaders': {'x-my-custom-header': 'asconfigured'}
      });

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('x-my-custom-header', 'asconfigured');
      });
    });

    it('only proxies the whitelisted request headers', function () {
      const server = stubServer({
        'elasticsearch.requestHeadersWhitelist': ['x-my-custom-HEADER', 'Authorization'],
      });

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('authorization');
        expect(upstreamHeaders).to.have.property('x-my-custom-header');
        expect(Object.keys(upstreamHeaders).length).to.be(2);
      });
    });

    it('proxies no headers if whitelist is set to []', function () {
      const server = stubServer({
        'elasticsearch.requestHeadersWhitelist': [],
      });

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(Object.keys(upstreamHeaders).length).to.be(0);
      });
    });

    it('proxies no headers if whitelist is set to no value', function () {
      const server = stubServer({
        // joi converts `elasticsearch.requestHeadersWhitelist: null` into
        // an array with a null inside because of the `array().single()` rule.
        'elasticsearch.requestHeadersWhitelist': [ null ],
      });

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(Object.keys(upstreamHeaders).length).to.be(0);
      });
    });

    it('strips the /elasticsearch prefix from the path', () => {
      request.path = '/elasticsearch/es/path';
      const server = stubServer();

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamUri).to.be('http://localhost:9200/es/path');
      });
    });

    it('extends the es.url path', function () {
      request.path = '/elasticsearch/index/type';
      const server = stubServer({ 'elasticsearch.url': 'https://localhost:9200/base-path' });

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamUri).to.be('https://localhost:9200/base-path/index/type');
      });
    });

    it('extends the es.url query string', function () {
      request.path = '/elasticsearch/*';
      request.query = { foo: 'bar' };
      const server = stubServer({ 'elasticsearch.url': 'https://localhost:9200/?base=query' });

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamUri).to.be('https://localhost:9200/*?foo=bar&base=query');
      });
    });

    it('filters the _ querystring param', function () {
      request.path = '/elasticsearch/*';
      request.query = { _: Date.now() };
      const server = stubServer();

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamUri).to.be('http://localhost:9200/*');
      });
    });

  });
});
