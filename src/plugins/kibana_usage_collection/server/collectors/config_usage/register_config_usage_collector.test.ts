/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Collector,
  createUsageCollectionSetupMock,
  createCollectorFetchContextMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { registerConfigUsageCollector } from './register_config_usage_collector';
import { coreUsageDataServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConfigUsageData } from '@kbn/core/server';

const logger = loggingSystemMock.createLogger();

describe('kibana_config_usage', () => {
  let collector: Collector<unknown>;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = new Collector(logger, config);
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const collectorFetchContext = createCollectorFetchContextMock();
  const coreUsageDataStart = coreUsageDataServiceMock.createStartContract();
  const mockConfigUsage = Symbol('config usage telemetry') as unknown as ConfigUsageData;
  coreUsageDataStart.getConfigsUsageData.mockResolvedValue(mockConfigUsage);

  beforeAll(() => registerConfigUsageCollector(usageCollectionMock, () => coreUsageDataStart));

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
    expect(collector.type).toBe('kibana_config_usage');
  });

  test('fetch', async () => {
    expect(await collector.fetch(collectorFetchContext)).toEqual(mockConfigUsage);
  });
});
