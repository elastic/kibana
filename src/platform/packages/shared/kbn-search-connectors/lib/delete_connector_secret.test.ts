/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { deleteConnectorSecret } from './delete_connector_secret';

describe('deleteConnectorSecret lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('should delete a connector secret', async () => {
    mockClient.transport.request.mockImplementation(() => ({
      result: 'deleted',
    }));

    await expect(
      deleteConnectorSecret(mockClient as unknown as ElasticsearchClient, 'secret-id')
    ).resolves.toEqual({ result: 'deleted' });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/_connector/_secret/secret-id',
    });
    jest.useRealTimers();
  });
});
