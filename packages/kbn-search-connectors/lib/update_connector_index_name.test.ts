/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { errors } from '@elastic/elasticsearch';

import { updateConnectorIndexName } from './update_connector_index_name';

describe('updateConnectorIndexName lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update connector index_name', async () => {
    mockClient.transport.request.mockImplementation(() => ({ result: 'updated' }));

    await expect(
      updateConnectorIndexName(
        mockClient as unknown as ElasticsearchClient,
        'connectorId',
        'test-index-42'
      )
    ).resolves.toEqual({ result: 'updated' });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      body: {
        index_name: 'test-index-42',
      },
      method: 'PUT',
      path: '/_connector/connectorId/_index_name',
    });
  });

  it('should not index document if there is no connector', async () => {
    mockClient.transport.request.mockImplementationOnce(() => {
      return Promise.reject(
        new errors.ResponseError({
          statusCode: 404,
          body: {
            error: {
              type: `document_missing_exception`,
            },
          },
        } as any)
      );
    });
    await expect(
      updateConnectorIndexName(
        mockClient as unknown as ElasticsearchClient,
        'connectorId',
        'test-index-42'
      )
    ).rejects.toEqual(
      new errors.ResponseError({
        statusCode: 404,
        body: {
          error: {
            type: `document_missing_exception`,
          },
        },
      } as any)
    );
  });
});
