/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { errors } from '@elastic/elasticsearch';

import { updateConnectorServiceType } from './update_connector_service_type';

describe('updateConnectorServiceType lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update connector service type', async () => {
    mockClient.transport.request.mockImplementation(() => ({ result: 'updated' }));

    const connectorId = 'connectorId';
    const serviceType = 'new-service-type';

    const result = await updateConnectorServiceType(
      mockClient as unknown as ElasticsearchClient,
      connectorId,
      serviceType
    );
    expect(result).toEqual({ result: 'updated' });

    expect(mockClient.transport.request).toHaveBeenNthCalledWith(1, {
      method: 'PUT',
      path: `/_connector/${connectorId}/_configuration`,
      body: {
        configuration: {},
      },
    });
    expect(mockClient.transport.request).toHaveBeenNthCalledWith(2, {
      method: 'PUT',
      path: `/_connector/${connectorId}/_service_type`,
      body: {
        service_type: serviceType,
      },
    });
    expect(mockClient.transport.request).toHaveBeenCalledTimes(2);
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
      updateConnectorServiceType(
        mockClient as unknown as ElasticsearchClient,
        'connectorId',
        'new-service-type'
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
