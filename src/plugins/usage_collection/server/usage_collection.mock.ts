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
