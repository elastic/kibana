/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { validateQuery } from '@kbn/esql-language';
import { buildServerESQLCallbacks } from './build_server_esql_callbacks';

const makeClient = (resolveIndexMock: jest.Mock) =>
  ({ indices: { resolveIndex: resolveIndexMock } } as unknown as ElasticsearchClient);

describe('buildServerESQLCallbacks.getSources', () => {
  it('includes remote sources', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValue({ indices: [{ name: 'logs-test' }, { name: 'remote:logs' }] });
    const { getSources } = buildServerESQLCallbacks({ client: makeClient(resolveIndex) });

    const sources = await getSources?.();

    expect(sources?.map(({ name }) => name)).toEqual(['logs-test', 'remote:logs']);
    expect(resolveIndex).toHaveBeenCalledTimes(2);
    expect(resolveIndex).toHaveBeenCalledWith(expect.objectContaining({ name: ['*', '*:*'] }), {
      signal: undefined,
    });
  });

  it('falls back to local sources when the remote lookup fails', async () => {
    const resolveIndex = jest.fn().mockImplementation(async ({ name }) => {
      if (name.includes('*:*')) {
        throw new Error('node does not have the remote cluster client role enabled');
      }
      return { indices: [{ name: 'logs-test' }] };
    });
    const { getSources } = buildServerESQLCallbacks({ client: makeClient(resolveIndex) });

    const sources = await getSources?.();

    expect(sources?.map(({ name }) => name)).toEqual(['logs-test']);
  });

  it('reports remote sources as unknown after falling back', async () => {
    const resolveIndex = jest.fn().mockImplementation(async ({ name }) => {
      if (name.includes('*:*')) {
        throw new Error('node does not have the remote cluster client role enabled');
      }
      return { indices: [{ name: 'logs-test' }] };
    });
    const callbacks = buildServerESQLCallbacks({ client: makeClient(resolveIndex) });

    const { errors } = await validateQuery('FROM remote:logs | LIMIT 10', callbacks);

    expect(errors).toEqual([expect.objectContaining({ code: 'unknownDataSource' })]);
  });
});
