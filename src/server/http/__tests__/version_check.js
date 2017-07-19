import expect from 'expect.js';
import { fromNode } from 'bluebird';
import { resolve } from 'path';
import * as kbnTestServer from '../../../test_utils/kbn_server';

const src = resolve.bind(null, __dirname, '../../../../src');

const versionHeader = 'kbn-version';
const version = require(src('../package.json')).version;

describe('version_check request filter', function () {
  function makeRequest(kbnServer, opts) {
    return fromNode(cb => {
      kbnTestServer.makeRequest(kbnServer, opts, (resp) => {
        cb(null, resp);
      });
    });
  }

  async function makeServer() {
    const kbnServer = kbnTestServer.createServer();

    await kbnServer.ready();

    kbnServer.server.route({
      path: '/version_check/test/route',
      method: 'GET',
      handler: function (req, reply) {
        reply(null, 'ok');
      }
    });

    return kbnServer;
  }

  let kbnServer;
  beforeEach(async () => kbnServer = await makeServer());
  afterEach(async () => await kbnServer.close());

  it('accepts requests with the correct version passed in the version header', async function () {
    const resp = await makeRequest(kbnServer, {
      url: '/version_check/test/route',
      method: 'GET',
      headers: {
        [versionHeader]: version,
      },
    });

    expect(resp.statusCode).to.be(200);
    expect(resp.payload).to.be('ok');
  });

  it('rejects requests with an incorrect version passed in the version header', async function () {
    const resp = await makeRequest(kbnServer, {
      url: '/version_check/test/route',
      method: 'GET',
      headers: {
        [versionHeader]: `invalid:${version}`,
      },
    });

    expect(resp.statusCode).to.be(400);
    expect(resp.headers).to.have.property(versionHeader, version);
    expect(resp.payload).to.match(/"Browser client is out of date/);
  });

  it('accepts requests that do not include a version header', async function () {
    const resp = await makeRequest(kbnServer, {
      url: '/version_check/test/route',
      method: 'GET'
    });

    expect(resp.statusCode).to.be(200);
    expect(resp.payload).to.be('ok');
  });
});
