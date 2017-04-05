import expect from 'expect.js';
import { fromNode as fn } from 'bluebird';
import { resolve } from 'path';
import * as kbnTestServer from '../../../../test/utils/kbn_server';

const nonDestructiveMethods = ['GET', 'HEAD'];
const destructiveMethods = ['POST', 'PUT', 'DELETE'];
const src = resolve.bind(null, __dirname, '../../../../src');

const xsrfHeader = 'kbn-xsrf';
const versionHeader = 'kbn-version';
const actualVersion = require(src('../package.json')).version;

describe('xsrf request filter', function () {
  function inject(kbnServer, opts) {
    return fn(cb => {
      kbnTestServer.makeRequest(kbnServer, opts, (resp) => {
        cb(null, resp);
      });
    });
  }

  const makeServer = async function () {
    const kbnServer = kbnTestServer.createServer({
      server: {
        xsrf: { disableProtection: false }
      }
    });

    await kbnServer.ready();

    const routeMethods = nonDestructiveMethods.filter(method => method !== 'HEAD').concat(destructiveMethods);
    kbnServer.server.route({
      path: '/xsrf/test/route',
      method: routeMethods,
      handler: function (req, reply) {
        reply(null, 'ok');
      }
    });

    return kbnServer;
  };

  let kbnServer;
  beforeEach(async () => kbnServer = await makeServer());
  afterEach(async () => await kbnServer.close());

  for (const method of nonDestructiveMethods) {
    describe(`nonDestructiveMethod: ${method}`, function () { // eslint-disable-line no-loop-func
      it('accepts requests without a token', async function () {
        const resp = await inject(kbnServer, {
          url: '/xsrf/test/route',
          method: method
        });

        expect(resp.statusCode).to.be(200);
        if (method === 'HEAD') expect(resp.payload).to.be.empty();
        else expect(resp.payload).to.be('ok');
      });

      it('accepts requests with the xsrf header', async function () {
        const resp = await inject(kbnServer, {
          url: '/xsrf/test/route',
          method: method,
          headers: {
            [xsrfHeader]: 'anything',
          },
        });

        expect(resp.statusCode).to.be(200);
        if (method === 'HEAD') expect(resp.payload).to.be.empty();
        else expect(resp.payload).to.be('ok');
      });
    });
  }

  for (const method of destructiveMethods) {
    describe(`destructiveMethod: ${method}`, function () { // eslint-disable-line no-loop-func
      it('accepts requests with the xsrf header', async function () {
        const resp = await inject(kbnServer, {
          url: '/xsrf/test/route',
          method: method,
          headers: {
            [xsrfHeader]: 'anything',
          },
        });

        expect(resp.statusCode).to.be(200);
        expect(resp.payload).to.be('ok');
      });

      // this is still valid for existing csrf protection support
      // it does not actually do any validation on the version value itself
      it('accepts requests with the version header', async function () {
        const resp = await inject(kbnServer, {
          url: '/xsrf/test/route',
          method: method,
          headers: {
            [versionHeader]: actualVersion,
          },
        });

        expect(resp.statusCode).to.be(200);
        expect(resp.payload).to.be('ok');
      });

      it('rejects requests without either an xsrf or version header', async function () {
        const resp = await inject(kbnServer, {
          url: '/xsrf/test/route',
          method: method
        });

        expect(resp.statusCode).to.be(400);
        expect(resp.payload).to.match(/"Request must contain an kbn-xsrf header/);
      });
    });
  }
});
