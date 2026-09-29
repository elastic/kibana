/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import { makeKQLUsageCollector } from './make_kql_usage_collector';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

describe('makeKQLUsageCollector', () => {
  let usageCollectionMock: Mocked<UsageCollectionSetup>;

  const getIndexForType = () => Promise.resolve('.kibana');

  beforeEach(() => {
    usageCollectionMock = {
      makeUsageCollector: vi.fn(),
      registerCollector: vi.fn(),
    } as unknown as Mocked<UsageCollectionSetup>;
  });

  it('should call registerCollector', () => {
    makeKQLUsageCollector(usageCollectionMock as UsageCollectionSetup, getIndexForType);
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('should call makeUsageCollector with type = kql', () => {
    makeKQLUsageCollector(usageCollectionMock as UsageCollectionSetup, getIndexForType);
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe('kql');
  });
});
