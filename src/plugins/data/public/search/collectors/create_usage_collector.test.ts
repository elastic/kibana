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
    usageCollector = createUsageCollector(mockCoreSetup, mockUsageCollectionSetup);
  });

  test('tracks query timeouts', async () => {
    await usageCollector.trackQueryTimedOut();
    expect(mockUsageCollectionSetup.reportUiStats).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][0]).toBe('foo/bar');
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][1]).toBe(METRIC_TYPE.LOADED);
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.QUERY_TIMED_OUT
    );
  });

  test('tracks query cancellation', async () => {
    await usageCollector.trackQueriesCancelled();
    expect(mockUsageCollectionSetup.reportUiStats).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][1]).toBe(METRIC_TYPE.LOADED);
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.QUERIES_CANCELLED
    );
  });

  test('tracks long popups', async () => {
    await usageCollector.trackLongQueryPopupShown();
    expect(mockUsageCollectionSetup.reportUiStats).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][1]).toBe(METRIC_TYPE.LOADED);
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.LONG_QUERY_POPUP_SHOWN
    );
  });

  test('tracks long popups dismissed', async () => {
    await usageCollector.trackLongQueryDialogDismissed();
    expect(mockUsageCollectionSetup.reportUiStats).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][1]).toBe(METRIC_TYPE.CLICK);
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.LONG_QUERY_DIALOG_DISMISSED
    );
  });

  test('tracks run query beyond timeout', async () => {
    await usageCollector.trackLongQueryRunBeyondTimeout();
    expect(mockUsageCollectionSetup.reportUiStats).toHaveBeenCalled();
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][1]).toBe(METRIC_TYPE.CLICK);
    expect(mockUsageCollectionSetup.reportUiStats.mock.calls[0][2]).toBe(
      SEARCH_EVENT_TYPE.LONG_QUERY_RUN_BEYOND_TIMEOUT
    );
  });

  test('tracks response errors', async () => {
    const duration = 10;
    await usageCollector.trackError(duration);
    expect(mockCoreSetup.http.post).toBeCalled();
    expect(mockCoreSetup.http.post.mock.calls[0][0]).toBe('/api/search/usage');
  });

  test('tracks response duration', async () => {
    const duration = 5;
    await usageCollector.trackSuccess(duration);
    expect(mockCoreSetup.http.post).toBeCalled();
    expect(mockCoreSetup.http.post.mock.calls[0][0]).toBe('/api/search/usage');
  });
});
