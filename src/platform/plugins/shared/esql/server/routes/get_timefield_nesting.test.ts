/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import { registerGetTimeFieldRoute } from './get_timefield';

jest.mock('@kbn/esql-server-utils', () => ({
  EsqlService: jest.fn().mockImplementation(() => ({
    getViews: jest.fn().mockResolvedValue({ views: [] }),
  })),
}));

const nest = (depth: number) => '('.repeat(depth) + '1' + ')'.repeat(depth);

const setup = () => {
  let handler: (...args: unknown[]) => Promise<unknown> = async () => undefined;
  const router = {
    post: jest.fn((_, routeHandler) => {
      handler = routeHandler;
    }),
  };
  const fieldCaps = jest.fn().mockResolvedValue({ fields: {} });
  const requestHandlerContext = {
    core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: { fieldCaps } } } }),
  };
  const response = {
    ok: jest.fn((r) => ({ status: 200, ...r })),
    badRequest: jest.fn((r) => ({ status: 400, ...r })),
  };
  const context = { logger: { get: () => ({ error: jest.fn() }) } };

  registerGetTimeFieldRoute(
    router as unknown as IRouter,
    context as unknown as PluginInitializerContext
  );

  return {
    call: (query: string) => handler(requestHandlerContext, { body: { query } }, response),
    response,
    fieldCaps,
  };
};

describe('get timefield route with the real parser', () => {
  it('accepts a query nested up to the limit and a normal query', async () => {
    const { call, response } = setup();
    await call(`FROM a | WHERE ${nest(50)}`);
    await call('FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend');

    expect(response.badRequest).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledTimes(2);
  });

  it('does not stall on a plainly deep query', async () => {
    const { call, response, fieldCaps } = setup();
    const start = Date.now();
    await call(`FROM a | WHERE ${nest(2000)}`);

    expect(Date.now() - start).toBeLessThan(1000);
    expect(response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
    expect(fieldCaps).not.toHaveBeenCalled();
  });

  it.each([
    ['a block comment', `/*${')'.repeat(200)}*/ FROM a | WHERE ${nest(250)}`],
    ['a line comment', `// ${')'.repeat(200)}\nFROM a | WHERE ${nest(250)}`],
    ['a string', `FROM a | WHERE y == "${')'.repeat(200)}" AND ${nest(250)}`],
    ['a backtick identifier', `FROM a | KEEP \`${')'.repeat(200)}\` | WHERE ${nest(250)}`],
  ])('does not stall on deep nesting hidden behind %s', async (_name, query) => {
    const { call, response, fieldCaps } = setup();
    const start = Date.now();
    await call(query);

    expect(Date.now() - start).toBeLessThan(1000);
    expect(response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
    expect(fieldCaps).not.toHaveBeenCalled();
  });

  it('does not reject parentheses that only appear in strings and comments', async () => {
    const { call, response } = setup();
    await call(`FROM a /* ${'('.repeat(200)} */ | WHERE y == "${'('.repeat(200)}"`);

    expect(response.badRequest).not.toHaveBeenCalled();
  });
});
