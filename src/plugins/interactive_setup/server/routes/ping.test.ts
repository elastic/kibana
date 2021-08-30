/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';

import type { ObjectType } from '@kbn/config-schema';
import type { IRouter, RequestHandler, RequestHandlerContext, RouteConfig } from 'src/core/server';
import { kibanaResponseFactory } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import { interactiveSetupMock } from '../mocks';
import { routeDefinitionParamsMock } from './index.mock';
import { definePingRoute } from './ping';

describe('Configure routes', () => {
  let router: jest.Mocked<IRouter>;
  let mockRouteParams: ReturnType<typeof routeDefinitionParamsMock.create>;
  let mockContext: RequestHandlerContext;
  beforeEach(() => {
    mockRouteParams = routeDefinitionParamsMock.create();
    router = mockRouteParams.router;

    mockContext = ({} as unknown) as RequestHandlerContext;

    definePingRoute(mockRouteParams);
  });

  describe('#ping', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;

    beforeEach(() => {
      const [configureRouteConfig, configureRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/interactive_setup/ping'
      )!;

      routeConfig = configureRouteConfig;
      routeHandler = configureRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ authRequired: false });

      const bodySchema = (routeConfig.validate as any).body as ObjectType;
      expect(() => bodySchema.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"[host]: expected value of type [string] but got [undefined]."`
      );
      expect(() => bodySchema.validate({ host: '' })).toThrowErrorMatchingInlineSnapshot(
        `"[host]: \\"host\\" is not allowed to be empty"`
      );
      expect(() =>
        bodySchema.validate({ host: 'localhost:9200' })
      ).toThrowErrorMatchingInlineSnapshot(`"[host]: expected URI with scheme [http|https]."`);
      expect(() => bodySchema.validate({ host: 'http://localhost:9200' })).not.toThrowError();
    });

    it('fails if setup is not on hold.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(false);

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { host: 'host' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 400,
        options: { body: 'Cannot process request outside of preboot stage.' },
        payload: 'Cannot process request outside of preboot stage.',
      });

      expect(mockRouteParams.elasticsearch.authenticate).not.toHaveBeenCalled();
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('fails if ping call fails.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);
      mockRouteParams.elasticsearch.ping.mockRejectedValue(
        new errors.ResponseError(
          interactiveSetupMock.createApiResponse({
            statusCode: 401,
            body: { message: 'some-secret-message' },
          })
        )
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { host: 'host' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 500,
        options: {
          body: { message: 'Failed to ping cluster.', attributes: { type: 'ping_failure' } },
          statusCode: 500,
        },
        payload: { message: 'Failed to ping cluster.', attributes: { type: 'ping_failure' } },
      });

      expect(mockRouteParams.elasticsearch.ping).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('can successfully ping.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { host: 'host' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 200,
        options: {},
        payload: undefined,
      });

      expect(mockRouteParams.elasticsearch.ping).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.elasticsearch.ping).toHaveBeenCalledWith('host');
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });
  });
});
