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
import { IClusterClient, ICustomClusterClient } from './cluster_client';
import { IScopedClusterClient } from './scoped_cluster_client';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService } from './elasticsearch_service';
import { InternalElasticsearchServiceSetup, ElasticsearchServiceSetup } from './types';

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

type MockedElasticSearchServiceSetup = jest.Mocked<
  ElasticsearchServiceSetup & {
    adminClient: jest.Mocked<IClusterClient>;
    dataClient: jest.Mocked<IClusterClient>;
  }
>;

const createSetupContractMock = () => {
  const setupContract: MockedElasticSearchServiceSetup = {
    createClient: jest.fn(),
    adminClient: createClusterClientMock(),
    dataClient: createClusterClientMock(),
  };
  setupContract.createClient.mockReturnValue(createCustomClusterClientMock());
  setupContract.adminClient.asScoped.mockReturnValue(createScopedClusterClientMock());
  setupContract.dataClient.asScoped.mockReturnValue(createScopedClusterClientMock());
  return setupContract;
};

type MockedInternalElasticSearchServiceSetup = jest.Mocked<
  InternalElasticsearchServiceSetup & {
    adminClient: jest.Mocked<IClusterClient>;
    dataClient: jest.Mocked<IClusterClient>;
  }
>;
const createInternalSetupContractMock = () => {
  const setupContract: MockedInternalElasticSearchServiceSetup = {
    ...createSetupContractMock(),
    legacy: {
      config$: new BehaviorSubject({} as ElasticsearchConfig),
    },
    adminClient$: new BehaviorSubject(createClusterClientMock()),
    dataClient$: new BehaviorSubject(createClusterClientMock()),
  };
  setupContract.adminClient.asScoped.mockReturnValue(createScopedClusterClientMock());
  setupContract.dataClient.asScoped.mockReturnValue(createScopedClusterClientMock());
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
  mocked.stop.mockResolvedValue();
  return mocked;
};

export const elasticsearchServiceMock = {
  create: createMock,
  createInternalSetup: createInternalSetupContractMock,
  createSetup: createSetupContractMock,
  createClusterClient: createClusterClientMock,
  createCustomClusterClient: createCustomClusterClientMock,
  createScopedClusterClient: createScopedClusterClientMock,
};
