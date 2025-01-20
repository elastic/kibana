/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, ReplaySubject, Subject } from 'rxjs';
import { registerAnalyticsContextProvider } from './register_analytics_context_provider';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';

describe('registerAnalyticsContextProvider', () => {
  let analytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceSetup>;
  let location$: Subject<string>;

  beforeEach(() => {
    analytics = analyticsServiceMock.createAnalyticsServiceSetup();
    location$ = new ReplaySubject<string>(1);
    registerAnalyticsContextProvider({ analytics, location$ });
  });

  test('should register the analytics context provider', () => {
    expect(analytics.registerContextProvider).toHaveBeenCalledTimes(1);
    expect(analytics.registerContextProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'page url',
      })
    );
  });

  test('emits a context value when location$ emits', async () => {
    location$.next('/some_url');
    await expect(
      firstValueFrom(analytics.registerContextProvider.mock.calls[0][0].context$)
    ).resolves.toEqual({ page_url: '/some_url' });
  });
});
