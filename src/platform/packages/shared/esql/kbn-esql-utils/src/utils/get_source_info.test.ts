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

  const createHttp = (impl?: () => unknown): HttpStart => {
    const respond = jest.fn(async () => {
      if (impl) {
        return impl();
      }
      return { columns: [{ name: 'message', esType: 'keyword' }] };
    });
    return { get: respond, post: jest.fn(respond) } as unknown as HttpStart;
  };

  it('GETs the query from SOURCE_INFO_ROUTE when it fits in a URL', async () => {
    const http = createHttp();
    const result = await getESQLSourceInfo({
      query: 'FROM logs-*',
      http,
      projectRouting: '_alias:*',
      timeRange: { from: 'now-15m', to: 'now' },
      timeFieldName: '@timestamp',
    });

    expect(http.get).toHaveBeenCalledWith(SOURCE_INFO_ROUTE, {
      query: {
        request: JSON.stringify({
          query: 'FROM logs-*',
          projectRouting: '_alias:*',
          timeRange: { from: 'now-15m', to: 'now' },
          timeFieldName: '@timestamp',
          esqlVariables: undefined,
        }),
      },
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

    const posted = JSON.parse((http.get as jest.Mock).mock.calls[0][1].query.request);
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
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('evicts the cache entry when the request fails', async () => {
    const http = createHttp(() => {
      throw new Error('network');
    });
    const query = 'FROM logs-source-info-error-*';

    await expect(getESQLSourceInfo({ query, http })).rejects.toThrow('network');
    await expect(getESQLSourceInfo({ query, http })).rejects.toThrow('network');
    expect(http.get).toHaveBeenCalledTimes(2);
  });
});
