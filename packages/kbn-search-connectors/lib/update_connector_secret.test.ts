/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { updateConnectorSecret } from './update_connector_secret';

describe('updateConnectorSecret lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('should update a connector secret', async () => {
    mockClient.transport.request.mockImplementation(() => ({
      result: 'created',
    }));

    await expect(
      updateConnectorSecret(mockClient as unknown as ElasticsearchClient, 'my-secret', 'secret-id')
    ).resolves.toEqual({ result: 'created' });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_connector/_secret/secret-id',
      body: {
        value: 'my-secret',
      },
    });
    jest.useRealTimers();
  });
});
