import expect from 'expect.js';
import { fromNode as fn } from 'bluebird';
import { resolve } from 'path';

const requireFromTest = require('requirefrom')('test');
const kbnTestServer = requireFromTest('utils/kbn_server');

const nonDestructiveMethods = ['GET', 'HEAD'];
const destructiveMethods = ['POST', 'PUT', 'DELETE'];
const src = resolve.bind(null, __dirname, '../../../../src');

const xsrfHeader = 'kbn-version';
const version = require(src('../package.json')).version;

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
    context(`nonDestructiveMethod: ${method}`, function () { // eslint-disable-line no-loop-func
      it('accepts requests without a token', async function () {
        const resp = await inject(kbnServer, {
          url: '/xsrf/test/route',
          method: method
        });

        expect(resp.statusCode).to.be(200);
        if (method === 'HEAD') expect(resp.payload).to.be.empty();
        else expect(resp.payload).to.be('ok');
      });

      it('failes on invalid tokens', async function () {
        const resp = await inject(kbnServer, {
          url: '/xsrf/test/route',
          method: method,
          headers: {
            [xsrfHeader]: `invalid:${version}`,
          },
        });

        expect(resp.statusCode).to.be(400);
        expect(resp.headers).to.have.property(xsrfHeader, version);
        if (method === 'HEAD') expect(resp.payload).to.be.empty();
        else expect(resp.payload).to.match(/"Browser client is out of date/);
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
            [xsrfHeader]: version,
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

        expect(resp.statusCode).to.be(400);
        expect(resp.payload).to.match(/"Missing kbn-version header/);
      });

      it('rejects requests with an invalid token', async function () {
        const resp = await inject(kbnServer, {
          url: '/xsrf/test/route',
          method: method,
          headers: {
            [xsrfHeader]: `invalid:${version}`,
          },
        });

        expect(resp.statusCode).to.be(400);
        expect(resp.payload).to.match(/"Browser client is out of date/);
      });
    });
  }
});
