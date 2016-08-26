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
          host: 'localhost:5601',
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

    it('sends the host header based on the elasticsearch.url rather than the Kibana client', function () {
      const get = sinon.stub();
      get.withArgs('elasticsearch.customHeaders').returns({});
      get.withArgs('elasticsearch.url').returns('http://example.com:1234');
      const server = { config: () => ({ get }) };

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('host', 'example.com:1234');
      });
    });

    it('sends custom headers if set', function () {
      const get = sinon.stub();
      get.withArgs('elasticsearch.customHeaders').returns({ foo: 'bar' });
      get.withArgs('elasticsearch.url').returns('http://example.com:1234');
      const server = { config: () => ({ get }) };

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('foo', 'bar');
      });
    });

    it('sends configured custom headers even if the same named header exists in request', function () {
      const get = sinon.stub();
      get.withArgs('elasticsearch.customHeaders').returns({'x-my-custom-header': 'asconfigured'});
      get.withArgs('elasticsearch.url').returns('http://example.com:1234');
      const server = { config: () => ({ get }) };

      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('x-my-custom-header', 'asconfigured');
      });
    });
  });
});
