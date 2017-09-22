import sinon from 'sinon';
import Chance from 'chance';

import * as getExistingConfigNS from '../get_existing_config';
import * as getUpgradeableConfigNS from '../get_upgradeable_config';
import { ensureConfigExists } from '../ensure_config_exists';

const chance = new Chance();

describe('savedObjects/healthCheck/ensureConfigExists', function () {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.restore());

  const version = '4.0.1';
  const prevVersion = '4.0.0';
  const buildNum = chance.integer({ min: 1000, max: 5000 });

  function setup() {
    const log = sinon.stub();
    const getExistingConfig = sandbox.stub(getExistingConfigNS, 'getExistingConfig');
    const getUpgradeableConfig = sandbox.stub(getUpgradeableConfigNS, 'getUpgradeableConfig');
    const savedObjectsClient = {
      create: sinon.spy(async (type, attributes, options = {}) => ({
        type,
        id: options.id,
        version: 1,
      }))
    };

    async function run() {
      const resp = await ensureConfigExists({
        savedObjectsClient,
        version,
        buildNum,
        log,
      });

      if (getExistingConfig.callCount) {
        sinon.assert.alwaysCalledWith(getExistingConfig, { savedObjectsClient, version });
      }

      if (getUpgradeableConfig.callCount) {
        sinon.assert.alwaysCalledWith(getUpgradeableConfig, { savedObjectsClient, version });
      }

      return resp;
    }

    return {
      buildNum,
      log,
      run,
      version,
      savedObjectsClient,
      getExistingConfig,
      getUpgradeableConfig,
    };
  }

  describe('nothing is found', function () {
    it('should create config with current version and buildNum', async () => {
      const { run, savedObjectsClient } = setup();

      await run();

      sinon.assert.calledOnce(savedObjectsClient.create);
      sinon.assert.calledWithExactly(savedObjectsClient.create, 'config', {
        buildNum,
      }, {
        id: version
      });
    });
  });

  describe('current version is found', () => {
    it('should not create', async () => {
      const {
        run,
        getUpgradeableConfig,
        getExistingConfig,
        savedObjectsClient
      } = setup();

      getExistingConfig
        .returns({ id: version, attributes: { buildNum } });

      await run();
      sinon.assert.calledOnce(getExistingConfig);
      sinon.assert.notCalled(getUpgradeableConfig);
      sinon.assert.notCalled(savedObjectsClient.create);
    });
  });

  describe('something is upgradeable', () => {
    it('should merge upgraded attributes with current build number in new config', async () => {
      const {
        run,
        getUpgradeableConfig,
        getExistingConfig,
        savedObjectsClient
      } = setup();

      const savedAttributes = {
        buildNum: buildNum - 100,
        [chance.word()]: chance.sentence(),
        [chance.word()]: chance.sentence(),
        [chance.word()]: chance.sentence()
      };

      getUpgradeableConfig
        .returns({ id: prevVersion, attributes: savedAttributes });

      await run();

      sinon.assert.calledOnce(getExistingConfig);
      sinon.assert.calledOnce(getUpgradeableConfig);
      sinon.assert.calledOnce(savedObjectsClient.create);
      sinon.assert.calledWithExactly(savedObjectsClient.create,
        'config',
        {
          ...savedAttributes,
          buildNum,
        },
        {
          id: version,
        }
      );
    });

    it('should log a message for upgrades', async () => {
      const { getUpgradeableConfig, log, run } = setup();

      getUpgradeableConfig
        .returns({ id: prevVersion, attributes: { buildNum: buildNum - 100 } });

      await run();
      sinon.assert.calledOnce(log);
      sinon.assert.calledWithExactly(log,
        ['plugin', 'elasticsearch'],
        sinon.match({
          tmpl: sinon.match('Upgrade'),
          prevVersion,
          newVersion: version,
        })
      );
    });
  });
});
