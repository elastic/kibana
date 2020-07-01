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

import { UsageCollectionSetup, UsageCollectionService } from './';
import { mockCoreContext } from '../core_context.mock';

function createSetupContract() {
  const usageCollectionService = new UsageCollectionService(mockCoreContext.create());
  const setup = usageCollectionService.setup();

  const usageCollectionSetupMock: jest.Mocked<UsageCollectionSetup> = {
    makeStatsCollector: jest.fn().mockImplementation(setup.makeStatsCollector),
    makeUsageCollector: jest.fn().mockImplementation(setup.makeUsageCollector),
    registerCollector: jest.fn().mockImplementation(setup.registerCollector),

    areAllCollectorsReady: jest.fn().mockImplementation(setup.areAllCollectorsReady),
    bulkFetchUsage: jest.fn().mockImplementation(setup.bulkFetchUsage),
    toObject: jest.fn().mockImplementation(setup.toObject),
    toApiFieldNames: jest.fn().mockImplementation(setup.toApiFieldNames),
    getFilteredCollectorSet: jest.fn().mockImplementation(setup.getFilteredCollectorSet),
    getCollectorByType: jest.fn().mockImplementation(setup.getCollectorByType),

    // @ts-expect-error:next-line jest.fn doesn't play nice with type guards
    isUsageCollector: jest.fn().mockImplementation(setup.isUsageCollector),
  };

  return usageCollectionSetupMock;
}

export const usageCollectionServiceMock = {
  createSetupContract,
};
