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
import { telemetryHandler } from './telemetry_handler';

describe('dashboard api telemetry handler', () => {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  const usageCounter = usageCollection.createUsageCounter('dashboard_api');
  const routePath = '/api/dashboards/{id}';
  const actualPath = '/api/dashboards/123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('telemetryHandler', () => {
    it('does not increment when usageCounter is unavailable', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      const result = await telemetryHandler(request, undefined, () => response);

      expect(result).toBe(response);
      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('does not increment for Kibana-origin requests', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
        headers: {
          [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
        },
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      const result = await telemetryHandler(request, usageCounter, () => response);

      expect(result).toBe(response);
      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('does not increment when `route.routePath` is missing', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      const result = await telemetryHandler(request, usageCounter, () => response);

      expect(result).toBe(response);
      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('returns handler response and increments exactly once', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: '/api/dashboards',
        routePath: '/api/dashboards',
      });

      const response = { status: 201 } as IKibanaResponse<any>;
      const result = await telemetryHandler(request, usageCounter, () => response);

      expect(result).toBe(response);
      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'post /api/dashboards 201',
      });
    });
  });
});
