/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';
import { getESQLTimeField, getResolvedESQLTimeField } from './get_time_field';

describe('getESQLTimeField', () => {
  const createHttp = (timeField = '@timestamp'): HttpStart =>
    ({
      post: jest.fn(async () => ({ timeField })),
    } as unknown as HttpStart);

  it('does not reuse the cache across SET project_routing values for the same FROM', async () => {
    const http = createHttp();

    await getESQLTimeField({
      query: 'SET project_routing = "_alias:project-a"; FROM logs-timefield-set-*',
      http,
    });
    await getESQLTimeField({
      query: 'SET project_routing = "_alias:project-b"; FROM logs-timefield-set-*',
      http,
    });

    expect(http.post).toHaveBeenCalledTimes(2);
    expect(http.post).toHaveBeenNthCalledWith(1, TIMEFIELD_ROUTE, expect.any(Object));
    expect(http.post).toHaveBeenNthCalledWith(2, TIMEFIELD_ROUTE, expect.any(Object));
  });

  it('reuses the cache for the same SET project_routing and FROM', async () => {
    const http = createHttp();
    const query = 'SET project_routing = "_alias:project-a"; FROM logs-timefield-hit-*';

    await getESQLTimeField({ query, http });
    await getESQLTimeField({ query, http });

    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('does not reuse the cache between a LET and a FROM with the same indices', async () => {
    const http = createHttp();

    await getESQLTimeField({ query: 'FROM logs-timefield-let-*', http });
    await getESQLTimeField({ query: 'LET a = (FROM logs-timefield-let-*); FROM a', http });

    expect(http.post).toHaveBeenCalledTimes(2);
  });

  it('reuses the cache when only the pipeline of a LET changes', async () => {
    const http = createHttp();
    const query = 'LET a = (FROM logs-timefield-pipe-* | LIMIT 1); FROM a';

    await getESQLTimeField({ query, http });
    await getESQLTimeField({ query: query.replace('LIMIT 1', 'LIMIT 2'), http });

    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('does not reuse the cache when the time field inside a LET changes', async () => {
    const http = createHttp();
    const query =
      'LET a = (FROM logs-timefield-param-* | WHERE event.ingested >= ?_tstart); FROM a';

    await getESQLTimeField({ query, http });
    await getESQLTimeField({ query: query.replace('event.ingested', 'event.created'), http });

    expect(http.post).toHaveBeenCalledTimes(2);
  });

  describe('getResolvedESQLTimeField', () => {
    it('is not resolved when nothing was requested, without sending a request', async () => {
      expect(await getResolvedESQLTimeField({ query: 'FROM logs-resolved-none-*' })).toEqual({
        isResolved: false,
      });
    });

    it('returns the time field requested by someone else', async () => {
      const query = 'FROM logs-resolved-hit-*';
      await getESQLTimeField({ query, http: createHttp('event.created') });

      expect(await getResolvedESQLTimeField({ query: `${query} | LIMIT 1` })).toEqual({
        isResolved: true,
        timeField: 'event.created',
      });
    });

    it('is resolved without a time field when the source has none', async () => {
      const query = 'FROM logs-resolved-empty-*';
      const http = { post: jest.fn(async () => ({})) } as unknown as HttpStart;
      await getESQLTimeField({ query, http });

      expect(await getResolvedESQLTimeField({ query })).toEqual({
        isResolved: true,
        timeField: undefined,
      });
    });

    it('is not resolved when the request failed', async () => {
      const query = 'FROM logs-resolved-failed-*';
      const http = {
        post: jest.fn(async () => {
          throw new Error('boom');
        }),
      } as unknown as HttpStart;
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const pending = getESQLTimeField({ query, http });

      expect(await getResolvedESQLTimeField({ query })).toEqual({ isResolved: false });
      await pending;
    });
  });
});
