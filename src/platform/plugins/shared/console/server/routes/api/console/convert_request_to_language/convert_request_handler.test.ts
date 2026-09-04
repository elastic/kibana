/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { mockRouter as coreRouterMock } from '@kbn/core-http-router-server-mocks';
import type { RouteValidatorFullConfigRequest } from '@kbn/core-http-server';
import type { MockRouter } from '../../__mocks__/routes.mock';
import { createMockRouter, routeHandlerContextMock } from '../../__mocks__/routes.mock';
import { createRequestMock } from '../../__mocks__/request.mock';
import { handleEsError } from '../../../../shared_imports';
import type { RouteDependencies } from '../../..';

import { registerConvertRequestRoute } from '.';

jest.mock('@elastic/request-converter', () => ({
  convertRequests: (request: string, language: string, options: any) => {
    return Promise.resolve({
      converted: true,
      meta: {
        request,
        language,
        options,
      },
    });
  },
}));

describe('Console convert request to language route', () => {
  let mockRouter: MockRouter;
  let routeDependencies: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      router: mockRouter,
      lib: { handleEsError },
    };
    registerConvertRequestRoute(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/console/convert_request_to_language', () => {
    it('Correctly validates url validation config', async () => {
      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/console/convert_request_to_language',
      })(
        routeHandlerContextMock,
        createRequestMock({
          query: {
            method: 'PUT',
            path: '_ingest/geoip/database/geoip2_enterprise',
            language: 'javascript',
            esHost: 'http://localhost:9200',
          },
          body: [
            '{\n  "name": "GeoIP2-Enterprise",\n  "maxmind": {\n    "account_id": "1234567"\n  }\n}',
          ],
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload.converted).toBe(true);
    });

    it('Throws error if some params are missing', async () => {
      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/console/convert_request_to_language',
      })(
        routeHandlerContextMock,
        createRequestMock({
          query: {
            method: 'GET',
            path: '_ingest/geoip/database/geoip2_enterprise',
            esHost: 'http://localhost:9200',
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
    });
  });

  describe('body validation', () => {
    const getRouteValidation = () => {
      const router = coreRouterMock.create();
      registerConvertRequestRoute({
        router,
        lib: { handleEsError },
      } as unknown as RouteDependencies);
      // The route registers the plain { query, body } validator config object
      return router.post.mock.calls[0][0].validate as RouteValidatorFullConfigRequest<
        unknown,
        unknown,
        unknown
      >;
    };

    const createRequestWithBody = (dataStringLength: number) =>
      coreRouterMock.createKibanaRequest({
        method: 'post',
        query: {
          language: 'curl',
          esHost: 'http://localhost:9200',
          kibanaHost: 'http://localhost:5601',
        },
        body: [
          {
            method: 'PUT',
            url: 'kbn:/api/dashboards/create',
            data: ['x'.repeat(dataStringLength)],
          },
        ],
        validation: getRouteValidation(),
      });

    it('accepts a data string of 100000 characters', () => {
      expect(() => createRequestWithBody(100000)).not.toThrow();
    });

    it('rejects a data string of 100001 characters', () => {
      expect(() => createRequestWithBody(100001)).toThrow(
        'value has length [100001] but it must have a maximum length of [100000]'
      );
    });
  });
});
