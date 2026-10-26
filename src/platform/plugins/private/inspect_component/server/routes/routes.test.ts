/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter as router } from '@kbn/core-http-router-server-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { httpResourcesMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerInspectComponentRoutes } from './routes';
import { getComponentData, getComponentDataBodySchema } from './component_data/get_component_data';
import type { GetComponentDataRequestBody } from './component_data/get_component_data';

jest.mock('./component_data/get_component_data');

describe('registerInspectComponentRoutes', () => {
  const mockRouter = router.create();
  const mockHttpService = httpServiceMock.createSetupContract();
  const mockLogger = loggingSystemMock.create().get();

  beforeEach(() => {
    mockHttpService.createRouter.mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it('should create a router through the http service', () => {
    registerInspectComponentRoutes({
      httpService: mockHttpService,
      logger: mockLogger,
    });

    expect(mockHttpService.createRouter).toHaveBeenCalledTimes(1);
  });

  describe('POST /internal/inspect_component/inspect', () => {
    it('should register the inspect POST route with the correct path and config', () => {
      registerInspectComponentRoutes({
        httpService: mockHttpService,
        logger: mockLogger,
      });

      expect(mockRouter.post).toHaveBeenCalledTimes(1);
      expect(mockRouter.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/internal/inspect_component/inspect',
          options: {
            access: 'internal',
          },
          security: {
            authz: {
              enabled: false,
              reason: 'This route is opted out from authorization',
            },
          },
          validate: {
            body: getComponentDataBodySchema,
          },
        }),
        expect.any(Function)
      );
    });

    it('should call getComponentData with the correct parameters when route handler is executed', async () => {
      const mockRequest = { body: { path: 'test/path' } } as KibanaRequest<
        any,
        any,
        GetComponentDataRequestBody
      >;
      const mockResponse = httpResourcesMock.createResponseFactory();
      const mockContext = {};

      registerInspectComponentRoutes({
        httpService: mockHttpService,
        logger: mockLogger,
      });

      const routeHandler = mockRouter.post.mock.calls[0][1];

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(getComponentData).toHaveBeenCalledWith({
        req: mockRequest,
        res: mockResponse,
        logger: mockLogger,
      });
    });
  });
});
