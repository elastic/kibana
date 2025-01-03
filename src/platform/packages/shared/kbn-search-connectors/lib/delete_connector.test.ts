/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { deleteConnectorById } from './delete_connector';

jest.mock('./cancel_syncs', () => ({
  cancelSyncs: jest.fn(),
}));
import { cancelSyncs } from './cancel_syncs';

describe('deleteConnector lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('should delete connector and cancel syncs', async () => {
    mockClient.transport.request.mockImplementation(() => ({
      acknowledged: true,
    }));

    await expect(
      deleteConnectorById(mockClient as unknown as ElasticsearchClient, 'connectorId')
    ).resolves.toEqual({ acknowledged: true });
    expect(cancelSyncs as jest.Mock).toHaveBeenCalledWith(mockClient, 'connectorId');
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/_connector/connectorId',
    });
    jest.useRealTimers();
  });
});
