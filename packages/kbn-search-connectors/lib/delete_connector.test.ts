/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '..';

import { deleteConnectorById } from './delete_connector';

jest.mock('./cancel_syncs', () => ({
  cancelSyncs: jest.fn(),
}));
import { cancelSyncs } from './cancel_syncs';

describe('deleteConnector lib function', () => {
  const mockClient = {
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('should delete connector and cancel syncs', async () => {
    mockClient.delete.mockImplementation(() => true);

    await deleteConnectorById(mockClient as unknown as ElasticsearchClient, 'connectorId');
    expect(cancelSyncs as jest.Mock).toHaveBeenCalledWith(mockClient, 'connectorId');
    expect(mockClient.delete).toHaveBeenCalledWith({
      id: 'connectorId',
      index: CONNECTORS_INDEX,
      refresh: 'wait_for',
    });
    jest.useRealTimers();
  });
});
