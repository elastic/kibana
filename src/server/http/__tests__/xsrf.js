import expect from 'expect.js';
import { fromNode as fn } from 'bluebird';
import { resolve } from 'path';

import KbnServer from '../../KbnServer';

const nonDestructiveMethods = ['GET'];
const destructiveMethods = ['POST', 'PUT', 'DELETE'];
const src = resolve.bind(null, __dirname, '../../../../src');

describe('xsrf request filter', function () {
  function inject(kbnServer, opts) {
    return fn(cb => {
      kbnServer.server.inject(opts, (resp) => {
        cb(null, resp);
      });
    });
  }

  const makeServer = async function (token) {
    const kbnServer = new KbnServer({
      server: { autoListen: false, xsrf: { token } },
      plugins: { scanDirs: [src('plugins')] },
      logging: { quiet: true },
      optimize: { enabled: false },
      elasticsearch: {
        url: 'http://localhost:9210'
      }
    });

    await kbnServer.ready();

    kbnServer.server.route({
      path: '/xsrf/test/route',
      method: [...nonDestructiveMethods, ...destructiveMethods],
      handler: function (req, reply) {
        reply(null, 'ok');
      }
    });

    return kbnServer;
  };

  describe('issuing tokens', function () {
    const token = 'secur3';
    let kbnServer;
    beforeEach(async () => kbnServer = await makeServer(token));
    afterEach(async () => await kbnServer.close());

    it('sends a token when rendering an app', async function () {
      var resp = await inject(kbnServer, {
        method: 'GET',
        url: '/app/kibana',
      });

      expect(resp.payload).to.contain(`"xsrfToken":"${token}"`);
    });
  });

  context('without configured token', function () {
    let kbnServer;
    beforeEach(async () => kbnServer = await makeServer());
    afterEach(async () => await kbnServer.close());

    it('responds with a random token', async function () {
      var resp = await inject(kbnServer, {
        method: 'GET',
        url: '/app/kibana',
      });

      expect(resp.payload).to.match(/"xsrfToken":".{64}"/);
    });
  });

  context('with configured token', function () {
    const token = 'mytoken';
    let kbnServer;
    beforeEach(async () => kbnServer = await makeServer(token));
    afterEach(async () => await kbnServer.close());

    for (const method of nonDestructiveMethods) {
      context(`nonDestructiveMethod: ${method}`, function () { // eslint-disable-line no-loop-func
        it('accepts requests without a token', async function () {
          const resp = await inject(kbnServer, {
            url: '/xsrf/test/route',
            method: method
          });

          expect(resp.statusCode).to.be(200);
          expect(resp.payload).to.be('ok');
        });

        it('ignores invalid tokens', async function () {
          const resp = await inject(kbnServer, {
            url: '/xsrf/test/route',
            method: method,
            headers: {
              'kbn-xsrf-token': `invalid:${token}`,
            },
          });

          expect(resp.statusCode).to.be(200);
          expect(resp.headers).to.not.have.property('kbn-xsrf-token');
        });
      });
    }

    for (const method of destructiveMethods) {
      context(`destructiveMethod: ${method}`, function () { // eslint-disable-line no-loop-func
        it('accepts requests with the correct token', async function () {
          const resp = await inject(kbnServer, {
            url: '/xsrf/test/route',
            method: method,
            headers: {
              'kbn-xsrf-token': token,
            },
          });

          expect(resp.statusCode).to.be(200);
          expect(resp.payload).to.be('ok');
        });

        it('rejects requests without a token', async function () {
          const resp = await inject(kbnServer, {
            url: '/xsrf/test/route',
            method: method
          });

          expect(resp.statusCode).to.be(403);
          expect(resp.payload).to.match(/"Missing XSRF token"/);
        });

        it('rejects requests with an invalid token', async function () {
          const resp = await inject(kbnServer, {
            url: '/xsrf/test/route',
            method: method,
            headers: {
              'kbn-xsrf-token': `invalid:${token}`,
            },
          });

          expect(resp.statusCode).to.be(403);
          expect(resp.payload).to.match(/"Invalid XSRF token"/);
        });
      });
    }
  });
});
