/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { coreMock } from '@kbn/core/public/mocks';
import { getJoinIndices } from './lookup_indices';

const JOIN_INDICES_ROUTE = '/internal/esql/autocomplete/join/indices';

describe('getJoinIndices', () => {
  it('forwards projectRouting in the request query when provided', async () => {
    const core = coreMock.createStart();
    core.http.get = jest.fn().mockResolvedValue({ indices: [] });

    await getJoinIndices('FROM my_index', core.http, undefined, 'proj-a');

    expect(core.http.get).toHaveBeenCalledWith(JOIN_INDICES_ROUTE, {
      query: { projectRouting: 'proj-a' },
    });
  });

  it('omits projectRouting from the query when not provided', async () => {
    const core = coreMock.createStart();
    core.http.get = jest.fn().mockResolvedValue({ indices: [] });

    await getJoinIndices('FROM my_index_b', core.http);

    expect(core.http.get).toHaveBeenCalledWith(JOIN_INDICES_ROUTE, { query: {} });
  });

  it('keys the cache by projectRouting so different routings each trigger a fetch', async () => {
    const core = coreMock.createStart();
    core.http.get = jest.fn().mockResolvedValue({ indices: [] });

    await getJoinIndices('FROM my_index_c', core.http, undefined, 'proj-c1');
    await getJoinIndices('FROM my_index_c', core.http, undefined, 'proj-c2');

    expect(core.http.get).toHaveBeenCalledTimes(2);
    expect(core.http.get).toHaveBeenNthCalledWith(1, JOIN_INDICES_ROUTE, {
      query: { projectRouting: 'proj-c1' },
    });
    expect(core.http.get).toHaveBeenNthCalledWith(2, JOIN_INDICES_ROUTE, {
      query: { projectRouting: 'proj-c2' },
    });
  });
});
