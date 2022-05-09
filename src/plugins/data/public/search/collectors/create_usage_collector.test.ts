/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { usageCollectionPluginMock, Setup } from '@kbn/usage-collection-plugin/public/mocks';
import { createUsageCollector } from './create_usage_collector';
import { SEARCH_EVENT_TYPE, SearchUsageCollector } from './types';
import { METRIC_TYPE } from '@kbn/analytics';
import { from } from 'rxjs';

describe('Search Usage Collector', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let mockUsageCollectionSetup: Setup;
  let usageCollector: SearchUsageCollector;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    (mockCoreSetup as any).getStartServices.mockResolvedValue([
      {
        application: {
          currentAppId$: from(['foo/bar']),
        },
      } as jest.Mocked<CoreStart>,
      {} as any,
      {} as any,
    ]);
    mockUsageCollectionSetup = usageCollectionPluginMock.createSetupContract();
    usageCollector = createUsageCollector(mockCoreSetup.getStartServices, mockUsageCollectionSetup);
  });

  test('tracks query timeouts', async () => {
    await usageCollector.trackQueryTimedOut();
    expect(mockUsageCollectionSetup.reportUiCounter).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][0]).toBe('foo/bar');
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][1]).toBe(METRIC_TYPE.LOADED);
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.QUERY_TIMED_OUT
    );
  });

  test('tracks session sent to background', async () => {
    await usageCollector.trackSessionSentToBackground();
    expect(mockUsageCollectionSetup.reportUiCounter).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][1]).toBe(METRIC_TYPE.CLICK);
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.SESSION_SENT_TO_BACKGROUND
    );
  });

  test('tracks session saved results', async () => {
    await usageCollector.trackSessionSavedResults();
    expect(mockUsageCollectionSetup.reportUiCounter).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][1]).toBe(METRIC_TYPE.CLICK);
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.SESSION_SAVED_RESULTS
    );
  });

  test('tracks session view restored', async () => {
    await usageCollector.trackSessionViewRestored();
    expect(mockUsageCollectionSetup.reportUiCounter).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][1]).toBe(METRIC_TYPE.CLICK);
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.SESSION_VIEW_RESTORED
    );
  });

  test('tracks session is restored', async () => {
    await usageCollector.trackSessionIsRestored();
    expect(mockUsageCollectionSetup.reportUiCounter).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][1]).toBe(METRIC_TYPE.CLICK);
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.SESSION_IS_RESTORED
    );
  });

  test('tracks session reloaded', async () => {
    await usageCollector.trackSessionReloaded();
    expect(mockUsageCollectionSetup.reportUiCounter).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][1]).toBe(METRIC_TYPE.CLICK);
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.SESSION_RELOADED
    );
  });

  test('tracks session extended', async () => {
    await usageCollector.trackSessionExtended();
    expect(mockUsageCollectionSetup.reportUiCounter).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][1]).toBe(METRIC_TYPE.CLICK);
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.SESSION_EXTENDED
    );
  });

  test('tracks session cancelled', async () => {
    await usageCollector.trackSessionCancelled();
    expect(mockUsageCollectionSetup.reportUiCounter).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][1]).toBe(METRIC_TYPE.CLICK);
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.SESSION_CANCELLED
    );
  });
});
