/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { EsLegacyConfigService, SpecDefinitionsService } from '../../../../services';
import { handleEsError } from '../../../../shared_imports';
import type { RouteDependencies } from '../../..';
import { registerSpecDefinitionsRoute } from '.';

const createLargeRule = (): Record<string, unknown> =>
  Object.fromEntries(
    Array.from({ length: 40 }, (_, index) => [`property_${index}`, `value_${index}`])
  );

describe('WHEN serving Console spec definitions', () => {
  const mockRouter = httpServiceMock.createRouter();
  let specDefinitionService: SpecDefinitionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    specDefinitionService = new SpecDefinitionsService();
    const repeatedRules = createLargeRule();
    jest.spyOn(specDefinitionService, 'asJson').mockReturnValue({
      name: 'es',
      globals: {},
      endpoints: {
        first: { data_autocomplete_rules: repeatedRules },
        second: { data_autocomplete_rules: structuredClone(repeatedRules) },
      },
    });
    const routeDependencies: RouteDependencies = {
      router: mockRouter,
      log: coreMock.createPluginInitializerContext().logger.get(),
      getStartServices: coreMock.createSetup().getStartServices,
      proxy: {
        readLegacyESConfig: jest.fn(),
      },
      services: {
        esLegacyConfigService: new EsLegacyConfigService(),
        specDefinitionService,
      },
      lib: { handleEsError },
    };
    registerSpecDefinitionsRoute(routeDependencies);
  });

  it('SHOULD compact repeated rules and return revalidation headers', async () => {
    const [[, handler]] = mockRouter.get.mock.calls;
    const request = httpServerMock.createKibanaRequest();

    const response = await handler({}, request, kibanaResponseFactory);
    const payload = JSON.parse(String(response.payload));

    expect(response.status).toBe(200);
    expect(response.options.headers).toEqual(
      expect.objectContaining({
        'cache-control': 'private, no-cache',
        'content-type': 'application/json',
        vary: 'accept-encoding',
        etag: expect.any(String),
      })
    );
    expect(Object.keys(payload.es.globals)).toEqual([
      expect.stringMatching(/^__generated_[a-f0-9]+$/),
    ]);
    expect(payload.es.endpoints.first.data_autocomplete_rules).toEqual({
      __scope_link: expect.stringMatching(/^GLOBAL\.__generated_[a-f0-9]+$/),
    });
  });

  it('SHOULD return not modified when the cached response ETag matches', async () => {
    const [[, handler]] = mockRouter.get.mock.calls;
    const firstResponse = await handler(
      {},
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );
    const etag = firstResponse.options.headers?.etag;
    if (typeof etag !== 'string') {
      throw new Error('Expected the first response to include an ETag');
    }

    const response = await handler(
      {},
      httpServerMock.createKibanaRequest({
        headers: { 'if-none-match': `"other", W/"${etag}-gzip"` },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(304);
    const wildcardResponse = await handler(
      {},
      httpServerMock.createKibanaRequest({
        headers: { 'if-none-match': '*' },
      }),
      kibanaResponseFactory
    );
    expect(wildcardResponse.status).toBe(304);
    expect(specDefinitionService.asJson).toHaveBeenCalledTimes(1);
  });
});
