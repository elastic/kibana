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
import { createDashboardApiTelemetryFacade } from '../../request_handler_context';

describe('dashboard api telemetry - ctx.dashboardApi.telemetry facade', () => {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  const usageCounter = usageCollection.createUsageCounter('increment_external_counter_test');
  const routePath = '/api/dashboards/{id}';
  const actualPath = '/api/dashboards/123';

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('is a noop when usageCounter is unavailable', () => {
    const telemetry = createDashboardApiTelemetryFacade({
      usageCounter: undefined,
      isDashboardUiRequest: false,
      request: httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
      }),
    });
    expect(() =>
      telemetry.incrementExternal({ status: 200 } as IKibanaResponse<any>)
    ).not.toThrow();
    expect(() =>
      telemetry.incrementExternalByType({
        totalCounterName: 'external_read_stripped_panels_total',
        byTypeCounterName: (t) => `external_read_stripped_panels_type_${t}`,
        byType: { lens: 1 },
      })
    ).not.toThrow();
  });

  it('does not increment for Dashboard UI request', () => {
    const telemetry = createDashboardApiTelemetryFacade({
      usageCounter,
      isDashboardUiRequest: true,
      request: httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
      }),
    });
    telemetry.incrementExternal({ status: 200 } as IKibanaResponse<any>);
    expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  it('increments for external request and aggregates by type', () => {
    const telemetry = createDashboardApiTelemetryFacade({
      usageCounter,
      isDashboardUiRequest: false,
      request: httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
      }),
    });
    telemetry.incrementExternal({ status: 200 } as IKibanaResponse<any>);
    telemetry.incrementExternalByType({
      totalCounterName: 'external_read_stripped_panels_total',
      byTypeCounterName: (t) => `external_read_stripped_panels_type_${t}`,
      byType: { lens: 2, map: 1 },
    });

    expect(usageCounter.incrementCounter).toHaveBeenNthCalledWith(1, {
      counterName: 'get /api/dashboards/{id} 200',
      incrementBy: undefined,
    });
    expect(usageCounter.incrementCounter).toHaveBeenNthCalledWith(2, {
      counterName: 'external_read_stripped_panels_total',
      incrementBy: 3,
    });
    expect(usageCounter.incrementCounter).toHaveBeenNthCalledWith(3, {
      counterName: 'external_read_stripped_panels_type_lens',
      incrementBy: 2,
    });
    expect(usageCounter.incrementCounter).toHaveBeenNthCalledWith(4, {
      counterName: 'external_read_stripped_panels_type_map',
      incrementBy: 1,
    });
  });

  it('falls back to `route.path` when `route.routePath` is missing', () => {
    const telemetry = createDashboardApiTelemetryFacade({
      usageCounter,
      isDashboardUiRequest: false,
      request: httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
      }),
    });
    telemetry.incrementExternal({ status: 204 } as IKibanaResponse<any>);
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'get /api/dashboards/123 204',
      incrementBy: undefined,
    });
  });
});
