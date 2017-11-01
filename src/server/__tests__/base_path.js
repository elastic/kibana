import expect from 'expect.js';

import * as kbnTestServer from '../../test_utils/kbn_server';
const basePath = '/kibana';

describe('Server basePath config', function () {
  this.slow(10000);
  this.timeout(60000);

  let kbnServer;
  before(async function () {
    kbnServer = kbnTestServer.createServer({
      server: { basePath }
    });
    await kbnServer.ready();
    return kbnServer;
  });

  after(async function () {
    await kbnServer.close();
  });

  it('includes the basePath in root redirect', async () => {
    const resp = await kbnServer.inject({
      url: '/',
      method: 'GET'
    });

    expect(resp).to.have.property('statusCode', 302);
    expect(resp.headers).to.have.property('location', `${basePath}/app/kibana`);
  });
});
