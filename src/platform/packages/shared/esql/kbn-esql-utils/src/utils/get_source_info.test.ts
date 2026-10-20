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
      signal: expect.any(AbortSignal),
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

  it.each([{ variables: undefined }, { variables: [] }])(
    'normalizes absent or empty variables ($variables)',
    ({ variables }) => {
      expect(buildEsqlSourceCacheKey('FROM logs-*', undefined, variables)).toEqual({
        cacheKey: JSON.stringify(['FROM logs-*', null, null]),
        cleanVariables: undefined,
      });
    }
  );

  it('reuses the in-flight request for absent and empty variables', async () => {
    const http = createHttp();
    const query = 'FROM logs-source-info-cache-*';

    const [first, second] = await Promise.all([
      getESQLSourceInfo({ query, http }),
      getESQLSourceInfo({ query, http, esqlVariables: [] }),
    ]);

    expect(first).toBe(second);
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('rejects a query error answered with 200 and does not cache it', async () => {
    const http = createHttp(() => ({
      columns: [],
      error: { statusCode: 400, message: 'Unknown index [lo]' },
    }));
    const query = 'FROM lo';

    await expect(getESQLSourceInfo({ query, http })).rejects.toThrow('Unknown index [lo]');
    await expect(getESQLSourceInfo({ query, http })).rejects.toThrow('Unknown index [lo]');
    expect(http.post).toHaveBeenCalledTimes(2);
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

  describe('cancellation', () => {
    /** An http mock whose requests stay pending until resolved, and reject when aborted. */
    const createPendingHttp = () => {
      const requests: Array<{ signal: AbortSignal; resolve: (value: unknown) => void }> = [];
      const http = {
        post: jest.fn(
          (_path: string, { signal }: { signal: AbortSignal }) =>
            new Promise((resolve, reject) => {
              requests.push({ signal, resolve });
              signal.addEventListener('abort', () => reject(new Error('aborted')));
            })
        ),
      } as unknown as HttpStart;
      return { http, requests };
    };
    const info = { columns: [{ name: 'message', esType: 'keyword' }] };

    it('aborts the request when its only caller aborts, and fetches again next time', async () => {
      const { http, requests } = createPendingHttp();
      const controller = new AbortController();

      const pending = getESQLSourceInfo({ query: 'FROM a', http, signal: controller.signal });
      controller.abort();

      await expect(pending).rejects.toThrow('aborted');
      expect(requests[0].signal.aborted).toBe(true);

      void getESQLSourceInfo({ query: 'FROM a', http });
      expect(http.post).toHaveBeenCalledTimes(2);
    });

    it('keeps the request for the callers that did not abort', async () => {
      const { http, requests } = createPendingHttp();
      const first = new AbortController();
      const second = new AbortController();

      const aborted = getESQLSourceInfo({ query: 'FROM b', http, signal: first.signal });
      const kept = getESQLSourceInfo({ query: 'FROM b', http, signal: second.signal });
      first.abort();
      requests[0].resolve(info);

      await expect(aborted).rejects.toThrow('aborted');
      expect(await kept).toEqual(info);
      expect(requests[0].signal.aborted).toBe(false);
      expect(http.post).toHaveBeenCalledTimes(1);
    });

    it('never aborts a request that a caller without a signal waits for', async () => {
      const { http, requests } = createPendingHttp();
      const controller = new AbortController();

      const kept = getESQLSourceInfo({ query: 'FROM c', http });
      void getESQLSourceInfo({ query: 'FROM c', http, signal: controller.signal }).catch(() => {});
      controller.abort();
      requests[0].resolve(info);

      expect(await kept).toEqual(info);
      expect(requests[0].signal.aborted).toBe(false);
    });

    it('serves a completed request from the cache even after its caller aborts', async () => {
      const { http, requests } = createPendingHttp();
      const controller = new AbortController();

      const done = getESQLSourceInfo({ query: 'FROM d', http, signal: controller.signal });
      requests[0].resolve(info);
      await done;
      controller.abort();

      expect(await getESQLSourceInfo({ query: 'FROM d', http })).toEqual(info);
      expect(http.post).toHaveBeenCalledTimes(1);
    });
  });
});
