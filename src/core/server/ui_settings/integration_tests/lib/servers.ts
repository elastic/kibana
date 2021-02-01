/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsClientContract, IUiSettingsClient } from 'src/core/server';

import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
  TestUtils,
} from '../../../../test_helpers/kbn_server';
import { LegacyAPICaller } from '../../../elasticsearch/';
import { httpServerMock } from '../../../http/http_server.mocks';

let servers: TestUtils;
let esServer: TestElasticsearchUtils;
let kbn: TestKibanaUtils;

let kbnServer: TestKibanaUtils['kbnServer'];

interface AllServices {
  kbnServer: TestKibanaUtils['kbnServer'];
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: LegacyAPICaller;
  uiSettings: IUiSettingsClient;
}

let services: AllServices;

export async function startServers() {
  servers = createTestServers({
    adjustTimeout: (t) => jest.setTimeout(t),
    settings: {
      kbn: {
        uiSettings: {
          overrides: {
            foo: 'bar',
          },
        },
      },
    },
  });
  esServer = await servers.startES();
  kbn = await servers.startKibana();
  kbnServer = kbn.kbnServer;
}

export function getServices() {
  if (services) {
    return services;
  }

  const callCluster = esServer.es.getCallCluster();

  const savedObjectsClient = kbn.coreStart.savedObjects.getScopedClient(
    httpServerMock.createKibanaRequest()
  );

  const uiSettings = kbnServer.newPlatform.start.core.uiSettings.asScopedToClient(
    savedObjectsClient
  );

  services = {
    kbnServer,
    callCluster,
    savedObjectsClient,
    uiSettings,
  };

  return services;
}

export async function stopServers() {
  services = null!;
  kbnServer = null!;
  if (servers) {
    await esServer.stop();
    await kbn.stop();
  }
}
