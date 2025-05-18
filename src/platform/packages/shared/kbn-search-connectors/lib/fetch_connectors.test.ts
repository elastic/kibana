/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { fetchConnectorById, fetchConnectorByIndexName, fetchConnectors } from './fetch_connectors';

const otherError = {
  meta: {
    body: {
      error: {
        type: 'other_error',
      },
    },
  },
};

const notFoundError = new errors.ResponseError({
  statusCode: 404,
  body: {
    error: {
      type: `document_missing_exception`,
    },
  },
} as any);

describe('fetchConnectors lib', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetchConnectorById', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch a connector by ID', async () => {
      const mockResult = { id: 'connectorId', service_type: 'someServiceType' };
      mockClient.transport.request.mockResolvedValue(mockResult);

      await expect(
        fetchConnectorById(mockClient as unknown as ElasticsearchClient, 'connectorId')
      ).resolves.toEqual(mockResult);
      expect(mockClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/_connector/connectorId`,
      });
    });

    it('should return undefined if connector not found', async () => {
      mockClient.transport.request.mockImplementationOnce(() => Promise.reject(notFoundError));

      await expect(
        fetchConnectorById(mockClient as unknown as ElasticsearchClient, 'nonExistingId')
      ).resolves.toBeUndefined();

      expect(mockClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/_connector/nonExistingId`,
      });
    });

    it('should throw an error for other exceptions', async () => {
      mockClient.transport.request.mockImplementationOnce(() => Promise.reject(otherError));

      await expect(
        fetchConnectorById(mockClient as unknown as ElasticsearchClient, 'badId')
      ).rejects.toEqual(otherError);

      expect(mockClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/_connector/badId`,
      });
    });
  });
  describe('fetch connector by name', () => {
    it('should fetch connector by index name', async () => {
      const mockResult = {
        count: 1,
        results: [{ id: 'connectorId', service_type: 'someServiceType' }],
      };
      mockClient.transport.request.mockImplementationOnce(() => Promise.resolve(mockResult));

      await expect(
        fetchConnectorByIndexName(mockClient as unknown as ElasticsearchClient, 'indexName')
      ).resolves.toEqual(mockResult.results[0]);
      expect(mockClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/_connector`,
        querystring: {
          index_name: 'indexName',
        },
      });
    });
    it('should return undefined on connector not found case', async () => {
      mockClient.transport.request.mockImplementationOnce(() =>
        Promise.resolve({ count: 0, results: [] })
      );
      await expect(fetchConnectorByIndexName(mockClient as any, 'id')).resolves.toEqual(undefined);
      expect(mockClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/_connector`,
        querystring: {
          index_name: 'id',
        },
      });
    });
    it('should throw on other errors', async () => {
      mockClient.transport.request.mockImplementationOnce(() => Promise.reject(otherError));
      await expect(fetchConnectorByIndexName(mockClient as any, 'id')).rejects.toEqual(otherError);
      expect(mockClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/_connector`,
        querystring: {
          index_name: 'id',
        },
      });
    });
  });
  describe('fetch connectors', () => {
    it('should fetch all connectors', async () => {
      const mockResult = {
        results: [
          { id: 'connector1', service_type: 'type1' },
          { id: 'connector2', service_type: 'type2' },
        ],
        count: 2,
      };
      mockClient.transport.request.mockResolvedValue(mockResult);

      await expect(fetchConnectors(mockClient as unknown as ElasticsearchClient)).resolves.toEqual(
        mockResult.results
      );
      expect(mockClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/_connector`,
        querystring: {
          from: 0,
          size: 1000,
        },
      });
    });
    it('should fetch all connectors if there are more than 1000', async () => {
      const firstBatch = Array.from({ length: 1000 }, (_, i) => ({
        id: `connector${i + 1}`,
        service_type: 'type1',
      }));
      const secondBatch = Array.from({ length: 1000 }, (_, i) => ({
        id: `connector${i + 1000 + 1}`,
        service_type: 'type1',
      }));
      const thirdBatch = [{ id: 'connector2001', service_type: 'type1' }];
      mockClient.transport.request
        .mockResolvedValueOnce({ results: firstBatch, count: 2001 })
        .mockResolvedValueOnce({ results: secondBatch, count: 2001 })
        .mockResolvedValueOnce({ results: thirdBatch, count: 2001 });

      await expect(fetchConnectors(mockClient as unknown as ElasticsearchClient)).resolves.toEqual([
        ...firstBatch,
        ...secondBatch,
        ...thirdBatch,
      ]);

      expect(mockClient.transport.request).toHaveBeenCalledTimes(3);

      expect(mockClient.transport.request).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          querystring: expect.objectContaining({ from: 0, size: 1000 }),
        })
      );

      expect(mockClient.transport.request).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          querystring: expect.objectContaining({ from: 1000, size: 1000 }),
        })
      );

      expect(mockClient.transport.request).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          querystring: expect.objectContaining({ from: 2000, size: 1000 }),
        })
      );
    });
    it('should throw on other errors', async () => {
      mockClient.transport.request.mockImplementationOnce(() => Promise.reject(otherError));
      await expect(fetchConnectors(mockClient as any)).rejects.toEqual(otherError);
      expect(mockClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/_connector`,
        querystring: {
          from: 0,
          size: 1000,
        },
      });
    });
  });
});
