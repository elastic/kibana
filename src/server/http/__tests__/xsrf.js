import expect from 'expect.js';
import { fromNode as fn } from 'bluebird';

import KbnServer from '../../KbnServer';

const nonDestructiveMethods = ['GET'];
const destructiveMethods = ['POST', 'PUT', 'DELETE'];

describe('xsrf request filter', function () {
  async function makeServer(token) {
    const kbnServer = new KbnServer({
      server: { autoListen: false, xsrfToken: token },
      logging: { quiet: true },
      optimize: { enabled: false },
    });

    await kbnServer.ready();

    kbnServer.server.route({
      path: '/csrf/test/route',
      method: [...nonDestructiveMethods, ...destructiveMethods],
      handler: function (req, reply) {
        reply(null, 'ok');
      }
    });

    kbnServer.inject = function (opts) {
      return fn(cb => {
        kbnServer.server.inject(opts, (resp) => {
          cb(null, resp);
        });
      });
    };

    return kbnServer;
  }

  context('without configured token', function () {
    let kbnServer;
    beforeEach(async () => kbnServer = await makeServer());
    afterEach(async () => await kbnServer.close());

    it('responds with a random token', async function () {
      var resp = await kbnServer.inject({
        method: 'GET',
        url: '/csrf/test/route',
      });

      expect(resp.headers['set-cookie'][0]).to.match(/^XSRF-TOKEN=[^;]{512}; Path=\/$/);
    });
  });

  context('with configured token', function () {
    const token = 'mytoken';
    let kbnServer;
    beforeEach(async () => kbnServer = await makeServer(token));
    afterEach(async () => await kbnServer.close());

    for (const method of nonDestructiveMethods) {
      context(`nonDestructiveMethod: ${method}`, function () { // eslint-disable-line no-loop-func
        it('accepts requests without a token and sends it', async function () {
          const resp = await kbnServer.inject({
            url: '/csrf/test/route',
            method: method
          });

          expect(resp.statusCode).to.be(200);
          expect(resp.payload).to.be('ok');
        });

        it('responds with the token to requests without a token', async function () {
          const resp = await kbnServer.inject({
            url: '/csrf/test/route',
            method: method
          });

          expect(resp.headers['set-cookie']).to.eql([`XSRF-TOKEN=${token}; Path=/`]);
        });

        it('does not respond with the token to requests with a token', async function () {
          const resp = await kbnServer.inject({
            url: '/csrf/test/route',
            method: method,
            headers: {
              'X-XSRF-TOKEN': token,
            },
          });

          expect(resp.headers).to.not.have.property('set-cookie');
        });

        it('does not respond with the token to requests that already have token in cookie', async function () {
          const resp = await kbnServer.inject({
            url: '/csrf/test/route',
            method: method,
            headers: {
              'X-XSRF-TOKEN': token,
              'cookie': `XSRF-TOKEN=${token}`
            },
          });

          expect(resp.headers).to.not.have.property('set-cookie');
        });
      });
    }

    for (const method of destructiveMethods) {
      context(`destructiveMethod: ${method}`, function () { // eslint-disable-line no-loop-func
        it('rejects requests without a token', async function () {
          const resp = await kbnServer.inject({
            url: '/csrf/test/route',
            method: method
          });

          expect(resp.statusCode).to.be(403);
          expect(resp.payload).to.match(/"Missing XSRF token"/);
        });

        it('accepts requests with the correct token', async function () {
          const resp = await kbnServer.inject({
            url: '/csrf/test/route',
            method: method,
            headers: {
              'X-XSRF-TOKEN': token,
            },
          });

          expect(resp.statusCode).to.be(200);
          expect(resp.payload).to.be('ok');
        });

        it('rejects requests with an invalid token', async function () {
          const resp = await kbnServer.inject({
            url: '/csrf/test/route',
            method: method,
            headers: {
              'X-XSRF-TOKEN': `invalid:${token}`,
            },
          });

          expect(resp.statusCode).to.be(403);
          expect(resp.payload).to.match(/"Invalid XSRF token"/);
        });
      });
    }
  });
});
