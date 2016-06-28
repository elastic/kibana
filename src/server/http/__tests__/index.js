import expect from 'expect.js';
import * as kbnTestServer from '../../../../test/utils/kbn_server';
import fromRoot from '../../../utils/from_root';

describe('routes', function () {
  this.slow(10000);
  this.timeout(60000);

  let kbnServer;
  beforeEach(function () {
    kbnServer = kbnTestServer.createServer({
      plugins: {
        scanDirs: [
          fromRoot('src/core_plugins')
        ]
      }
    });
    return kbnServer.ready();
  });
  afterEach(function () {
    return kbnServer.close();
  });

  describe('cookie validation', function () {
    it('allows non-strict cookies', function (done) {
      const options = {
        method: 'GET',
        url: '/',
        headers: {
          cookie: 'test:80=value;test_80=value'
        }
      };
      kbnTestServer.makeRequest(kbnServer, options, (res) => {
        expect(res.payload).not.to.contain('Invalid cookie header');
        done();
      });
    });

    it('returns an error if the cookie can\'t be parsed', function (done) {
      const options = {
        method: 'GET',
        url: '/',
        headers: {
          cookie: 'a'
        }
      };
      kbnTestServer.makeRequest(kbnServer, options, (res) =>  {
        expect(res.payload).to.contain('Invalid cookie header');
        done();
      });
    });
  });

  describe('url shortener', () => {
    const shortenOptions = {
      method: 'POST',
      url: '/shorten',
      payload: {
        url: '/app/kibana#/visualize/create'
      }
    };

    it('generates shortened urls', (done) => {
      kbnTestServer.makeRequest(kbnServer, shortenOptions, (res) => {
        expect(typeof res.payload).to.be('string');
        expect(res.payload.length > 0).to.be(true);
        done();
      });
    });

    it('redirects shortened urls', (done) => {
      kbnTestServer.makeRequest(kbnServer, shortenOptions, (res) => {
        const gotoOptions = {
          method: 'GET',
          url: '/goto/' + res.payload
        };
        kbnTestServer.makeRequest(kbnServer, gotoOptions, (res) => {
          expect(res.statusCode).to.be(302);
          expect(res.headers.location).to.be(shortenOptions.payload.url);
          done();
        });
      });
    });

  });

});
