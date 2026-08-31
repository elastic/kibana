/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { JOIN_INDICES_AUTOCOMPLETE_ROUTE } from '@kbn/esql-types';
import { getJoinIndices } from './lookup_indices';

const mockResult = { indices: [{ name: 'my_lookup', mode: 'lookup', aliases: [] }] };

const createHttp = () => ({ get: jest.fn().mockResolvedValue(mockResult) } as unknown as HttpStart);

describe('getJoinIndices', () => {
  it('calls the correct route', async () => {
    const http = createHttp();
    await getJoinIndices('FROM logs', http);
    expect(http.get).toHaveBeenCalledWith(JOIN_INDICES_AUTOCOMPLETE_ROUTE, expect.any(Object));
  });

  it('does not include remoteClusters when query has no remote clusters', async () => {
    const http = createHttp();
    await getJoinIndices('FROM logs', http);
    const { query } = (http.get as jest.Mock).mock.calls[0][1];
    expect(query).not.toHaveProperty('remoteClusters');
  });

  it('extracts remoteClusters from query and includes them', async () => {
    const http = createHttp();
    await getJoinIndices('FROM cluster1:logs, cluster2:metrics', http);
    const { query } = (http.get as jest.Mock).mock.calls[0][1];
    expect(query.remoteClusters).toContain('cluster1');
    expect(query.remoteClusters).toContain('cluster2');
  });

  it('includes projectRouting when provided', async () => {
    const http = createHttp();
    await getJoinIndices('FROM logs', http, '_alias:*');
    const { query } = (http.get as jest.Mock).mock.calls[0][1];
    expect(query.projectRouting).toBe('_alias:*');
  });

  it('does not include projectRouting when not provided', async () => {
    const http = createHttp();
    await getJoinIndices('FROM logs', http);
    const { query } = (http.get as jest.Mock).mock.calls[0][1];
    expect(query).not.toHaveProperty('projectRouting');
  });

  it('returns the server response', async () => {
    const http = createHttp();
    const result = await getJoinIndices('FROM logs', http);
    expect(result).toEqual(mockResult);
  });
});
