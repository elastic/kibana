/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type supertest from 'supertest';
import type { SavedObjectsClientContract, IUiSettingsClient } from 'src/core/server';
import type { Client } from '@elastic/elasticsearch';

import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
  TestUtils,
  HttpMethod,
  getSupertest,
} from '../../../../test_helpers/kbn_server';
import { httpServerMock } from '../../../http/http_server.mocks';

let servers: TestUtils;
let esServer: TestElasticsearchUtils;
let kbn: TestKibanaUtils;

interface AllServices {
  savedObjectsClient: SavedObjectsClientContract;
  esClient: Client;
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

  const esClient = esServer.es.getClient();

  const savedObjectsClient = kbn.coreStart.savedObjects.getScopedClient(
    httpServerMock.createKibanaRequest()
  );

  const uiSettings = kbn.coreStart.uiSettings.asScopedToClient(savedObjectsClient);

  services = {
    supertest: (method: HttpMethod, path: string) => getSupertest(kbn.root, method, path),
    esClient,
    savedObjectsClient,
    uiSettings,
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
