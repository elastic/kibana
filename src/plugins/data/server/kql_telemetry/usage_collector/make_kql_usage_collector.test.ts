/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { makeKQLUsageCollector } from './make_kql_usage_collector';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

describe('makeKQLUsageCollector', () => {
  let usageCollectionMock: jest.Mocked<UsageCollectionSetup>;

  beforeEach(() => {
    usageCollectionMock = {
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown as jest.Mocked<UsageCollectionSetup>;
  });

  it('should call registerCollector', () => {
    makeKQLUsageCollector(usageCollectionMock as UsageCollectionSetup, '.kibana');
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('should call makeUsageCollector with type = kql', () => {
    makeKQLUsageCollector(usageCollectionMock as UsageCollectionSetup, '.kibana');
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe('kql');
  });
});
