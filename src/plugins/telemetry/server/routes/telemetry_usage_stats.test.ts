/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerTelemetryUsageStatsRoutes } from './telemetry_usage_stats';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { RequestHandlerContext, IRouter } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { telemetryCollectionManagerPluginMock } from '@kbn/telemetry-collection-manager-plugin/server/mocks';

async function runRequest(
  mockRouter: IRouter<RequestHandlerContext>,
  body?: { unencrypted?: boolean; refreshCache?: boolean }
) {
  expect(mockRouter.post).toBeCalled();
  const [, handler] = (mockRouter.post as jest.Mock).mock.calls[0];
  const mockResponse = httpServerMock.createResponseFactory();
  const mockRequest = httpServerMock.createKibanaRequest({ body });
  await handler(null, mockRequest, mockResponse);

  return { mockResponse, mockRequest };
}

describe('registerTelemetryUsageStatsRoutes', () => {
  const router = {
    handler: undefined,
    config: undefined,
    post: jest.fn().mockImplementation((config, handler) => {
      router.config = config;
      router.handler = handler;
    }),
  };
  const telemetryCollectionManager = telemetryCollectionManagerPluginMock.createSetupContract();
  const mockCoreSetup = coreMock.createSetup();
  const mockStats = [{ clusterUuid: 'text', stats: 'enc_str' }];
  telemetryCollectionManager.getStats.mockResolvedValue(mockStats);
  const getSecurity = jest.fn();

  let mockRouter: IRouter;
  beforeEach(() => {
    mockRouter = mockCoreSetup.http.createRouter();
  });

  describe('clusters/_stats POST route', () => {
    it('registers _stats POST route and accepts body configs', () => {
      registerTelemetryUsageStatsRoutes(mockRouter, telemetryCollectionManager, true, getSecurity);
      expect(mockRouter.post).toBeCalledTimes(1);
      const [routeConfig, handler] = (mockRouter.post as jest.Mock).mock.calls[0];
      expect(routeConfig.path).toMatchInlineSnapshot(`"/api/telemetry/v2/clusters/_stats"`);
      expect(Object.keys(routeConfig.validate.body.props)).toEqual(['unencrypted', 'refreshCache']);
      expect(handler).toBeInstanceOf(Function);
    });

    it('responds with encrypted stats with no cache refresh by default', async () => {
      registerTelemetryUsageStatsRoutes(mockRouter, telemetryCollectionManager, true, getSecurity);

      const { mockResponse } = await runRequest(mockRouter);
      expect(telemetryCollectionManager.getStats).toBeCalledWith({
        unencrypted: undefined,
        refreshCache: undefined,
      });
      expect(mockResponse.ok).toBeCalled();
      expect(mockResponse.ok.mock.calls[0][0]).toEqual({ body: mockStats });
    });

    it('when unencrypted is set getStats is called with unencrypted and refreshCache', async () => {
      registerTelemetryUsageStatsRoutes(mockRouter, telemetryCollectionManager, true, getSecurity);

      await runRequest(mockRouter, { unencrypted: true });
      expect(telemetryCollectionManager.getStats).toBeCalledWith({
        unencrypted: true,
        refreshCache: true,
      });
    });

    it('calls getStats with refreshCache when set in body', async () => {
      registerTelemetryUsageStatsRoutes(mockRouter, telemetryCollectionManager, true, getSecurity);
      await runRequest(mockRouter, { refreshCache: true });
      expect(telemetryCollectionManager.getStats).toBeCalledWith({
        unencrypted: undefined,
        refreshCache: true,
      });
    });

    it('calls getStats with refreshCache:true even if set to false in body when unencrypted is set to true', async () => {
      registerTelemetryUsageStatsRoutes(mockRouter, telemetryCollectionManager, true, getSecurity);
      await runRequest(mockRouter, {
        refreshCache: false,
        unencrypted: true,
      });
      expect(telemetryCollectionManager.getStats).toBeCalledWith({
        unencrypted: true,
        refreshCache: true,
      });
    });

    it('returns 403 when the user does not have enough permissions to request unencrypted telemetry', async () => {
      const getSecurityMock = jest.fn().mockImplementation(() => {
        const securityStartMock = securityMock.createStart();
        securityStartMock.authz.checkPrivilegesWithRequest.mockReturnValue({
          globally: () => ({ hasAllRequested: false }),
        });
        return securityStartMock;
      });
      registerTelemetryUsageStatsRoutes(
        mockRouter,
        telemetryCollectionManager,
        true,
        getSecurityMock
      );
      const { mockResponse } = await runRequest(mockRouter, {
        refreshCache: false,
        unencrypted: true,
      });
      expect(mockResponse.forbidden).toBeCalled();
    });

    it('returns 200 when the user has enough permissions to request unencrypted telemetry', async () => {
      const getSecurityMock = jest.fn().mockImplementation(() => {
        const securityStartMock = securityMock.createStart();
        securityStartMock.authz.checkPrivilegesWithRequest.mockReturnValue({
          globally: () => ({ hasAllRequested: true }),
        });
        return securityStartMock;
      });
      registerTelemetryUsageStatsRoutes(
        mockRouter,
        telemetryCollectionManager,
        true,
        getSecurityMock
      );
      const { mockResponse } = await runRequest(mockRouter, {
        refreshCache: false,
        unencrypted: true,
      });
      expect(mockResponse.ok).toBeCalled();
    });

    it('returns 200 when the user does not have enough permissions to request unencrypted telemetry but it requests encrypted', async () => {
      const getSecurityMock = jest.fn().mockImplementation(() => {
        const securityStartMock = securityMock.createStart();
        securityStartMock.authz.checkPrivilegesWithRequest.mockReturnValue({
          globally: () => ({ hasAllRequested: false }),
        });
        return securityStartMock;
      });
      registerTelemetryUsageStatsRoutes(
        mockRouter,
        telemetryCollectionManager,
        true,
        getSecurityMock
      );
      const { mockResponse } = await runRequest(mockRouter, {
        refreshCache: false,
        unencrypted: false,
      });
      expect(mockResponse.ok).toBeCalled();
    });

    it.todo('always returns an empty array on errors on encrypted payload');
    it.todo('returns the actual request error object when in development mode');
    it.todo('returns forbidden on unencrypted and ES returns 403 in getStats');
  });
});
