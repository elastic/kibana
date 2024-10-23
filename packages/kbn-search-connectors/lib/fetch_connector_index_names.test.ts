/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { fetchConnectorIndexNames } from './fetch_connector_index_names';

const otherError = {
  meta: {
    body: {
      error: {
        type: 'other_error',
      },
    },
  },
};

const indexNotFoundError = new errors.ResponseError({
  statusCode: 404,
  body: {
    error: {
      type: `index_not_found_exception`,
    },
  },
} as any);

describe('fetchConnectorIndexNames lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch connector index names', async () => {
    const mockResult = {
      count: 2,
      results: [
        { id: 'connectorId1', index_name: 'indexName1' },
        { id: 'connectorId2', index_name: 'indexName2' },
      ],
    };
    mockClient.transport.request.mockResolvedValue(mockResult);

    await expect(
      fetchConnectorIndexNames(mockClient as unknown as ElasticsearchClient)
    ).resolves.toEqual(['indexName1', 'indexName2']);
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: `/_connector`,
      querystring: {
        from: 0,
        size: 1000,
      },
    });
  });

  it('should return [] if no connectors are found', async () => {
    const mockResult = {
      count: 0,
      results: [],
    };
    mockClient.transport.request.mockResolvedValue(mockResult);

    await expect(
      fetchConnectorIndexNames(mockClient as unknown as ElasticsearchClient)
    ).resolves.toEqual([]);

    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: `/_connector`,
      querystring: {
        from: 0,
        size: 1000,
      },
    });
  });

  it('should return [] if connector index is missing', async () => {
    mockClient.transport.request.mockImplementationOnce(() => Promise.reject(indexNotFoundError));

    await expect(
      fetchConnectorIndexNames(mockClient as unknown as ElasticsearchClient)
    ).resolves.toEqual([]);

    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: `/_connector`,
      querystring: {
        from: 0,
        size: 1000,
      },
    });
  });

  it('should throw on other errors', async () => {
    mockClient.transport.request.mockImplementationOnce(() => Promise.reject(otherError));
    await expect(fetchConnectorIndexNames(mockClient as any)).rejects.toEqual(otherError);
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: `/_connector`,
      querystring: {
        from: 0,
        size: 1000,
      },
    });
  });
});
