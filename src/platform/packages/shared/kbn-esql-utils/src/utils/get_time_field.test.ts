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
import { getESQLTimeField } from './get_time_field';

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
});
