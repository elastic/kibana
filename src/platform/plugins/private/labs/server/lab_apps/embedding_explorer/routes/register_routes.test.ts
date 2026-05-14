/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter as router } from '@kbn/core-http-router-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { httpResourcesMock, httpServerMock } from '@kbn/core/server/mocks';
import {
  EMBEDDING_EXPLORER_INDEX_DATA_API_PATH,
  EMBEDDING_EXPLORER_INDEX_FIELDS_API_PATH,
  EMBEDDING_EXPLORER_INDICES_API_PATH,
  EMBEDDING_EXPLORER_SAMPLE_API_PATH,
} from '../../../../common';
import { isLabInstalled } from '../../../lib/installed_labs';
import { registerEmbeddingExplorerRoutes } from './register_routes';

jest.mock('../../../lib/installed_labs', () => ({
  isLabInstalled: jest.fn(),
}));

const getRegisteredRouteHandler = (
  mockRouter: ReturnType<typeof router.create>,
  method: 'get' | 'post',
  path: string
) =>
  mockRouter[method].mock.calls.find(([routeConfig]) => routeConfig.path === path)?.[1] as Function;

describe('registerEmbeddingExplorerRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the embedding explorer routes', () => {
    const mockRouter = router.create();

    registerEmbeddingExplorerRoutes(mockRouter);

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EMBEDDING_EXPLORER_SAMPLE_API_PATH,
      }),
      expect.any(Function)
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EMBEDDING_EXPLORER_INDICES_API_PATH,
      }),
      expect.any(Function)
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EMBEDDING_EXPLORER_INDEX_FIELDS_API_PATH,
      }),
      expect.any(Function)
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EMBEDDING_EXPLORER_INDEX_DATA_API_PATH,
      }),
      expect.any(Function)
    );
  });

  it('returns forbidden from the sample route when the lab is not installed', async () => {
    const mockRouter = router.create();
    const request = httpServerMock.createKibanaRequest();
    const response = httpResourcesMock.createResponseFactory();
    (isLabInstalled as jest.Mock).mockResolvedValue(false);

    registerEmbeddingExplorerRoutes(mockRouter);

    const routeHandler = getRegisteredRouteHandler(
      mockRouter,
      'get',
      EMBEDDING_EXPLORER_SAMPLE_API_PATH
    );
    await routeHandler({}, request, response);

    expect(response.forbidden).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: 'Install the Embedding explorer lab before using this API.',
        }),
      })
    );
  });

  it('returns sample data when the lab is installed', async () => {
    const mockRouter = router.create();
    const request = httpServerMock.createKibanaRequest();
    const response = httpResourcesMock.createResponseFactory();
    (isLabInstalled as jest.Mock).mockResolvedValue(true);

    registerEmbeddingExplorerRoutes(mockRouter);

    const routeHandler = getRegisteredRouteHandler(
      mockRouter,
      'get',
      EMBEDDING_EXPLORER_SAMPLE_API_PATH
    );
    await routeHandler({}, request, response);

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          datasetName: 'Sample Hacker News vector corpus',
          points: expect.arrayContaining([
            expect.objectContaining({
              category: 'comment',
              id: expect.any(String),
              source: 'clickhouse-hackernews-sample',
            }),
          ]),
        }),
      })
    );
  });

  it('returns raw vectors for client-side projection when projection fields are omitted', async () => {
    const mockRouter = router.create();
    const request = httpServerMock.createKibanaRequest({
      body: {
        categoryField: 'severity',
        index: 'security-vectors',
        labelField: 'summary',
        size: 25,
        vectorField: 'embedding',
      },
    });
    const response = httpResourcesMock.createResponseFactory();
    const coreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
    (isLabInstalled as jest.Mock).mockResolvedValue(true);

    coreContext.elasticsearch.client.asCurrentUser.search.mockResolvedValue({
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
      hits: {
        hits: [
          {
            _index: 'security-vectors',
            _id: 'doc-1',
            _source: {
              severity: 'high',
              summary: 'Authentication bypass',
            },
            fields: {
              embedding: [0.11, 0.22, 0.33],
            },
          },
        ],
      },
      timed_out: false,
      took: 1,
    });

    registerEmbeddingExplorerRoutes(mockRouter);

    const routeHandler = getRegisteredRouteHandler(
      mockRouter,
      'post',
      EMBEDDING_EXPLORER_INDEX_DATA_API_PATH
    );
    await routeHandler(context, request, response);

    expect(coreContext.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ['embedding'],
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: [{ exists: { field: 'embedding' } }],
          }),
        }),
      })
    );
    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          projectionSource: 'computed',
          points: [
            expect.objectContaining({
              category: 'high',
              id: 'doc-1',
              label: 'Authentication bypass',
              vector: [0.11, 0.22, 0.33],
              x: 0,
              y: 0,
            }),
          ],
        }),
      })
    );
  });
});
