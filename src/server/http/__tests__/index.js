import expect from 'expect.js';
import KbnServer from '../../KbnServer';
import requirefrom from 'requirefrom';

describe('routes', function () {
  this.slow(10000);
  this.timeout(60000);

  const fromRoot = requirefrom('src/utils')('fromRoot');
  let kbnServer;

  beforeEach(function () {
    kbnServer = new KbnServer({
      server: {
        autoListen: false,
        xsrf: {
          disableProtection: true
        }
      },
      plugins: { scanDirs: [ fromRoot('src/plugins') ] },
      logging: { quiet: true },
      optimize: { enabled: false },
      elasticsearch: {
        url: 'http://localhost:9210'
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
      kbnServer.server.inject(options, (res) => {
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
      kbnServer.server.inject(options, (res) =>  {
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
      kbnServer.server.inject(shortenOptions, (res) => {
        expect(typeof res.payload).to.be('string');
        expect(res.payload.length > 0).to.be(true);
        done();
      });
    });

    it('redirects shortened urls', (done) => {
      kbnServer.server.inject(shortenOptions, (res) => {
        const gotoOptions = {
          method: 'GET',
          url: '/goto/' + res.payload
        };
        kbnServer.server.inject(gotoOptions, (res) => {
          expect(res.statusCode).to.be(302);
          expect(res.headers.location).to.be(shortenOptions.payload.url);
          done();
        });
      });
    });

  });

});
