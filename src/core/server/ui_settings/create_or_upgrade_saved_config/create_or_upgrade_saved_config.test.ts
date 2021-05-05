/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Chance from 'chance';

import { getUpgradeableConfigMock } from './get_upgradeable_config.test.mock';
import { SavedObjectsErrorHelpers } from '../../saved_objects';
import { savedObjectsClientMock } from '../../saved_objects/service/saved_objects_client.mock';
import { loggingSystemMock } from '../../logging/logging_system.mock';

import { createOrUpgradeSavedConfig } from './create_or_upgrade_saved_config';

const chance = new Chance();
describe('uiSettings/createOrUpgradeSavedConfig', function () {
  afterEach(() => jest.resetAllMocks());

  const version = '4.0.1';
  const prevVersion = '4.0.0';
  const buildNum = chance.integer({ min: 1000, max: 5000 });

  function setup() {
    const logger = loggingSystemMock.create();
    const getUpgradeableConfig = getUpgradeableConfigMock;
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.create.mockImplementation(
      async (type, attributes, options = {}) =>
        ({
          type,
          id: options.id,
          version: 'foo',
        } as any)
    );

    async function run(options = {}) {
      const resp = await createOrUpgradeSavedConfig({
        savedObjectsClient,
        version,
        buildNum,
        log: logger.get(),
        handleWriteErrors: false,
        ...options,
      });

      expect(getUpgradeableConfigMock).toHaveBeenCalledTimes(1);
      expect(getUpgradeableConfig).toHaveBeenCalledWith({ savedObjectsClient, version });

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

  describe('nothing is upgradeable', function () {
    it('should create config with current version and buildNum', async () => {
      const { run, savedObjectsClient } = setup();

      await run();

      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.create).toHaveBeenCalledWith(
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

      getUpgradeableConfig.mockResolvedValue({
        id: prevVersion,
        attributes: savedAttributes,
        type: '',
        references: [],
      });

      await run();

      expect(getUpgradeableConfig).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.create).toHaveBeenCalledWith(
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

      getUpgradeableConfig.mockResolvedValue({
        id: prevVersion,
        attributes: { buildNum: buildNum - 100 },
        type: '',
        references: [],
      });

      await run();
      expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
        Array [
          Array [
            "Upgrade config from 4.0.0 to 4.0.1",
            Object {
              "kibana": Object {
                "config": Object {
                  "newVersion": "4.0.1",
                  "prevVersion": "4.0.0",
                },
              },
            },
          ],
        ]
      `);
    });

    it('does not log when upgrade fails', async () => {
      const { getUpgradeableConfig, logger, run, savedObjectsClient } = setup();

      getUpgradeableConfig.mockResolvedValue({
        id: prevVersion,
        attributes: { buildNum: buildNum - 100 },
        type: '',
        references: [],
      });

      savedObjectsClient.create.mockRejectedValue(new Error('foo'));

      try {
        await run();
        throw new Error('Expected run() to throw an error');
      } catch (error) {
        expect(error.message).toBe('foo');
      }

      expect(loggingSystemMock.collect(logger).debug).toHaveLength(0);
    });
  });

  describe('handleWriteErrors', () => {
    describe('handleWriteErrors: false', () => {
      it('throws write errors', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.mockRejectedValue(error);

        await expect(run({ handleWriteErrors: false })).rejects.toThrowError(error);
      });
    });
    describe('handleWriteErrors:true', () => {
      it('returns undefined for ConflictError', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.mockRejectedValue(
          SavedObjectsErrorHelpers.decorateConflictError(error)
        );

        expect(await run({ handleWriteErrors: true })).toBe(undefined);
      });

      it('returns config attributes for NotAuthorizedError', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.mockRejectedValue(
          SavedObjectsErrorHelpers.decorateNotAuthorizedError(error)
        );

        expect(await run({ handleWriteErrors: true })).toEqual({
          buildNum,
        });
      });

      it('returns config attributes for ForbiddenError', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.mockRejectedValue(
          SavedObjectsErrorHelpers.decorateForbiddenError(error)
        );

        expect(await run({ handleWriteErrors: true })).toEqual({
          buildNum,
        });
      });

      it('throws error for other SavedObjects exceptions', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.mockRejectedValue(
          SavedObjectsErrorHelpers.decorateGeneralError(error)
        );

        await expect(run({ handleWriteErrors: true })).rejects.toThrowError(error);
      });

      it('throws error for all other exceptions', async () => {
        const { run, savedObjectsClient } = setup();
        const error = new Error('foo');
        savedObjectsClient.create.mockRejectedValue(error);

        await expect(run({ handleWriteErrors: true })).rejects.toThrowError(error);
      });
    });
  });
});
