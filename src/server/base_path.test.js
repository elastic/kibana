import * as kbnTestServer from '../../test_utils/kbn_server';
const basePath = '/kibana';

describe('Server basePath config', function () {
  let kbnServer;
  beforeAll(async function () {
    kbnServer = kbnTestServer.createServer({
      server: { basePath }
    });
    await kbnServer.ready();
    return kbnServer;
  });

  afterAll(async function () {
    await kbnServer.close();
  });

  it('includes the basePath in root redirect', async () => {
    const resp = await kbnServer.inject({
      url: '/',
      method: 'GET'
    });

    expect(resp).toHaveProperty('statusCode', 302);
    expect(resp.headers).toHaveProperty('location', `${basePath}/app/kibana`);
  });
});
