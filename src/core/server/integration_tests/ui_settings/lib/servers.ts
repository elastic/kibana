/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type supertest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import { httpServerMock } from '@kbn/core-http-server-mocks';

import {
  createTestServers,
  getSupertest,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  type TestUtils,
  type HttpMethod,
} from '@kbn/core-test-helpers-kbn-server';
import type { SavedObjectsClientContract, IUiSettingsClient } from '../../..';

let servers: TestUtils;
let esServer: TestElasticsearchUtils;
let kbn: TestKibanaUtils;

interface AllServices {
  savedObjectsClient: SavedObjectsClientContract;
  esClient: Client;
  uiSettings: IUiSettingsClient;
  uiSettingsGlobal: IUiSettingsClient;
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

  const esClient = esServer.es.getClient();

  const savedObjectsClient = kbn.coreStart.savedObjects.getScopedClient(
    httpServerMock.createKibanaRequest()
  );

  const uiSettings = kbn.coreStart.uiSettings.asScopedToClient(savedObjectsClient);
  const uiSettingsGlobal = kbn.coreStart.uiSettings.globalAsScopedToClient(savedObjectsClient);

  services = {
    supertest: (method: HttpMethod, path: string) => getSupertest(kbn.root, method, path),
    esClient,
    savedObjectsClient,
    uiSettings,
    uiSettingsGlobal,
  };

  return services;
}

export async function stopServers() {
  services = null!;
  if (esServer) {
    await esServer.stop();
  }
  if (kbn) {
    await kbn.stop();
  }
}
