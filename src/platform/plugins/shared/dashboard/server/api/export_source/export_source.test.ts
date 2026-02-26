/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { createVersionedRouterMock } from '@kbn/core-http-router-server-mocks';
import type { DashboardState } from '../types';
import { DASHBOARD_INTERNAL_API_PATH } from '../../../common/constants';
import { registerExportSourceRoute } from './register_export_source_route';

const mockGetTransforms = jest.fn();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../kibana_services').embeddableService = {
    getTransforms: mockGetTransforms,
    getAllEmbeddableSchemas: () => [],
  };
});

beforeEach(() => {
  mockGetTransforms.mockReset();
});

describe('registerExportSourceRoute', () => {
  it('omits warnings when there are none', async () => {
    mockGetTransforms.mockImplementation(() => ({ schema: schema.object({}) }));

    const router = createVersionedRouterMock();
    registerExportSourceRoute(router);

    const route = router.getRoute('post', `${DASHBOARD_INTERNAL_API_PATH}/_export_source`);
    const handler = route.versions['1'].handler;

    const dashboardState: DashboardState = {
      title: 'my dashboard',
      panels: [
        {
          type: 'mapped',
          uid: 'panel1',
          grid: { x: 0, y: 0, w: 24, h: 15 },
          config: { title: 'panel' },
        },
      ],
    };

    const result = await handler(
      coreMock.createRequestHandlerContext(),
      { body: { data: dashboardState } } as any,
      kibanaResponseFactory
    );

    expect(result.status).toBe(200);
    expect(result.payload).toEqual({
      data: dashboardState,
    });
  });

  it('drops unmapped panel types and returns warnings', async () => {
    mockGetTransforms.mockImplementation(() => undefined);

    const router = createVersionedRouterMock();
    registerExportSourceRoute(router);

    const route = router.getRoute('post', `${DASHBOARD_INTERNAL_API_PATH}/_export_source`);
    const handler = route.versions['1'].handler;

    const dashboardState: DashboardState = {
      title: 'my dashboard',
      panels: [
        {
          type: 'typeWithoutSchema',
          uid: '12345',
          grid: { x: 0, y: 0, w: 24, h: 15 },
          config: { foo: 'some value' },
        },
      ],
    };

    const result = await handler(
      coreMock.createRequestHandlerContext(),
      { body: { data: dashboardState } } as any,
      kibanaResponseFactory
    );

    expect(result.status).toBe(200);
    expect(result.payload).toEqual({
      data: {
        title: 'my dashboard',
        panels: [],
      },
      warnings: [
        'Dropped panel 12345, panel schema not available for panel type: typeWithoutSchema. Panels without schemas are not supported by dashboard REST endpoints',
      ],
    });
  });

  it('removes unsupported enhancements and returns warnings', async () => {
    mockGetTransforms.mockImplementation(() => ({ schema: schema.object({}) }));

    const router = createVersionedRouterMock();
    registerExportSourceRoute(router);

    const route = router.getRoute('post', `${DASHBOARD_INTERNAL_API_PATH}/_export_source`);
    const handler = route.versions['1'].handler;

    const dashboardState: DashboardState = {
      title: 'my dashboard',
      panels: [
        {
          type: 'mapped',
          uid: 'panel1',
          grid: { x: 0, y: 0, w: 24, h: 15 },
          config: {
            title: 'panel',
            enhancements: { dynamicActions: { events: [{}] } },
          },
        },
      ],
    };

    const result = await handler(
      coreMock.createRequestHandlerContext(),
      { body: { data: dashboardState } } as any,
      kibanaResponseFactory
    );

    expect(result.status).toBe(200);
    expect(result.payload).toEqual({
      data: {
        title: 'my dashboard',
        panels: [
          {
            type: 'mapped',
            uid: 'panel1',
            grid: { x: 0, y: 0, w: 24, h: 15 },
            config: {
              title: 'panel',
            },
          },
        ],
      },
      warnings: ["Dropped unmapped panel config key 'enhancements' from panel panel1"],
    });
  });

  it('drops pinned_panels and returns warnings', async () => {
    mockGetTransforms.mockImplementation(() => ({ schema: schema.object({}) }));

    const router = createVersionedRouterMock();
    registerExportSourceRoute(router);

    const route = router.getRoute('post', `${DASHBOARD_INTERNAL_API_PATH}/_export_source`);
    const handler = route.versions['1'].handler;

    const dashboardState: DashboardState = {
      pinned_panels: [],
      title: 'my dashboard',
    } as unknown as DashboardState;

    const result = await handler(
      coreMock.createRequestHandlerContext(),
      { body: { data: dashboardState } } as any,
      kibanaResponseFactory
    );

    expect(result.status).toBe(200);
    expect(result.payload).toEqual({
      data: {
        title: 'my dashboard',
        panels: [],
      },
      warnings: ["Dropped unmapped key 'pinned_panels' from dashboard"],
    });
  });
});

