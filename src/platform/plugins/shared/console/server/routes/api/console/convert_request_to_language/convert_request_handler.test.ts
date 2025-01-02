/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { createMockRouter, MockRouter, routeHandlerContextMock } from '../../__mocks__/routes.mock';
import { createRequestMock } from '../../__mocks__/request.mock';
import { handleEsError } from '../../../../shared_imports';

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
});
