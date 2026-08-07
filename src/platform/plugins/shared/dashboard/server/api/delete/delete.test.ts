/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import { deleteDashboard } from './delete';

jest.mock('../transforms', () => ({
  transformDashboardOut: jest.fn().mockResolvedValue({
    dashboardState: { title: 'title', tags: [] },
    warnings: [],
  }),
}));

import { transformDashboardOut } from '../transforms';

const mockedTransformDashboardOut = jest.mocked(transformDashboardOut);

describe('deleteDashboard', () => {
  test('does not pass migration context into the output transform', async () => {
    const get = jest.fn().mockResolvedValue({ attributes: { title: 'stored' }, references: [] });
    const del = jest.fn().mockResolvedValue(undefined);

    const requestCtx = {
      resolve: jest.fn().mockResolvedValue({
        core: {
          savedObjects: {
            client: { get, delete: del },
          },
        },
      }),
    } as unknown as RequestHandlerContext;

    const response = await deleteDashboard(requestCtx, 'id-1', jest.fn() as never);
    expect(response).toEqual({ id: 'id-1', data: { title: 'title', tags: [] } });

    expect(mockedTransformDashboardOut).toHaveBeenCalled();
    expect(mockedTransformDashboardOut.mock.calls[0]).toHaveLength(4);
  });
});
