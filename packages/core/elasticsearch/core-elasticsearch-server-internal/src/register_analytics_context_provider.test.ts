/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, of } from 'rxjs';
import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { registerAnalyticsContextProvider } from './register_analytics_context_provider';

describe('registerAnalyticsContextProvider', () => {
  let analyticsMock: jest.Mocked<AnalyticsServiceSetup>;

  beforeEach(() => {
    analyticsMock = analyticsServiceMock.createAnalyticsServiceSetup();
  });

  test('it provides the context', async () => {
    registerAnalyticsContextProvider(
      analyticsMock,
      of({ cluster_name: 'cluster-name', cluster_uuid: 'cluster_uuid', cluster_version: '1.2.3' })
    );
    const { context$ } = analyticsMock.registerContextProvider.mock.calls[0][0];
    await expect(firstValueFrom(context$)).resolves.toMatchInlineSnapshot(`
      Object {
        "cluster_name": "cluster-name",
        "cluster_uuid": "cluster_uuid",
        "cluster_version": "1.2.3",
      }
    `);
  });
});
