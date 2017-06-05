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

  it('appends the basePath to root redirect', function (done) {
    const options = {
      url: '/',
      method: 'GET'
    };
    kbnTestServer.makeRequest(kbnServer, options, function (res) {
      try {
        expect(res.payload).to.match(/defaultRoute = '\/kibana\/app\/kibana'/);
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});
