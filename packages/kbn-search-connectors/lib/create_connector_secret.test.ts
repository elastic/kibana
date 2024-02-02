/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { createConnectorSecret } from './create_connector_secret';

describe('createConnectorSecret lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('should create a connector secret', async () => {
    mockClient.transport.request.mockImplementation(() => ({
      id: 1234,
    }));

    await expect(
      createConnectorSecret(mockClient as unknown as ElasticsearchClient, 'my-secret')
    ).resolves.toEqual({ id: 1234 });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_connector/_secret',
      body: {
        value: 'my-secret',
      },
    });
    jest.useRealTimers();
  });
});
