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

import { makeKQLUsageCollector } from './make_kql_usage_collector';
import { UsageCollectionSetup } from '../../../../usage_collection/server';

describe('makeKQLUsageCollector', () => {
  let usageCollectionMock: jest.Mocked<UsageCollectionSetup>;

  beforeEach(() => {
    usageCollectionMock = ({
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown) as jest.Mocked<UsageCollectionSetup>;
  });

  it('should call registerCollector', () => {
    makeKQLUsageCollector(usageCollectionMock, '.kibana');
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('should call makeUsageCollector with type = kql', () => {
    makeKQLUsageCollector(usageCollectionMock, '.kibana');
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe('kql');
  });
});
