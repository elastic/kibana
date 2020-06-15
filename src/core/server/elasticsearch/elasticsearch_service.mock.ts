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

import { BehaviorSubject } from 'rxjs';
import { Client } from 'elasticsearch';
import { IClusterClient, ICustomClusterClient } from './cluster_client';
import { IScopedClusterClient } from './scoped_cluster_client';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService } from './elasticsearch_service';
import { InternalElasticsearchServiceSetup, ElasticsearchStatusMeta } from './types';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';
import { ServiceStatus, ServiceStatusLevels } from '../status';

const createScopedClusterClientMock = (): jest.Mocked<IScopedClusterClient> => ({
  callAsInternalUser: jest.fn(),
  callAsCurrentUser: jest.fn(),
});

const createCustomClusterClientMock = (): jest.Mocked<ICustomClusterClient> => ({
  ...createClusterClientMock(),
  close: jest.fn(),
});

function createClusterClientMock() {
  const client: jest.Mocked<IClusterClient> = {
    callAsInternalUser: jest.fn(),
    asScoped: jest.fn(),
  };
  client.asScoped.mockReturnValue(createScopedClusterClientMock());
  return client;
}

interface MockedElasticSearchServiceSetup {
  legacy: {
    createClient: jest.Mock<ICustomClusterClient, any>;
    client: jest.Mocked<IClusterClient>;
  };
}

const createSetupContractMock = () => {
  const setupContract: MockedElasticSearchServiceSetup = {
    legacy: {
      createClient: jest.fn(),
      client: createClusterClientMock(),
    },
  };
  setupContract.legacy.createClient.mockReturnValue(createCustomClusterClientMock());
  setupContract.legacy.client.asScoped.mockReturnValue(createScopedClusterClientMock());
  return setupContract;
};

type MockedElasticSearchServiceStart = MockedElasticSearchServiceSetup;

const createStartContractMock = () => {
  const startContract: MockedElasticSearchServiceStart = {
    legacy: {
      createClient: jest.fn(),
      client: createClusterClientMock(),
    },
  };
  startContract.legacy.createClient.mockReturnValue(createCustomClusterClientMock());
  startContract.legacy.client.asScoped.mockReturnValue(createScopedClusterClientMock());
  return startContract;
};

type MockedInternalElasticSearchServiceSetup = jest.Mocked<
  InternalElasticsearchServiceSetup & {
    legacy: { client: jest.Mocked<IClusterClient> };
  }
>;
const createInternalSetupContractMock = () => {
  const setupContract: MockedInternalElasticSearchServiceSetup = {
    esNodesCompatibility$: new BehaviorSubject<NodesVersionCompatibility>({
      isCompatible: true,
      incompatibleNodes: [],
      warningNodes: [],
      kibanaVersion: '8.0.0',
    }),
    status$: new BehaviorSubject<ServiceStatus<ElasticsearchStatusMeta>>({
      level: ServiceStatusLevels.available,
      summary: 'Elasticsearch is available',
    }),
    legacy: {
      config$: new BehaviorSubject({} as ElasticsearchConfig),
      ...createSetupContractMock().legacy,
    },
  };
  setupContract.legacy.client.asScoped.mockReturnValue(createScopedClusterClientMock());
  return setupContract;
};

type ElasticsearchServiceContract = PublicMethodsOf<ElasticsearchService>;
const createMock = () => {
  const mocked: jest.Mocked<ElasticsearchServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.setup.mockResolvedValue(createInternalSetupContractMock());
  mocked.start.mockResolvedValueOnce(createStartContractMock());
  mocked.stop.mockResolvedValue();
  return mocked;
};

const createElasticsearchClientMock = () => {
  const mocked: jest.Mocked<Client> = {
    cat: {} as any,
    cluster: {} as any,
    indices: {} as any,
    ingest: {} as any,
    nodes: {} as any,
    snapshot: {} as any,
    tasks: {} as any,
    bulk: jest.fn(),
    clearScroll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteByQuery: jest.fn(),
    deleteScript: jest.fn(),
    deleteTemplate: jest.fn(),
    exists: jest.fn(),
    explain: jest.fn(),
    fieldStats: jest.fn(),
    get: jest.fn(),
    getScript: jest.fn(),
    getSource: jest.fn(),
    getTemplate: jest.fn(),
    index: jest.fn(),
    info: jest.fn(),
    mget: jest.fn(),
    msearch: jest.fn(),
    msearchTemplate: jest.fn(),
    mtermvectors: jest.fn(),
    ping: jest.fn(),
    putScript: jest.fn(),
    putTemplate: jest.fn(),
    reindex: jest.fn(),
    reindexRethrottle: jest.fn(),
    renderSearchTemplate: jest.fn(),
    scroll: jest.fn(),
    search: jest.fn(),
    searchShards: jest.fn(),
    searchTemplate: jest.fn(),
    suggest: jest.fn(),
    termvectors: jest.fn(),
    update: jest.fn(),
    updateByQuery: jest.fn(),
    close: jest.fn(),
  };
  return mocked;
};

export const elasticsearchServiceMock = {
  create: createMock,
  createInternalSetup: createInternalSetupContractMock,
  createSetup: createSetupContractMock,
  createStart: createStartContractMock,
  createClusterClient: createClusterClientMock,
  createCustomClusterClient: createCustomClusterClientMock,
  createScopedClusterClient: createScopedClusterClientMock,
  createElasticsearchClient: createElasticsearchClientMock,
};
