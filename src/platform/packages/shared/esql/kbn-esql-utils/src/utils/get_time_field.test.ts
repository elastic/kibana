/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { TIMEFIELD_ROUTE, TIMEFIELD_GET_MAX_QUERY_LENGTH } from '@kbn/esql-types';
import { getESQLTimeField } from './get_time_field';

describe('getESQLTimeField', () => {
  const createHttp = (timeField = '@timestamp'): HttpStart =>
    ({
      post: jest.fn(async () => ({ timeField })),
      get: jest.fn(async () => ({ timeField })),
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

    // Both queries are short, so they go through the cacheable GET path.
    expect(http.get).toHaveBeenCalledTimes(2);
    expect(http.get).toHaveBeenNthCalledWith(1, TIMEFIELD_ROUTE, expect.any(Object));
    expect(http.get).toHaveBeenNthCalledWith(2, TIMEFIELD_ROUTE, expect.any(Object));
  });

  it('reuses the cache for the same SET project_routing and FROM', async () => {
    const http = createHttp();
    const query = 'SET project_routing = "_alias:project-a"; FROM logs-timefield-hit-*';

    await getESQLTimeField({ query, http });
    await getESQLTimeField({ query, http });

    expect(http.get).toHaveBeenCalledTimes(1);
  });

  describe('GET/POST selection (cacheable GET vs. uncached POST)', () => {
    it('uses GET for a short query', async () => {
      const http = createHttp();
      const query = 'FROM logs-timefield-get-short-*';

      await getESQLTimeField({ query, http });

      expect(http.get).toHaveBeenCalledWith(
        TIMEFIELD_ROUTE,
        expect.objectContaining({ query: { query, projectRouting: undefined } })
      );
      expect(http.post).not.toHaveBeenCalled();
    });

    it('falls back to POST once the encoded query string exceeds the GET threshold', async () => {
      const http = createHttp();
      // A single long clause comfortably pushes the encoded query string over the
      // threshold once URL-encoded (spaces/pipes expand under encodeURIComponent).
      const query = 'FROM logs-timefield-get-long-* | WHERE message == "' + 'x'.repeat(3000) + '"';

      await getESQLTimeField({ query, http });

      expect(http.post).toHaveBeenCalledWith(TIMEFIELD_ROUTE, {
        body: JSON.stringify({ query, projectRouting: undefined }),
      });
      expect(http.get).not.toHaveBeenCalled();
    });

    it('falls back to POST when projectRouting alone pushes the total length over the threshold', async () => {
      const http = createHttp();
      const query = 'FROM logs-timefield-get-routing-*';
      const projectRouting = 'x'.repeat(TIMEFIELD_GET_MAX_QUERY_LENGTH);

      await getESQLTimeField({ query, http, projectRouting });

      expect(http.post).toHaveBeenCalledWith(TIMEFIELD_ROUTE, {
        body: JSON.stringify({ query, projectRouting }),
      });
      expect(http.get).not.toHaveBeenCalled();
    });

    it('still dedupes concurrent calls regardless of which verb is used', async () => {
      const http = createHttp();
      const query = 'FROM logs-timefield-get-dedupe-*';

      await Promise.all([getESQLTimeField({ query, http }), getESQLTimeField({ query, http })]);

      expect(http.get).toHaveBeenCalledTimes(1);
    });
  });
});
