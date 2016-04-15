import expect from 'expect.js';
import mapUri from '../map_uri';
import sinon from 'sinon';

describe('plugins/elasticsearch', function () {
  describe('lib/map_uri', function () {

    let server;
    let request;

    beforeEach(function () {
      const get = sinon.stub()
      .withArgs('elasticsearch.url').returns('http://foobar:9200')
      .withArgs('elasticsearch.requestHeadersWhitelist').returns(['x-my-custom-HEADER', 'Authorization']);
      const config = function () { return { get: get }; };
      server = {
        config: config
      };

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

    it('only keeps the whitelisted request headers', function () {
      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).to.have.property('authorization');
        expect(upstreamHeaders).to.have.property('x-my-custom-header');
        expect(Object.keys(upstreamHeaders).length).to.be(2);
      });
    });
  });
});
