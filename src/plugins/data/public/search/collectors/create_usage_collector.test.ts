/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, CoreStart } from '../../../../../core/public';
import { coreMock } from '../../../../../core/public/mocks';
import { usageCollectionPluginMock, Setup } from '../../../../usage_collection/public/mocks';
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

  test('tracks query cancellation', async () => {
    await usageCollector.trackQueriesCancelled();
    expect(mockUsageCollectionSetup.reportUiCounter).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][1]).toBe(METRIC_TYPE.LOADED);
    expect(mockUsageCollectionSetup.reportUiCounter.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.QUERIES_CANCELLED
    );
  });
});
