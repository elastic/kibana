/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '../../../../src/core/server/mocks';

import { CollectorOptions, Collector, UsageCollector } from './collector';
import { UsageCollectionSetup, CollectorFetchContext } from './index';

export { CollectorOptions, Collector };

const logger = loggingSystemMock.createLogger();

export const createUsageCollectionSetupMock = () => {
  const usageCollectionSetupMock: jest.Mocked<UsageCollectionSetup> = {
    areAllCollectorsReady: jest.fn(),
    bulkFetch: jest.fn(),
    bulkFetchUsage: jest.fn(),
    getCollectorByType: jest.fn(),
    toApiFieldNames: jest.fn(),
    toObject: jest.fn(),
    makeStatsCollector: jest.fn().mockImplementation((cfg) => new Collector(logger, cfg)),
    makeUsageCollector: jest.fn().mockImplementation((cfg) => new UsageCollector(logger, cfg)),
    registerCollector: jest.fn(),
  };

  usageCollectionSetupMock.areAllCollectorsReady.mockResolvedValue(true);
  return usageCollectionSetupMock;
};

export function createCollectorFetchContextMock(): jest.Mocked<CollectorFetchContext<false>> {
  const collectorFetchClientsMock: jest.Mocked<CollectorFetchContext<false>> = {
    esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
    soClient: savedObjectsRepositoryMock.create(),
  };
  return collectorFetchClientsMock;
}

export function createCollectorFetchContextWithKibanaMock(): jest.Mocked<
  CollectorFetchContext<true>
> {
  const collectorFetchClientsMock: jest.Mocked<CollectorFetchContext<true>> = {
    esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
    soClient: savedObjectsRepositoryMock.create(),
    kibanaRequest: httpServerMock.createKibanaRequest(),
  };
  return collectorFetchClientsMock;
}
