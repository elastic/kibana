/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { FeatureName } from '../types';

import { createConnector } from './create_connector';

const notFoundError = new errors.ResponseError({
  statusCode: 404,
  body: {
    error: {
      type: `document_missing_exception`,
    },
  },
} as any);

describe('createConnector lib', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create connector with _connector API endpoint', async () => {
    const connectorId = 'connectorId';
    const mockConnector = {
      id: connectorId,
      index_name: 'indexName',
      language: 'en',
      is_native: true,
    };
    mockClient.transport.request
      .mockResolvedValueOnce({ id: connectorId })
      .mockResolvedValueOnce(mockConnector);

    await expect(
      createConnector(mockClient as unknown as ElasticsearchClient, {
        isNative: true,
        indexName: mockConnector.index_name,
        language: mockConnector.language,
      })
    ).resolves.toEqual(mockConnector);
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: `/_connector`,
      body: {
        index_name: 'indexName',
        language: 'en',
        is_native: true,
        name: '',
      },
    });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: `/_connector/${connectorId}`,
    });
  });

  it('should update pipeline params if provided', async () => {
    const connectorId = 'connectorId';
    const mockConnector = {
      id: connectorId,
      index_name: 'indexName',
      language: 'en',
      is_native: true,
    };

    const mockPipeline = {
      extract_binary_content: true,
      name: 'test',
      reduce_whitespace: true,
      run_ml_inference: true,
    };

    mockClient.transport.request
      .mockResolvedValueOnce({ id: connectorId })
      .mockResolvedValueOnce({ result: 'updated' })
      .mockResolvedValueOnce(mockConnector);

    await expect(
      createConnector(mockClient as unknown as ElasticsearchClient, {
        isNative: true,
        indexName: 'indexName',
        language: 'en',
        pipeline: mockPipeline,
      })
    ).resolves.toEqual(mockConnector);

    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: `/_connector`,
      body: {
        index_name: 'indexName',
        language: 'en',
        is_native: true,
        name: '',
      },
    });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: `/_connector/${connectorId}/_pipeline`,
      body: { pipeline: mockPipeline },
    });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: `/_connector/${connectorId}`,
    });
  });

  it('should update connector features if provided', async () => {
    const connectorId = 'connectorId';
    const mockConnector = {
      id: connectorId,
      index_name: 'indexName',
      language: 'en',
      is_native: true,
    };

    const mockFeatures = {
      [FeatureName.FILTERING_ADVANCED_CONFIG]: true,
      [FeatureName.FILTERING_RULES]: true,
      [FeatureName.SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    };

    mockClient.transport.request
      .mockResolvedValueOnce({ id: connectorId })
      .mockResolvedValueOnce({ result: 'updated' })
      .mockResolvedValueOnce(mockConnector);

    await expect(
      createConnector(mockClient as unknown as ElasticsearchClient, {
        isNative: true,
        indexName: 'indexName',
        language: 'en',
        features: mockFeatures,
      })
    ).resolves.toEqual(mockConnector);

    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: `/_connector`,
      body: {
        index_name: 'indexName',
        language: 'en',
        is_native: true,
        name: '',
      },
    });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: `/_connector/${connectorId}/_features`,
      body: { features: mockFeatures },
    });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: `/_connector/${connectorId}`,
    });
  });

  it('should throw an error if connector doc is not found', async () => {
    mockClient.transport.request
      .mockResolvedValueOnce({ id: 'connectorId' })
      .mockRejectedValueOnce(notFoundError);

    await expect(
      createConnector(mockClient as unknown as ElasticsearchClient, {
        isNative: true,
        indexName: 'some-index',
        language: 'somelang',
      })
    ).rejects.toEqual(new Error('Could not retrieve the created connector'));

    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: `/_connector`,
      body: {
        index_name: 'some-index',
        is_native: true,
        language: 'somelang',
        name: '',
      },
    });
  });
});
