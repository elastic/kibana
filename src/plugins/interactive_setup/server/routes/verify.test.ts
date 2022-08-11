/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { IRouter, RequestHandler, RequestHandlerContext, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import { routeDefinitionParamsMock } from './index.mock';
import { defineVerifyRoute } from './verify';

describe('Configure routes', () => {
  let router: jest.Mocked<IRouter>;
  let mockRouteParams: ReturnType<typeof routeDefinitionParamsMock.create>;
  let mockContext: RequestHandlerContext;
  beforeEach(() => {
    mockRouteParams = routeDefinitionParamsMock.create();
    router = mockRouteParams.router;

    mockContext = {} as unknown as RequestHandlerContext;

    defineVerifyRoute(mockRouteParams);
  });

  describe('#verify', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;

    beforeEach(() => {
      const [verifyRouteConfig, verifyRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/interactive_setup/verify'
      )!;

      routeConfig = verifyRouteConfig;
      routeHandler = verifyRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ authRequired: false });

      const bodySchema = (routeConfig.validate as any).body as ObjectType;
      expect(() => bodySchema.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"[code]: expected value of type [string] but got [undefined]"`
      );
      expect(bodySchema.validate({ code: '123456' })).toMatchInlineSnapshot(`
        Object {
          "code": "123456",
        }
      `);
    });

    it('fails if verification code is invalid.', async () => {
      mockRouteParams.verificationCode.verify.mockReturnValue(false);

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { code: '123456' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual(
        expect.objectContaining({
          status: 403,
        })
      );
    });

    it('succeeds if verification code is valid.', async () => {
      mockRouteParams.verificationCode.verify.mockReturnValue(true);

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { code: '123456' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual(
        expect.objectContaining({
          status: 204,
        })
      );
    });
  });
});
