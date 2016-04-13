import expect from 'expect.js';
import mapUri from '../map_uri';

describe('plugins/elasticsearch', function () {
  describe('lib/map_uri', function () {

    let server;
    let request;

    beforeEach(function () {
      server = {
        config() {
          return {
            get() {
              return 'http://foobar:9200';
            }
          };
        }
      };

      request = {
        path: '/elasticsearch/some/path',
        headers: {
          cookie: 'some_cookie_string',
          'accept-encoding': 'gzip, deflate',
          origin: 'https://localhost:5601',
          'content-type': 'application/json',
          accept: 'application/json, text/plain, */*'
        }
      };
    });

    it ('filters out the origin header from the client', function () {
      mapUri(server)(request, function (err, upstreamUri, upstreamHeaders) {
        expect(err).to.be(null);
        expect(upstreamHeaders).not.to.have.property('origin');
        expect(Object.keys(upstreamHeaders).length).to.be(4);
      });
    });
  });
});
