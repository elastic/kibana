/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { kibanaResponseFactory } from '@kbn/core/server';
import { ESQLExtensionsRegistry } from '../extensions_registry';
import { registerESQLExtensionsRoute } from './get_esql_extensions_route';

const MAX_QUERY_LENGTH = 10000;
const nest = (depth: number) => '('.repeat(depth) + 'x' + ')'.repeat(depth);

describe('ESQL extensions route', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const registry = new ESQLExtensionsRegistry();
    jest.spyOn(registry, 'getRecommendedQueries');
    registerESQLExtensionsRoute(router, registry, coreMock.createPluginInitializerContext());
    const [config, handler] = router.get.mock.calls[0];
    const context = coreMock.createRequestHandlerContext();
    context.elasticsearch.client.asCurrentUser.indices.resolveIndex.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [],
    } as never);
    const call = (query: string) =>
      handler(
        coreMock.createCustomRequestHandlerContext(context) as never,
        httpServerMock.createKibanaRequest({ params: { solutionId: 'oblt', query } }),
        kibanaResponseFactory
      );
    return { config, call, registry };
  };

  it('serves a normal query', async () => {
    const { call, registry } = setup();
    const response = await call('FROM logs-* | LIMIT 10');

    expect(response.status).toBe(200);
    expect(registry.getRecommendedQueries).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['deeply nested parentheses', `FROM a | WHERE ${nest(2000)}`],
    [
      'deep nesting behind a comment full of closing parentheses',
      `/*${')'.repeat(200)}*/ FROM a | WHERE ${nest(250)}`,
    ],
    [
      'deep nesting behind a string full of closing parentheses',
      `FROM a | WHERE y == "${')'.repeat(200)}" AND ${nest(250)}`,
    ],
  ])('answers quickly without recommendations for %s', async (_name, query) => {
    const { call } = setup();
    const start = Date.now();
    const response = await call(query);

    expect(Date.now() - start).toBeLessThan(1000);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ recommendedQueries: [], recommendedFields: [] });
  });

  it('rejects a query longer than the maximum length', () => {
    const { config } = setup();
    const { params } = config.validate as {
      params: { validate: (value: unknown) => unknown };
    };

    expect(() =>
      params.validate({ solutionId: 'oblt', query: 'a'.repeat(MAX_QUERY_LENGTH + 1) })
    ).toThrow();
  });
});
