/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  elasticsearchServiceMock,
  executionContextServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../src/core/server/mocks';

import { CollectorOptions, CollectorSet } from './collector';
import { Collector } from './collector/collector';
import { UsageCollectionSetup, CollectorFetchContext } from './index';
import { usageCountersServiceMock } from './usage_counters/usage_counters_service.mock';
export type { CollectorOptions };
export { Collector };

export const createUsageCollectionSetupMock = () => {
  const collectorSet = new CollectorSet({
    logger: loggingSystemMock.createLogger(),
    executionContext: executionContextServiceMock.createSetupContract(),
    maximumWaitTimeForAllCollectorsInS: 1,
  });
  const { createUsageCounter, getUsageCounterByType } =
    usageCountersServiceMock.createSetupContract();

  const usageCollectionSetupMock: jest.Mocked<UsageCollectionSetup> = {
    createUsageCounter,
    getUsageCounterByType,
    bulkFetch: jest.fn().mockImplementation(collectorSet.bulkFetch),
    getCollectorByType: jest.fn().mockImplementation(collectorSet.getCollectorByType),
    toApiFieldNames: jest.fn().mockImplementation(collectorSet.toApiFieldNames),
    toObject: jest.fn().mockImplementation(collectorSet.toObject),
    makeStatsCollector: jest.fn().mockImplementation(collectorSet.makeStatsCollector),
    makeUsageCollector: jest.fn().mockImplementation(collectorSet.makeUsageCollector),
    registerCollector: jest.fn().mockImplementation(collectorSet.registerCollector),
  };

  return usageCollectionSetupMock;
};

export function createCollectorFetchContextMock(): jest.Mocked<CollectorFetchContext> {
  const collectorFetchClientsMock: jest.Mocked<CollectorFetchContext> = {
    esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
    soClient: savedObjectsClientMock.create(),
  };
  return collectorFetchClientsMock;
}

export const usageCollectionPluginMock = {
  createSetupContract: createUsageCollectionSetupMock,
};
