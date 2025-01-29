/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';

import {
  elasticsearchClientMock,
  type ClusterClientMock,
  type CustomClusterClientMock,
  createAgentStatsProviderMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import type {
  ElasticsearchClientConfig,
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
  ElasticsearchServicePreboot,
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import type {
  ElasticsearchConfig,
  ElasticsearchService,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
  ElasticsearchStatusMeta,
  NodesVersionCompatibility,
  ClusterInfo,
} from '@kbn/core-elasticsearch-server-internal';
import { type ServiceStatus, ServiceStatusLevels } from '@kbn/core-status-common';

type MockedElasticSearchServicePreboot = jest.Mocked<ElasticsearchServicePreboot>;

export type MockedElasticSearchServiceSetup = jest.Mocked<
  Omit<ElasticsearchServiceSetup, 'legacy'>
> & {
  legacy: {
    config$: BehaviorSubject<ElasticsearchConfig>;
  };
};

export type MockedElasticSearchServiceStart = jest.Mocked<
  Omit<ElasticsearchServiceStart, 'client' | 'createClient'>
> & {
  client: ClusterClientMock;
  createClient: jest.MockedFunction<
    (type: string, config?: Partial<ElasticsearchClientConfig>) => CustomClusterClientMock
  >;
};

const createPrebootContractMock = () => {
  const prebootContract: MockedElasticSearchServicePreboot = {
    config: { hosts: [], credentialsSpecified: false },
    createClient: jest.fn((type: string) => elasticsearchClientMock.createCustomClusterClient()),
  };
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
    createClient: jest.fn((type: string) => elasticsearchClientMock.createCustomClusterClient()),
    getCapabilities: jest.fn().mockReturnValue(createCapabilities()),
  };
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
    clusterInfo$: new BehaviorSubject<ClusterInfo>({
      cluster_uuid: 'cluster-uuid',
      cluster_name: 'cluster-name',
      cluster_version: '8.0.0',
      cluster_build_flavor: 'default',
    }),
    status$: new BehaviorSubject<ServiceStatus<ElasticsearchStatusMeta>>({
      level: ServiceStatusLevels.available,
      summary: 'Elasticsearch is available',
    }),
    agentStatsProvider: createAgentStatsProviderMock(),
  };
  return internalSetupContract;
};

type MockedInternalElasticsearchServiceStart = jest.Mocked<
  Omit<InternalElasticsearchServiceStart, 'client' | 'createClient'>
> &
  Pick<MockedElasticSearchServiceStart, 'client' | 'createClient'>;

const createInternalStartContractMock = () => {
  const startContract = createStartContractMock();
  const internalStartContractMock: MockedInternalElasticsearchServiceStart = {
    ...startContract,
    metrics: {
      elasticsearchWaitTime: 0,
    },
  };
  return internalStartContractMock;
};

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

const createCapabilities = (
  parts: Partial<ElasticsearchCapabilities> = {}
): ElasticsearchCapabilities => {
  return {
    serverless: false,
    ...parts,
  };
};

export const elasticsearchServiceMock = {
  ...elasticsearchClientMock,
  create: createMock,
  createInternalPreboot: createInternalPrebootContractMock,
  createPreboot: createPrebootContractMock,
  createInternalSetup: createInternalSetupContractMock,
  createSetup: createSetupContractMock,
  createInternalStart: createInternalStartContractMock,
  createStart: createStartContractMock,
  createCapabilities,
};
