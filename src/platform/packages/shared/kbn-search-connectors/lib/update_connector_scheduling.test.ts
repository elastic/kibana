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

import { updateConnectorScheduling } from './update_connector_scheduling';

describe('updateConnectorScheduling lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update connector scheduling', async () => {
    mockClient.transport.request.mockImplementation(() => ({ result: 'updated' }));

    await expect(
      updateConnectorScheduling(mockClient as unknown as ElasticsearchClient, 'connectorId', {
        access_control: { enabled: false, interval: '* * * * *' },
        full: {
          enabled: true,
          interval: '1 2 3 4 5',
        },
        incremental: { enabled: false, interval: '* * * * *' },
      })
    ).resolves.toEqual({ result: 'updated' });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      body: {
        scheduling: {
          access_control: { enabled: false, interval: '* * * * *' },
          full: { enabled: true, interval: '1 2 3 4 5' },
          incremental: { enabled: false, interval: '* * * * *' },
        },
      },
      method: 'PUT',
      path: '/_connector/connectorId/_scheduling',
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
      updateConnectorScheduling(mockClient as unknown as ElasticsearchClient, 'connectorId', {
        access_control: { enabled: false, interval: '* * * * *' },
        full: {
          enabled: true,
          interval: '1 2 3 4 5',
        },
        incremental: { enabled: false, interval: '* * * * *' },
      })
    ).rejects.toEqual(new Error('Could not find document'));
  });
});
