import sinon from 'sinon';
import Chance from 'chance';

import { ensureConfigExists } from '../ensure_config_exists';

const chance = new Chance();

describe('savedObjects/healthCheck/ensureConfigExists', function () {
  function setup(options = {}) {
    const {
      buildNum = chance.integer({ min: 1000, max: 5000 }),
      version = '4.0.1',
      savedConfigs = [],
    } = options;

    const savedObjectsClient = {
      create: sinon.spy(async (type, attributes, options = {}) => ({
        type,
        id: options.id,
        version: 1,
      })),
      find: sinon.spy(async () => ({
        saved_objects: savedConfigs
      }))
    };

    const log = sinon.stub();

    function run() {
      return ensureConfigExists({
        savedObjectsClient,
        version,
        buildNum,
        log,
      });
    }

    return {
      buildNum,
      log,
      run,
      savedObjectsClient,
      version,
    };
  }

  describe('nothing is found', function () {
    it('should create config with current version and buildNum', async () => {
      const { buildNum, run, savedObjectsClient, version } = setup();

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
      const { run, savedObjectsClient } = setup({
        savedConfigs: [
          {
            id: '4.0.1',
            attributes: {}
          }
        ]
      });

      await run();
      sinon.assert.notCalled(savedObjectsClient.create);
    });
  });

  describe('nothing is upgradeable', () => {
    it('should create new config with current version and buildNum', async () => {
      const { buildNum, run, savedObjectsClient, version } = setup({
        savedConfig: [
          { id: '4.0.1-alpha3' },
          { id: '4.0.1-beta1' },
          { id: '4.0.0-SNAPSHOT1' },
        ]
      });

      await run();

      sinon.assert.calledOnce(savedObjectsClient.create);
      sinon.assert.calledWithExactly(savedObjectsClient.create,
        'config',
        {
          buildNum
        },
        {
          id: version
        }
      );
    });
  });

  describe('something is upgradeable', () => {
    it('should merge upgraded attributes with current build number in new config', async () => {
      const buildNum = chance.integer({ min: 1000, max: 5000 });
      const savedBuildNum = buildNum - 100;
      const savedAttributes = {
        buildNum: savedBuildNum,
        [chance.word()]: chance.sentence(),
        [chance.word()]: chance.sentence(),
        [chance.word()]: chance.sentence(),
      };

      const { run, savedObjectsClient, version } = setup({
        buildNum,
        savedConfigs: [
          {
            id: '4.0.0',
            attributes: savedAttributes
          }
        ]
      });

      await run();

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
      const { log, run } = setup({
        buildNum: 2,
        version: '4.0.1',
        savedConfigs: [
          { id: '4.0.0', attributes: { buildNum: 1 } }
        ]
      });

      await run();
      sinon.assert.calledOnce(log);
      sinon.assert.calledWithExactly(log,
        ['plugin', 'elasticsearch'],
        sinon.match({
          tmpl: sinon.match('Upgrade'),
          prevVersion: '4.0.0',
          newVersion: '4.0.1',
        })
      );
    });
  });
});
