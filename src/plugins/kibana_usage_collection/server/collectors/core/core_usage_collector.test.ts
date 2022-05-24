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
import { registerCoreUsageCollector } from './core_usage_collector';
import { coreUsageDataServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { CoreUsageData } from '@kbn/core/server';

const logger = loggingSystemMock.createLogger();

describe('telemetry_core', () => {
  let collector: Collector<unknown>;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = new Collector(logger, config);
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const collectorFetchContext = createCollectorFetchContextMock();
  const coreUsageDataStart = coreUsageDataServiceMock.createStartContract();
  const getCoreUsageDataReturnValue = Symbol('core telemetry') as unknown as CoreUsageData;
  coreUsageDataStart.getCoreUsageData.mockResolvedValue(getCoreUsageDataReturnValue);

  beforeAll(() => registerCoreUsageCollector(usageCollectionMock, () => coreUsageDataStart));

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
    expect(collector.type).toBe('core');
  });

  test('fetch', async () => {
    expect(await collector.fetch(collectorFetchContext)).toEqual(getCoreUsageDataReturnValue);
  });
});
