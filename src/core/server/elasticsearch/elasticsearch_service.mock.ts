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
import { ILegacyClusterClient, ILegacyCustomClusterClient } from './legacy';
import {
  elasticsearchClientMock,
  ClusterClientMock,
  CustomClusterClientMock,
} from './client/mocks';
import { legacyClientMock } from './legacy/mocks';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService } from './elasticsearch_service';
import { InternalElasticsearchServiceSetup, ElasticsearchStatusMeta } from './types';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';
import { ServiceStatus, ServiceStatusLevels } from '../status';

interface MockedElasticSearchServiceSetup {
  legacy: {
    createClient: jest.Mock<ILegacyCustomClusterClient, any>;
    client: jest.Mocked<ILegacyClusterClient>;
  };
}

type MockedElasticSearchServiceStart = MockedElasticSearchServiceSetup;

interface MockedInternalElasticSearchServiceStart extends MockedElasticSearchServiceStart {
  client: ClusterClientMock;
  createClient: jest.MockedFunction<() => CustomClusterClientMock>;
}

const createSetupContractMock = () => {
  const setupContract: MockedElasticSearchServiceSetup = {
    legacy: {
      createClient: jest.fn(),
      client: legacyClientMock.createClusterClient(),
    },
  };
  setupContract.legacy.createClient.mockReturnValue(legacyClientMock.createCustomClusterClient());
  setupContract.legacy.client.asScoped.mockReturnValue(
    legacyClientMock.createScopedClusterClient()
  );
  return setupContract;
};

const createStartContractMock = () => {
  const startContract: MockedElasticSearchServiceStart = {
    legacy: {
      createClient: jest.fn(),
      client: legacyClientMock.createClusterClient(),
    },
  };
  startContract.legacy.createClient.mockReturnValue(legacyClientMock.createCustomClusterClient());
  startContract.legacy.client.asScoped.mockReturnValue(
    legacyClientMock.createScopedClusterClient()
  );
  return startContract;
};

const createInternalStartContractMock = () => {
  const startContract: MockedInternalElasticSearchServiceStart = {
    ...createStartContractMock(),
    client: elasticsearchClientMock.createClusterClient(),
    createClient: jest.fn(),
  };

  startContract.createClient.mockReturnValue(elasticsearchClientMock.createCustomClusterClient());

  return startContract;
};

type MockedInternalElasticSearchServiceSetup = jest.Mocked<
  InternalElasticsearchServiceSetup & {
    legacy: { client: jest.Mocked<ILegacyClusterClient> };
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
  setupContract.legacy.client.asScoped.mockReturnValue(
    legacyClientMock.createScopedClusterClient()
  );
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
  mocked.start.mockResolvedValueOnce(createInternalStartContractMock());
  mocked.stop.mockResolvedValue();
  return mocked;
};

export const elasticsearchServiceMock = {
  create: createMock,
  createInternalSetup: createInternalSetupContractMock,
  createSetup: createSetupContractMock,
  createInternalStart: createInternalStartContractMock,
  createStart: createStartContractMock,
  createLegacyClusterClient: legacyClientMock.createClusterClient,
  createLegacyCustomClusterClient: legacyClientMock.createCustomClusterClient,
  createLegacyScopedClusterClient: legacyClientMock.createScopedClusterClient,
  createLegacyElasticsearchClient: legacyClientMock.createElasticsearchClient,
};
