import expect from 'expect.js';
import sinon from 'sinon';
import * as kbnTestServer from '../../../../../test_utils/kbn_server.js';
import { fromRoot } from '../../../../../utils';
import manageUuid from '../manage_uuid';

describe('core_plugins/kibana/server/lib', function () {
  describe('manage_uuid', function () {
    const testUuid = 'c4add484-0cba-4e05-86fe-4baa112d9e53';
    let kbnServer;
    let config;

    before(async function () {
      this.timeout(60000); // sometimes waiting for server takes longer than 10

      kbnServer = kbnTestServer.createServer({
        plugins: {
          scanDirs: [
            fromRoot('src/core_plugins')
          ]
        }
      });

      await kbnServer.ready();
    });

    // clear uuid stuff from previous test runs
    beforeEach(function () {
      kbnServer.server.log = sinon.stub();
      kbnServer.server.log.reset();
      config = kbnServer.server.config();
    });

    after(async function () {
      await kbnServer.close();
    });

    it('ensure config uuid is validated as a guid', async function () {
      config.set('server.uuid', testUuid);
      expect(config.get('server.uuid')).to.be(testUuid);

      expect(() => {
        config.set('server.uuid', 'foouid');
      }).to.throwException((e) => {
        expect(e.name).to.be('ValidationError');
      });
    });

    it('finds the previously set uuid with config match', async function () {
      const msg = `Kibana instance UUID: ${testUuid}`;
      config.set('server.uuid', testUuid);

      await manageUuid(kbnServer.server);
      await manageUuid(kbnServer.server);

      expect(kbnServer.server.log.lastCall.args[1]).to.be.eql(msg);
    });

    it('updates the previously set uuid with config value', async function () {
      config.set('server.uuid', testUuid);

      await manageUuid(kbnServer.server);

      const newUuid = '5b2de169-2785-441b-ae8c-186a1936b17d';
      const msg = `Updating Kibana instance UUID to: ${newUuid} (was: ${testUuid})`;

      config.set('server.uuid', newUuid);
      await manageUuid(kbnServer.server);

      expect(kbnServer.server.log.lastCall.args[1]).to.be(msg);
    });

    it('resumes the uuid stored in data and sets it to the config', async function () {
      const partialMsg = 'Resuming persistent Kibana instance UUID';
      config.set('server.uuid'); // set to undefined

      await manageUuid(kbnServer.server);

      expect(config.get('server.uuid')).to.be.ok(); // not undefined any more
      expect(kbnServer.server.log.lastCall.args[1]).to.match(new RegExp(`^${partialMsg}`));
    });
  });
});
