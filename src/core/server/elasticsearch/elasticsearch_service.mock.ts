/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';

import {
  elasticsearchClientMock,
  ClusterClientMock,
  CustomClusterClientMock,
} from './client/mocks';
import { ElasticsearchClientConfig } from './client';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService } from './elasticsearch_service';
import {
  InternalElasticsearchServiceSetup,
  ElasticsearchServiceSetup,
  ElasticsearchStatusMeta,
  ElasticsearchServicePreboot,
} from './types';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';
import { ServiceStatus, ServiceStatusLevels } from '../status';

type MockedElasticSearchServicePreboot = jest.Mocked<ElasticsearchServicePreboot>;

export type MockedElasticSearchServiceSetup = jest.Mocked<
  Omit<ElasticsearchServiceSetup, 'legacy'>
> & {
  legacy: {
    config$: BehaviorSubject<ElasticsearchConfig>;
  };
};

export interface MockedElasticSearchServiceStart {
  client: ClusterClientMock;
  createClient: jest.MockedFunction<
    (name: string, config?: Partial<ElasticsearchClientConfig>) => CustomClusterClientMock
  >;
}

const createPrebootContractMock = () => {
  const prebootContract: MockedElasticSearchServicePreboot = {
    config: { hosts: [], credentialsSpecified: false },
    createClient: jest.fn(),
  };
  prebootContract.createClient.mockImplementation(() =>
    elasticsearchClientMock.createCustomClusterClient()
  );
  return prebootContract;
};

const createSetupContractMock = () => {
  const setupContract: MockedElasticSearchServiceSetup = {
    setUnauthorizedErrorHandler: jest.fn(),
    legacy: {
      config$: new BehaviorSubject({} as ElasticsearchConfig),
    },
  };
  return setupContract;
};

const createStartContractMock = () => {
  const startContract: MockedElasticSearchServiceStart = {
    client: elasticsearchClientMock.createClusterClient(),
    createClient: jest.fn(),
  };

  startContract.createClient.mockImplementation(() =>
    elasticsearchClientMock.createCustomClusterClient()
  );
  return startContract;
};

const createInternalPrebootContractMock = createPrebootContractMock;

type MockedInternalElasticSearchServiceSetup = jest.Mocked<InternalElasticsearchServiceSetup>;
const createInternalSetupContractMock = () => {
  const setupContract = createSetupContractMock();
  const internalSetupContract: MockedInternalElasticSearchServiceSetup = {
    ...setupContract,
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
  };
  return internalSetupContract;
};

const createInternalStartContractMock = createStartContractMock;

type ElasticsearchServiceContract = PublicMethodsOf<ElasticsearchService>;
const createMock = () => {
  const mocked: jest.Mocked<ElasticsearchServiceContract> = {
    preboot: jest.fn(),
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.preboot.mockResolvedValue(createInternalPrebootContractMock());
  mocked.setup.mockResolvedValue(createInternalSetupContractMock());
  mocked.start.mockResolvedValueOnce(createInternalStartContractMock());
  mocked.stop.mockResolvedValue();
  return mocked;
};

export const elasticsearchServiceMock = {
  create: createMock,
  createInternalPreboot: createInternalPrebootContractMock,
  createPreboot: createPrebootContractMock,
  createInternalSetup: createInternalSetupContractMock,
  createSetup: createSetupContractMock,
  createInternalStart: createInternalStartContractMock,
  createStart: createStartContractMock,

  ...elasticsearchClientMock,
};
