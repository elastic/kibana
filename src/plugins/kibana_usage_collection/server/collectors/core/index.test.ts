/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  Collector,
  createUsageCollectionSetupMock,
} from '../../../../usage_collection/server/usage_collection.mock';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';
import { registerCoreUsageCollector } from '.';
import { coreUsageDataServiceMock, loggingSystemMock } from '../../../../../core/server/mocks';
import { CoreUsageData } from 'src/core/server/';

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
  const getCoreUsageDataReturnValue = (Symbol('core telemetry') as any) as CoreUsageData;
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
