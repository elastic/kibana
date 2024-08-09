/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { updateConnectorApiKeyId } from './update_connector_api_key_id';

describe('updateConnectorApiKeyId lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('should update a connector API key id and API key secret id', async () => {
    mockClient.transport.request.mockImplementation(() => ({
      acknowledged: true,
    }));

    await expect(
      updateConnectorApiKeyId(
        mockClient as unknown as ElasticsearchClient,
        'connector-id',
        'api-key-id',
        'api-key-secret-id'
      )
    ).resolves.toEqual({ acknowledged: true });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_connector/connector-id/_api_key_id',
      body: {
        api_key_id: 'api-key-id',
        api_key_secret_id: 'api-key-secret-id',
      },
    });
    jest.useRealTimers();
  });
});
