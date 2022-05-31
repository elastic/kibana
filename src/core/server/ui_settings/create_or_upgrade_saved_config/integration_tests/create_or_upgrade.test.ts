/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '../../..';

import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
  TestUtils,
} from '../../../../test_helpers/kbn_server';
import { createOrUpgradeSavedConfig } from '../create_or_upgrade_saved_config';
import { loggingSystemMock } from '../../../logging/logging_system.mock';
import { httpServerMock } from '../../../http/http_server.mocks';

const logger = loggingSystemMock.create().get();
describe('createOrUpgradeSavedConfig()', () => {
  let savedObjectsClient: SavedObjectsClientContract;
  let servers: TestUtils;
  let esServer: TestElasticsearchUtils;
  let kbn: TestKibanaUtils;

  beforeAll(async function () {
    servers = createTestServers({
      adjustTimeout: (t) => {
        jest.setTimeout(t);
      },
    });
    esServer = await servers.startES();
    kbn = await servers.startKibana();

    savedObjectsClient = kbn.coreStart.savedObjects.getScopedClient(
      httpServerMock.createKibanaRequest()
    );

    await savedObjectsClient.bulkCreate([
      {
        id: '5.4.0-SNAPSHOT',
        type: 'config',
        attributes: {
          buildNum: 54090,
          '5.4.0-SNAPSHOT': true,
        },
      },
      {
        id: '5.4.0-rc1',
        type: 'config',
        attributes: {
          buildNum: 54010,
          '5.4.0-rc1': true,
        },
      },
      {
        id: '@@version',
        type: 'config',
        attributes: {
          buildNum: 99999,
          '@@version': true,
        },
      },
    ]);
  });

  afterAll(async () => {
    await esServer.stop();
    await kbn.stop();
  }, 30000);

  it('upgrades the previous version on each increment', async function () {
    // ------------------------------------
    // upgrade to 5.4.0
    await createOrUpgradeSavedConfig({
      savedObjectsClient,
      version: '5.4.0',
      buildNum: 54099,
      log: logger,
      handleWriteErrors: false,
    });

    const config540 = await savedObjectsClient.get('config', '5.4.0');
    expect(config540.attributes).toEqual({
      // should have the new build number
      buildNum: 54099,

      // 5.4.0-SNAPSHOT and @@version were ignored so we only have the
      // attributes from 5.4.0-rc1, even though the other build nums are greater
      '5.4.0-rc1': true,
    });

    // add the 5.4.0 flag to the 5.4.0 savedConfig
    await savedObjectsClient.update('config', '5.4.0', {
      '5.4.0': true,
    });

    // ------------------------------------
    // upgrade to 5.4.1
    await createOrUpgradeSavedConfig({
      savedObjectsClient,
      version: '5.4.1',
      buildNum: 54199,
      log: logger,
      handleWriteErrors: false,
    });

    const config541 = await savedObjectsClient.get('config', '5.4.1');
    expect(config541.attributes).toEqual({
      // should have the new build number
      buildNum: 54199,

      // should also include properties from 5.4.0 and 5.4.0-rc1
      '5.4.0': true,
      '5.4.0-rc1': true,
    });

    // add the 5.4.1 flag to the 5.4.1 savedConfig
    await savedObjectsClient.update('config', '5.4.1', {
      '5.4.1': true,
    });

    // ------------------------------------
    // upgrade to 7.0.0-rc1
    await createOrUpgradeSavedConfig({
      savedObjectsClient,
      version: '7.0.0-rc1',
      buildNum: 70010,
      log: logger,
      handleWriteErrors: false,
    });

    const config700rc1 = await savedObjectsClient.get('config', '7.0.0-rc1');
    expect(config700rc1.attributes).toEqual({
      // should have the new build number
      buildNum: 70010,

      // should also include properties from 5.4.1, 5.4.0 and 5.4.0-rc1
      '5.4.1': true,
      '5.4.0': true,
      '5.4.0-rc1': true,
    });

    // tag the 7.0.0-rc1 doc
    await savedObjectsClient.update('config', '7.0.0-rc1', {
      '7.0.0-rc1': true,
    });

    // ------------------------------------
    // upgrade to 7.0.0
    await createOrUpgradeSavedConfig({
      savedObjectsClient,
      version: '7.0.0',
      buildNum: 70099,
      log: logger,
      handleWriteErrors: false,
    });

    const config700 = await savedObjectsClient.get('config', '7.0.0');
    expect(config700.attributes).toEqual({
      // should have the new build number
      buildNum: 70099,

      // should also include properties from ancestors, including 7.0.0-rc1
      '7.0.0-rc1': true,
      '5.4.1': true,
      '5.4.0': true,
      '5.4.0-rc1': true,
    });

    // tag the 7.0.0 doc
    await savedObjectsClient.update('config', '7.0.0', {
      '7.0.0': true,
    });

    // ------------------------------------
    // "downgrade" to 6.2.3-rc1
    await createOrUpgradeSavedConfig({
      savedObjectsClient,
      version: '6.2.3-rc1',
      buildNum: 62310,
      log: logger,
      handleWriteErrors: false,
    });

    const config623rc1 = await savedObjectsClient.get('config', '6.2.3-rc1');
    expect(config623rc1.attributes).toEqual({
      // should have the new build number
      buildNum: 62310,

      // should also include properties from ancestors, but not 7.0.0-rc1 or 7.0.0
      '5.4.1': true,
      '5.4.0': true,
      '5.4.0-rc1': true,
    });
  }, 30000);
});
