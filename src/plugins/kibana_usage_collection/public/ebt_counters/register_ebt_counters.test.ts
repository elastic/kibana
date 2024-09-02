/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TelemetryCounter } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { registerEbtCounters } from './register_ebt_counters';

describe('registerEbtCounters', () => {
  let core: ReturnType<typeof coreMock.createSetup>;
  let usageCollection: ReturnType<typeof usageCollectionPluginMock.createSetupContract>;
  let internalListener: (counter: TelemetryCounter) => void;
  let telemetryCounter$Spy: jest.SpyInstance;

  beforeEach(() => {
    core = coreMock.createSetup();
    usageCollection = usageCollectionPluginMock.createSetupContract();
    telemetryCounter$Spy = jest
      .spyOn(core.analytics.telemetryCounter$, 'subscribe')
      .mockImplementation(((listener) => {
        internalListener = listener as (counter: TelemetryCounter) => void;
      }) as (typeof core.analytics.telemetryCounter$)['subscribe']);
  });

  test('it subscribes to `analytics.telemetryCounters$`', () => {
    registerEbtCounters(core.analytics, usageCollection);
    expect(telemetryCounter$Spy).toHaveBeenCalledTimes(1);
  });

  test('it reports a UI counter whenever a counter is emitted', () => {
    registerEbtCounters(core.analytics, usageCollection);
    expect(telemetryCounter$Spy).toHaveBeenCalledTimes(1);
    internalListener({
      type: 'succeeded',
      source: 'test-shipper',
      event_type: 'test-event',
      code: 'test-code',
      count: 1,
    });
    expect(usageCollection.reportUiCounter).toHaveBeenCalledTimes(1);
    expect(usageCollection.reportUiCounter).toHaveBeenCalledWith(
      'ebt_counters.test-shipper',
      'succeeded_test-code',
      'test-event',
      1
    );
  });
});
