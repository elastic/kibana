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

import { SavedObjectsClientContract, IUiSettingsClient } from 'src/core/server';

import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
  TestUtils,
} from '../../../../../test_utils/kbn_server';
import { APICaller } from '../../../elasticsearch/';

let servers: TestUtils;
let esServer: TestElasticsearchUtils;
let kbn: TestKibanaUtils;

let kbnServer: TestKibanaUtils['kbnServer'];

interface AllServices {
  kbnServer: TestKibanaUtils['kbnServer'];
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: APICaller;
  uiSettings: IUiSettingsClient;
  deleteKibanaIndex: typeof deleteKibanaIndex;
}

let services: AllServices;

export async function startServers() {
  servers = createTestServers({
    adjustTimeout: t => jest.setTimeout(t),
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

async function deleteKibanaIndex(callCluster: APICaller) {
  const kibanaIndices = await callCluster('cat.indices', { index: '.kibana*', format: 'json' });
  const indexNames = kibanaIndices.map((x: any) => x.index);
  if (!indexNames.length) {
    return;
  }
  await callCluster('indices.putSettings', {
    index: indexNames,
    body: { index: { blocks: { read_only: false } } },
  });
  await callCluster('indices.delete', { index: indexNames });
  return indexNames;
}

export function getServices() {
  if (services) {
    return services;
  }

  const callCluster = esServer.es.getCallCluster();

  const savedObjects = kbnServer.server.savedObjects;
  const savedObjectsClient = savedObjects.getScopedSavedObjectsClient({});

  const uiSettings = kbnServer.server.uiSettingsServiceFactory({
    savedObjectsClient,
  });

  services = {
    kbnServer,
    callCluster,
    savedObjectsClient,
    uiSettings,
    deleteKibanaIndex,
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
