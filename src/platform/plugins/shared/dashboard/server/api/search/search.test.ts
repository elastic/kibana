/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import { search } from './search';
import type { DashboardSearchRequestParams } from './types';

const createRequestContext = (find: jest.Mock): RequestHandlerContext =>
  ({
    resolve: jest.fn().mockResolvedValue({
      core: {
        savedObjects: {
          client: {
            find,
          },
        },
      },
    }),
  } as unknown as RequestHandlerContext);

describe('dashboard search', () => {
  it('always applies updated_at desc sort', async () => {
    const find = jest
      .fn()
      .mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 20 });
    const params: DashboardSearchRequestParams = { per_page: 20 };
    await search(createRequestContext(find), params);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'updated_at',
        sortOrder: 'desc',
      })
    );
  });

  it('applies updated_at desc sort when query is present', async () => {
    const find = jest
      .fn()
      .mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 20 });
    const params: DashboardSearchRequestParams = { query: 'hello*', per_page: 20 };
    await search(createRequestContext(find), params);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'hello*',
        sortField: 'updated_at',
        sortOrder: 'desc',
      })
    );
  });
});
