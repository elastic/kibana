/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { ILegacyClusterClient, ILegacyCustomClusterClient } from './legacy';
import {
  elasticsearchClientMock,
  ClusterClientMock,
  CustomClusterClientMock,
} from './client/mocks';
import { ElasticsearchClientConfig } from './client';
import { legacyClientMock } from './legacy/mocks';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService } from './elasticsearch_service';
import { InternalElasticsearchServiceSetup, ElasticsearchStatusMeta } from './types';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';
import { ServiceStatus, ServiceStatusLevels } from '../status';

export interface MockedElasticSearchServiceSetup {
  legacy: {
    config$: BehaviorSubject<ElasticsearchConfig>;
    createClient: jest.Mock<ILegacyCustomClusterClient, any>;
    client: jest.Mocked<ILegacyClusterClient>;
  };
}

type MockedElasticSearchServiceStart = MockedElasticSearchServiceSetup & {
  client: ClusterClientMock;
  createClient: jest.MockedFunction<
    (name: string, config?: Partial<ElasticsearchClientConfig>) => CustomClusterClientMock
  >;
};

const createSetupContractMock = () => {
  const setupContract: MockedElasticSearchServiceSetup = {
    legacy: {
      config$: new BehaviorSubject({} as ElasticsearchConfig),
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
    client: elasticsearchClientMock.createClusterClient(),
    createClient: jest.fn(),
    legacy: {
      config$: new BehaviorSubject({} as ElasticsearchConfig),
      createClient: jest.fn(),
      client: legacyClientMock.createClusterClient(),
    },
  };
  startContract.legacy.createClient.mockReturnValue(legacyClientMock.createCustomClusterClient());
  startContract.legacy.client.asScoped.mockReturnValue(
    legacyClientMock.createScopedClusterClient()
  );
  startContract.createClient.mockImplementation(() =>
    elasticsearchClientMock.createCustomClusterClient()
  );
  return startContract;
};

const createInternalStartContractMock = createStartContractMock;

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

  ...elasticsearchClientMock,
};
