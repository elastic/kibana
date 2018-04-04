import * as kbnTestServer from '../test_utils/kbn_server';
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

  it('appends the basePath to root redirect', function (done) {
    const options = {
      url: '/',
      method: 'GET'
    };
    kbnTestServer.makeRequest(kbnServer, options, function (res) {
      try {
        expect(res.payload).toMatch(/defaultRoute = '\/kibana\/app\/kibana'/);
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});
