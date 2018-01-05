import expect from 'expect.js';
import * as kbnTestServer from '../../../test_utils/kbn_server';
import { createEsTestCluster } from '../../../test_utils/es';

describe('routes', () => {
  let kbnServer;
  const es = createEsTestCluster({
    name: 'server/http',
  });

  before(async function () {
    this.timeout(es.getStartTimeout());
    await es.start();
    kbnServer = kbnTestServer.createServerWithCorePlugins();
    await kbnServer.ready();
    await kbnServer.server.plugins.elasticsearch.waitUntilReady();
  });

  after(async () => {
    await kbnServer.close();
    await es.stop();
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
      kbnTestServer.makeRequest(kbnServer, options, (res) => {
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
      kbnTestServer.makeRequest(kbnServer, options, (res) =>  {
        expect(res.payload).to.contain('Invalid cookie header');
        done();
      });
    });
  });
});
