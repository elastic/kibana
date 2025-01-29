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

import { updateConnectorConfiguration } from './update_connector_configuration';
import { fetchConnectorById } from './fetch_connectors';

jest.mock('./fetch_connectors', () => ({ fetchConnectorById: jest.fn() }));

describe('updateConnectorConfiguration lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update configuration', async () => {
    (fetchConnectorById as jest.Mock).mockResolvedValue({
      configuration: { test: { value: 'haha' } },
    });

    mockClient.transport.request.mockResolvedValueOnce({ result: 'updated' });

    await expect(
      updateConnectorConfiguration(mockClient as unknown as ElasticsearchClient, 'connectorId', {
        test: 'haha',
      })
    ).resolves.toEqual({ test: { value: 'haha' } });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      body: {
        values: {
          test: 'haha',
        },
      },
      method: 'PUT',
      path: '/_connector/connectorId/_configuration',
    });
  });

  it('should reject if connector does not exist', async () => {
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
      updateConnectorConfiguration(mockClient as unknown as ElasticsearchClient, 'connectorId', {
        test: 'haha',
      })
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
