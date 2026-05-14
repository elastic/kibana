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
  EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH,
} from '../../../../common';
import { isLabInstalled } from '../../../lib/installed_labs';
import { registerEmbeddingExplorerRoutes } from './register_routes';

jest.mock('../../../lib/installed_labs', () => ({
  isLabInstalled: jest.fn(),
}));

jest.mock('./get_sample_index_documents', () => ({
  getSampleIndexDocuments: jest.fn(() => ({
    categoryField: 'type',
    datasetName: 'Sample Hacker News vector corpus',
    description: 'Sample dataset for Elasticsearch loading.',
    docs: [
      {
        author: 'sample-author',
        embedding: [0.11, 0.22, 0.33],
        id: 'doc-1',
        length: 120,
        projection: {
          x: 1.25,
          y: -0.75,
        },
        score: 4,
        source_dataset: 'clickhouse-hackernews-sample',
        summary: 'Authentication bypass',
        text: 'Authentication bypass sample text',
        time: '2020-01-01T00:00:00.000Z',
        title: 'Authentication bypass',
        type: 'comment',
      },
    ],
    indexNamePrefix: 'labs_embedding_hackernews_sample',
    labelField: 'summary',
    projectionFields: {
      x: 'projection.x',
      y: 'projection.y',
    },
    vectorField: 'embedding',
  })),
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
        path: EMBEDDING_EXPLORER_INDICES_API_PATH,
      }),
      expect.any(Function)
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH,
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
        path: EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH,
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

  it('returns sample index setup status when the lab is installed', async () => {
    const mockRouter = router.create();
    const request = httpServerMock.createKibanaRequest();
    const response = httpResourcesMock.createResponseFactory();
    const coreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
    (isLabInstalled as jest.Mock).mockResolvedValue(true);

    coreContext.elasticsearch.client.asCurrentUser.indices.exists
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    registerEmbeddingExplorerRoutes(mockRouter);

    const routeHandler = getRegisteredRouteHandler(
      mockRouter,
      'get',
      EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH
    );
    await routeHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          categoryField: 'type',
          isReady: false,
          projectedIndex: 'labs_embedding_hackernews_sample_projected',
          vectorField: 'embedding',
          vectorOnlyIndex: 'labs_embedding_hackernews_sample_vectors_only',
          xField: 'projection.x',
          yField: 'projection.y',
        }),
      })
    );
  });

  it('creates the sample indices when requested', async () => {
    const mockRouter = router.create();
    const request = httpServerMock.createKibanaRequest();
    const response = httpResourcesMock.createResponseFactory();
    const coreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
    (isLabInstalled as jest.Mock).mockResolvedValue(true);

    coreContext.elasticsearch.client.asCurrentUser.indices.exists
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    coreContext.elasticsearch.client.asCurrentUser.indices.create.mockResolvedValue({} as never);
    coreContext.elasticsearch.client.asCurrentUser.bulk.mockResolvedValue({
      errors: false,
      items: [{ index: {} }],
    } as never);
    coreContext.elasticsearch.client.asCurrentUser.indices.refresh.mockResolvedValue({} as never);

    registerEmbeddingExplorerRoutes(mockRouter);

    const routeHandler = getRegisteredRouteHandler(
      mockRouter,
      'post',
      EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH
    );
    await routeHandler(context, request, response);

    expect(coreContext.elasticsearch.client.asCurrentUser.indices.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        index: 'labs_embedding_hackernews_sample_projected',
      })
    );
    expect(coreContext.elasticsearch.client.asCurrentUser.indices.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        index: 'labs_embedding_hackernews_sample_vectors_only',
      })
    );
    expect(coreContext.elasticsearch.client.asCurrentUser.bulk).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        operations: [
          {
            index: {
              _id: 'doc-1',
              _index: 'labs_embedding_hackernews_sample_projected',
            },
          },
          expect.objectContaining({
            projection: {
              x: 1.25,
              y: -0.75,
            },
          }),
        ],
      })
    );
    expect(coreContext.elasticsearch.client.asCurrentUser.bulk).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        operations: [
          {
            index: {
              _id: 'doc-1',
              _index: 'labs_embedding_hackernews_sample_vectors_only',
            },
          },
          expect.not.objectContaining({
            projection: expect.anything(),
          }),
        ],
      })
    );
    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          isReady: true,
          projectedIndex: 'labs_embedding_hackernews_sample_projected',
          vectorOnlyIndex: 'labs_embedding_hackernews_sample_vectors_only',
        }),
      })
    );
  });
});
