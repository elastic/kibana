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
  const agenticUsageCounter = usageCollection.createUsageCounter('dashboard_api_agentic');
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
      const result = await telemetryHandler(request, undefined, undefined, () => response);

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
      const result = await telemetryHandler(request, usageCounter, undefined, () => response);

      expect(result).toBe(response);
      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('does not increment when `route.routePath` is missing', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      const result = await telemetryHandler(request, usageCounter, undefined, () => response);

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
      const result = await telemetryHandler(request, usageCounter, undefined, () => response);

      expect(result).toBe(response);
      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'post /api/dashboards 201',
      });
    });
  });

  describe('agentic telemetry', () => {
    it('increments both counters for elastic-agentic user-agent', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: '/api/dashboards',
        routePath: '/api/dashboards',
        headers: { 'user-agent': 'elastic-agentic' },
      });

      const response = { status: 201 } as IKibanaResponse<any>;
      await telemetryHandler(request, usageCounter, agenticUsageCounter, () => response);

      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'post /api/dashboards 201',
      });
      expect(agenticUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'post /api/dashboards 201',
      });
    });

    it('does not increment agentic counter for non-agentic requests', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
        headers: { 'user-agent': 'Mozilla/5.0' },
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      await telemetryHandler(request, usageCounter, agenticUsageCounter, () => response);

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(agenticUsageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('excludes agentic counter for Kibana-origin requests even with elastic-agentic user-agent', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
        headers: {
          [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
          'user-agent': 'elastic-agentic',
        },
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      await telemetryHandler(request, usageCounter, agenticUsageCounter, () => response);

      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
      expect(agenticUsageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('matches elastic-agentic user-agent case-insensitively', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
        headers: { 'user-agent': 'Elastic-Agentic/1.0' },
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      await telemetryHandler(request, usageCounter, agenticUsageCounter, () => response);

      expect(agenticUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when agenticUsageCounter is undefined', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
        headers: { 'user-agent': 'elastic-agentic' },
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      await telemetryHandler(request, usageCounter, undefined, () => response);

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(agenticUsageCounter.incrementCounter).not.toHaveBeenCalled();
    });
  });
});
