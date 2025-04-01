/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, of, ReplaySubject } from 'rxjs';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { registerAnalyticsContextProvider } from './register_analytics_context_provider';

describe('registerAnalyticsContextProvider', () => {
  let analytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceSetup>;

  beforeEach(() => {
    analytics = analyticsServiceMock.createAnalyticsServiceSetup();
  });

  test('it registers the context provider', async () => {
    registerAnalyticsContextProvider(analytics, of('some title'));
    expect(analytics.registerContextProvider).toHaveBeenCalledTimes(1);
    expect(analytics.registerContextProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'page title',
      })
    );
  });

  test('emits a context value when location$ emits', async () => {
    const title$ = new ReplaySubject<string>(1);
    registerAnalyticsContextProvider(analytics, title$);
    title$.next('kibana title');

    await expect(
      firstValueFrom(analytics.registerContextProvider.mock.calls[0][0].context$)
    ).resolves.toEqual({ page_title: 'kibana title' });
  });
});
