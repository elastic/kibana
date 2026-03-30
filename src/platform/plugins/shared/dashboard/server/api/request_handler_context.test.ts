/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { createRouteHandlerContext } from './request_handler_context';

describe('dashboard api telemetry - ctx.dashboardApi.getTelemetryClient facade', () => {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  const usageCounter = usageCollection.createUsageCounter('increment_external_counter_test');
  const routePath = '/api/dashboards/{id}';
  const actualPath = '/api/dashboards/123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when usageCounter is unavailable', async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: actualPath,
      routePath,
    });
    const routeHandler = createRouteHandlerContext(undefined);
    const { getTelemetryClient } = await routeHandler({} as any, request, {} as any);
    const telemetry = getTelemetryClient();
    expect(telemetry).toBeUndefined();
  });

  it('returns undefined for Kibana-origin requests', async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: actualPath,
      routePath,
      headers: {
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
      },
    });
    const routeHandler = createRouteHandlerContext(usageCounter);
    const { getTelemetryClient } = await routeHandler({} as any, request, {} as any);
    const telemetry = getTelemetryClient();
    expect(telemetry).toBeUndefined();
  });

  it('returns undefined when `route.routePath` is missing', async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: actualPath,
    });
    const routeHandler = createRouteHandlerContext(usageCounter);
    const { getTelemetryClient } = await routeHandler({} as any, request, {} as any);
    const telemetry = getTelemetryClient();
    expect(telemetry).toBeUndefined();
  });

  it('increments for external request', async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: actualPath,
      routePath,
    });
    const routeHandler = createRouteHandlerContext(usageCounter);
    const { getTelemetryClient } = await routeHandler({} as any, request, {} as any);
    const telemetry = getTelemetryClient();
    telemetry?.incrementCounter({ status: 200 } as IKibanaResponse<any>);

    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'get /api/dashboards/{id} 200',
      incrementBy: undefined,
    });
  });
});
