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
import { compactSpecDefinitions } from '../../../../services/compact_spec_definitions';
import { handleEsError } from '../../../../shared_imports';
import type { RouteDependencies } from '../../..';
import { registerSpecDefinitionsRoute } from '.';

jest.mock('../../../../services/compact_spec_definitions', () => {
  const actual = jest.requireActual('../../../../services/compact_spec_definitions');
  return {
    ...actual,
    compactSpecDefinitions: jest.fn(actual.compactSpecDefinitions),
  };
});

const createLargeRule = (): Record<string, unknown> =>
  Object.fromEntries(
    Array.from({ length: 40 }, (_, index) => [`property_${index}`, `value_${index}`])
  );

describe('WHEN serving Console spec definitions', () => {
  const mockRouter = httpServiceMock.createRouter();
  const compactSpecDefinitionsMock = compactSpecDefinitions as jest.MockedFunction<
    typeof compactSpecDefinitions
  >;
  let specDefinitionService: SpecDefinitionsService;
  let log: RouteDependencies['log'];

  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks does not drain a pending mockImplementationOnce queue, so
    // reset the compaction mock and reinstate the real implementation to keep a
    // one-off throw from leaking into a later test.
    compactSpecDefinitionsMock.mockReset();
    compactSpecDefinitionsMock.mockImplementation(
      jest.requireActual('../../../../services/compact_spec_definitions').compactSpecDefinitions
    );
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
    log = coreMock.createPluginInitializerContext().logger.get();
    const routeDependencies: RouteDependencies = {
      router: mockRouter,
      log,
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
    const invalidSuffixResponse = await handler(
      {},
      httpServerMock.createKibanaRequest({
        headers: { 'if-none-match': `"${etag}-bogus"` },
      }),
      kibanaResponseFactory
    );
    expect(invalidSuffixResponse.status).toBe(200);
    expect(specDefinitionService.asJson).toHaveBeenCalledTimes(1);
  });

  it('SHOULD serve uncompacted definitions when compaction throws', async () => {
    compactSpecDefinitionsMock.mockImplementationOnce(() => {
      throw new Error('compaction boom');
    });
    const [[, handler]] = mockRouter.get.mock.calls;

    const response = await handler({}, httpServerMock.createKibanaRequest(), kibanaResponseFactory);
    const payload = JSON.parse(String(response.payload));

    expect(response.status).toBe(200);
    expect(payload.es.globals).toEqual({});
    expect(payload.es.endpoints.first.data_autocomplete_rules).toEqual(
      payload.es.endpoints.second.data_autocomplete_rules
    );
    expect(payload.es.endpoints.first.data_autocomplete_rules.__scope_link).toBeUndefined();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('compaction boom'));
  });
});
