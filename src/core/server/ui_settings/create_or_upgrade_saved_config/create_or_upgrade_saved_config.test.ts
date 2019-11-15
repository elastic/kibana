/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';
import Chance from 'chance';

import { SavedObjectsErrorHelpers } from '../../saved_objects';

import { loggingServiceMock } from '../../logging/logging_service.mock';
import * as getUpgradeableConfigNS from './get_upgradeable_config';
import { createOrUpgradeSavedConfig } from './create_or_upgrade_saved_config';

const chance = new Chance();
describe('uiSettings/createOrUpgradeSavedConfig', function() {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  const version = '4.0.1';
  const prevVersion = '4.0.0';
  const buildNum = chance.integer({ min: 1000, max: 5000 });

  function setup() {
    const logger = loggingServiceMock.create();
    const getUpgradeableConfig = sandbox.stub(getUpgradeableConfigNS, 'getUpgradeableConfig');
    const savedObjectsClient = {
      create: sinon.stub().callsFake(async (type, attributes, options = {}) => ({
        type,
        id: options.id,
        version: 'foo',
      })),
    } as any; // mute until we have savedObjects mocks

    async function run(options = {}) {
      const resp = await createOrUpgradeSavedConfig({
        savedObjectsClient,
        version,
        buildNum,
        log: logger.get(),
        handleWriteErrors: false,
        ...options,
      });

      sinon.assert.calledOnce(getUpgradeableConfig);
      sinon.assert.alwaysCalledWith(getUpgradeableConfig, { savedObjectsClient, version });

      return resp;
    }

    return {
      buildNum,
      logger,
      run,
      version,
      savedObjectsClient,
      getUpgradeableConfig,
    };
  }

  describe('nothing is upgradeable', function() {
    it('should create config with current version and buildNum', async () => {
      const { run, savedObjectsClient } = setup();

      await run();

      sinon.assert.calledOnce(savedObjectsClient.create);
      sinon.assert.calledWithExactly(
        savedObjectsClient.create,
        'config',
        {
          buildNum,
        },
        {
          id: version,
        }
      );
    });
  });

  describe('something is upgradeable', () => {
    it('should merge upgraded attributes with current build number in new config', async () => {
      const { run, getUpgradeableConfig, savedObjectsClient } = setup();

      const savedAttributes = {
        buildNum: buildNum - 100,
        [chance.word()]: chance.sentence(),
        [chance.word()]: chance.sentence(),
        [chance.word()]: chance.sentence(),
      };

      getUpgradeableConfig.resolves({
        id: prevVersion,
        attributes: savedAttributes,
        type: '',
        references: [],
      });

      await run();

      sinon.assert.calledOnce(getUpgradeableConfig);
      sinon.assert.calledOnce(savedObjectsClient.create);
      sinon.assert.calledWithExactly(
        savedObjectsClient.create,
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
      const { getUpgradeableConfig, logger, run } = setup();

      getUpgradeableConfig.resolves({
        id: prevVersion,
        attributes: { buildNum: buildNum - 100 },
        type: '',
        references: [],
      });

      await run();
      expect(loggingServiceMock.collect(logger).debug).toMatchInlineSnapshot(`
        Array [
          Array [
            "Upgrade config from 4.0.0 to 4.0.1",
            Object {
              "newVersion": "4.0.1",
              "prevVersion": "4.0.0",
            },
          ],
        ]
      `);
    });

    it('does not log when upgrade fails', async () => {
      const { getUpgradeableConfig, logger, run, savedObjectsClient } = setup();

      getUpgradeableConfig.resolves({
        id: prevVersion,
        attributes: { buildNum: buildNum - 100 },
        type: '',
        references: [],
      });

      savedObjectsClient.create.callsFake(async () => {
        throw new Error('foo');
      });

      try {
        await run();
        throw new Error('Expected run() to throw an error');
      } catch (error) {
        expect(error.message).toBe('foo');
      }

      expect(loggingServiceMock.collect(logger).debug).toHaveLength(0);
    });
  });

  describe('handleWriteErrors', () => {
    describe('handleWriteErrors: false', () => {
      it('throws write errors', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.callsFake(async () => {
          throw error;
        });

        await expect(run({ handleWriteErrors: false })).rejects.toThrowError(error);
      });
    });
    describe('handleWriteErrors:true', () => {
      it('returns undefined for ConflictError', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.throws(SavedObjectsErrorHelpers.decorateConflictError(error));

        expect(await run({ handleWriteErrors: true })).toBe(undefined);
      });

      it('returns config attributes for NotAuthorizedError', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.throws(
          SavedObjectsErrorHelpers.decorateNotAuthorizedError(error)
        );

        expect(await run({ handleWriteErrors: true })).toEqual({
          buildNum,
        });
      });

      it('returns config attributes for ForbiddenError', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.throws(SavedObjectsErrorHelpers.decorateForbiddenError(error));

        expect(await run({ handleWriteErrors: true })).toEqual({
          buildNum,
        });
      });

      it('throws error for other SavedObjects exceptions', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.throws(SavedObjectsErrorHelpers.decorateGeneralError(error));

        await expect(run({ handleWriteErrors: true })).rejects.toThrowError(error);
      });

      it('throws error for all other exceptions', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.throws(error);

        await expect(run({ handleWriteErrors: true })).rejects.toThrowError(error);
      });
    });
  });
});
