/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TelemetryCounter } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';
import { registerEbtCounters } from './register_ebt_counters';

describe('registerEbtCounters', () => {
  let core: ReturnType<typeof coreMock.createSetup>;
  let usageCollection: ReturnType<typeof createUsageCollectionSetupMock>;
  let internalListener: (counter: TelemetryCounter) => void;
  let telemetryCounter$Spy: jest.SpyInstance;

  beforeEach(() => {
    core = coreMock.createSetup();
    usageCollection = createUsageCollectionSetupMock();
    telemetryCounter$Spy = jest
      .spyOn(core.analytics.telemetryCounter$, 'subscribe')
      .mockImplementation(((listener) => {
        internalListener = listener as (counter: TelemetryCounter) => void;
      }) as typeof core.analytics.telemetryCounter$['subscribe']);
  });

  test('it subscribes to `analytics.telemetryCounters$`', () => {
    registerEbtCounters(core.analytics, usageCollection);
    expect(telemetryCounter$Spy).toHaveBeenCalledTimes(1);
  });

  test('it creates a new usageCounter when it does not exist', () => {
    registerEbtCounters(core.analytics, usageCollection);
    expect(telemetryCounter$Spy).toHaveBeenCalledTimes(1);
    internalListener({
      type: 'succeeded',
      source: 'test-shipper',
      event_type: 'test-event',
      code: 'test-code',
      count: 1,
    });
    expect(usageCollection.getUsageCounterByType).toHaveBeenCalledTimes(1);
    expect(usageCollection.getUsageCounterByType).toHaveBeenCalledWith('ebt_counters.test-shipper');
    expect(usageCollection.createUsageCounter).toHaveBeenCalledTimes(1);
    expect(usageCollection.createUsageCounter).toHaveBeenCalledWith('ebt_counters.test-shipper');
  });

  test('it reuses the usageCounter when it already exists', () => {
    const incrementCounterMock = jest.fn();
    usageCollection.getUsageCounterByType.mockReturnValue({
      incrementCounter: incrementCounterMock,
    });
    registerEbtCounters(core.analytics, usageCollection);
    expect(telemetryCounter$Spy).toHaveBeenCalledTimes(1);
    internalListener({
      type: 'succeeded',
      source: 'test-shipper',
      event_type: 'test-event',
      code: 'test-code',
      count: 1,
    });
    expect(usageCollection.getUsageCounterByType).toHaveBeenCalledTimes(1);
    expect(usageCollection.getUsageCounterByType).toHaveBeenCalledWith('ebt_counters.test-shipper');
    expect(usageCollection.createUsageCounter).toHaveBeenCalledTimes(0);
    expect(incrementCounterMock).toHaveBeenCalledTimes(1);
    expect(incrementCounterMock).toHaveBeenCalledWith({
      counterName: 'test-event',
      counterType: `succeeded_test-code`,
      incrementBy: 1,
    });
  });
});
