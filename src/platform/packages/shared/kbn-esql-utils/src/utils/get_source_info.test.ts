/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { ESQLVariableType, SOURCE_INFO_ROUTE } from '@kbn/esql-types';
import {
  buildEsqlSourceCacheKey,
  clearESQLSourceInfoCache,
  getESQLSourceInfo,
} from './get_source_info';

describe('getESQLSourceInfo', () => {
  beforeEach(() => {
    clearESQLSourceInfoCache();
  });

  const createHttp = (impl?: (path: string, options: { body: string }) => unknown): HttpStart => {
    return {
      post: jest.fn(async (path: string, options: { body: string }) => {
        if (impl) {
          return impl(path, options);
        }
        return { columns: [{ name: 'message', esType: 'keyword' }] };
      }),
    } as unknown as HttpStart;
  };

  it('POSTs the query to SOURCE_INFO_ROUTE', async () => {
    const http = createHttp();
    const result = await getESQLSourceInfo({
      query: 'FROM logs-*',
      http,
      projectRouting: '_alias:*',
      timeRange: { from: 'now-15m', to: 'now' },
      timeFieldName: '@timestamp',
    });

    expect(http.post).toHaveBeenCalledWith(SOURCE_INFO_ROUTE, {
      body: JSON.stringify({
        query: 'FROM logs-*',
        projectRouting: '_alias:*',
        timeRange: { from: 'now-15m', to: 'now' },
        timeFieldName: '@timestamp',
        esqlVariables: undefined,
      }),
    });
    expect(result.columns).toEqual([{ name: 'message', esType: 'keyword' }]);
  });

  it('strips meta from control variables before posting and caching', async () => {
    const http = createHttp();
    const variables = [
      {
        key: 'field',
        value: 'message',
        type: ESQLVariableType.FIELDS,
        meta: { controlledBy: 'control-1' },
      },
    ];

    await getESQLSourceInfo({
      query: 'FROM logs-* | KEEP ??field',
      http,
      esqlVariables: variables,
    });

    const posted = JSON.parse((http.post as jest.Mock).mock.calls[0][1].body);
    expect(posted.esqlVariables).toEqual([
      { key: 'field', value: 'message', type: ESQLVariableType.FIELDS },
    ]);
    expect(posted.esqlVariables[0]).not.toHaveProperty('meta');

    const { cacheKey } = buildEsqlSourceCacheKey(
      'FROM logs-* | KEEP ??field',
      undefined,
      variables
    );
    const withoutMeta = buildEsqlSourceCacheKey('FROM logs-* | KEEP ??field', undefined, [
      { key: 'field', value: 'message', type: ESQLVariableType.FIELDS },
    ]);
    expect(cacheKey).toBe(withoutMeta.cacheKey);
  });

  it('reuses the in-flight request for the same cache key', async () => {
    const http = createHttp();
    const query = 'FROM logs-source-info-cache-*';

    const [first, second] = await Promise.all([
      getESQLSourceInfo({ query, http }),
      getESQLSourceInfo({ query, http }),
    ]);

    expect(first).toBe(second);
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('evicts the cache entry when the request fails', async () => {
    const http = createHttp(() => {
      throw new Error('network');
    });
    const query = 'FROM logs-source-info-error-*';

    await expect(getESQLSourceInfo({ query, http })).rejects.toThrow('network');
    await expect(getESQLSourceInfo({ query, http })).rejects.toThrow('network');
    expect(http.post).toHaveBeenCalledTimes(2);
  });
});
