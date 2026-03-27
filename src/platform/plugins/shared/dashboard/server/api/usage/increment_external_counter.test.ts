/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { registerDashboardApiTelemetry } from './register_api_telemetry';

describe('dashboard api telemetry - ctx.dashboardApi.telemetry facade', () => {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  const usageCounter = usageCollection.createUsageCounter('increment_external_counter_test');
  const routePath = '/api/dashboards/{id}';
  const actualPath = '/api/dashboards/123';

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('is a noop when usageCounter is unavailable', () => {
    const telemetry = registerDashboardApiTelemetry({
      usageCounter: undefined,
      isDashboardUiRequest: false,
      request: httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
      }),
    });
    expect(() => telemetry.incrementCounter({ status: 200 } as IKibanaResponse<any>)).not.toThrow();
  });

  it('does not increment for Dashboard UI request', () => {
    const telemetry = registerDashboardApiTelemetry({
      usageCounter,
      isDashboardUiRequest: true,
      request: httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
      }),
    });
    telemetry.incrementCounter({ status: 200 } as IKibanaResponse<any>);
    expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  it('increments for external request', () => {
    const telemetry = registerDashboardApiTelemetry({
      usageCounter,
      isDashboardUiRequest: false,
      request: httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
      }),
    });
    telemetry.incrementCounter({ status: 200 } as IKibanaResponse<any>);

    expect(usageCounter.incrementCounter).toHaveBeenNthCalledWith(1, {
      counterName: 'get /api/dashboards/{id} 200',
      incrementBy: undefined,
    });
  });

  it('falls back to `route.path` when `route.routePath` is missing', () => {
    const telemetry = registerDashboardApiTelemetry({
      usageCounter,
      isDashboardUiRequest: false,
      request: httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
      }),
    });
    telemetry.incrementCounter({ status: 204 } as IKibanaResponse<any>);
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'get /api/dashboards/123 204',
      incrementBy: undefined,
    });
  });
});
