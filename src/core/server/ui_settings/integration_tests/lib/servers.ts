/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type supertest from 'supertest';
import { SavedObjectsClientContract, IUiSettingsClient } from 'src/core/server';

import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
  TestUtils,
  HttpMethod,
  getSupertest,
} from '../../../../test_helpers/kbn_server';
import { LegacyAPICaller } from '../../../elasticsearch/';
import { httpServerMock } from '../../../http/http_server.mocks';

let servers: TestUtils;
let esServer: TestElasticsearchUtils;
let kbn: TestKibanaUtils;

interface AllServices {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: LegacyAPICaller;
  uiSettings: IUiSettingsClient;
  supertest: (method: HttpMethod, path: string) => supertest.Test;
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
}

export function getServices() {
  if (services) {
    return services;
  }

  const callCluster = esServer.es.getCallCluster();

  const savedObjectsClient = kbn.coreStart.savedObjects.getScopedClient(
    httpServerMock.createKibanaRequest()
  );

  const uiSettings = kbn.coreStart.uiSettings.asScopedToClient(savedObjectsClient);

  services = {
    supertest: (method: HttpMethod, path: string) => getSupertest(kbn.root, method, path),
    callCluster,
    savedObjectsClient,
    uiSettings,
  };

  return services;
}

export async function stopServers() {
  services = null!;
  if (servers) {
    await esServer.stop();
    await kbn.stop();
  }
}
