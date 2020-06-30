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

import { UsageCollectionSetup } from './';

function createSetupContract() {
  const usageCollectionSetupMock: jest.Mocked<UsageCollectionSetup> = {
    areAllCollectorsReady: jest.fn(),
    bulkFetchUsage: jest.fn(),
    getFilteredCollectorSet: jest.fn(),
    makeStatsCollector: jest.fn(),
    toApiFieldNames: jest.fn(),
    toObject: jest.fn(),
    makeUsageCollector: jest.fn(),
    registerCollector: jest.fn(),
    // @ts-expect-error-next-line jest.fn doesn't play nice with type guards
    isUsageCollector: jest.fn(),
  };

  usageCollectionSetupMock.areAllCollectorsReady.mockResolvedValue(true);
  return usageCollectionSetupMock;
}

export const usageCollectionServiceMock = {
  createSetupContract,
};
