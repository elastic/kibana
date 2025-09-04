/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchStatus } from './types';
import { getSearchStatus } from './get_search_status';
import type { SearchSessionRequestInfo } from '../../../common';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

const getEsClientMock = (asyncQueryGet = jest.fn(), status = jest.fn()) => {
  const client = elasticsearchClientMock.createElasticsearchClient();
  return {
    ...client,
    esql: { ...client.esql, asyncQueryGet },
    asyncSearch: { ...client.asyncSearch, status },
  };
};

const getSession = ({
  strategy = 'some-strategy',
}: {
  strategy?: string;
} = {}): SearchSessionRequestInfo => ({
  id: '1234',
  strategy,
});

describe('getSearchStatus', () => {
  describe.each([
    { strategy: 'esql_async', expectedFunctionCall: 'asyncQueryGet' },
    {
      strategy: 'default',
      expectedFunctionCall: 'status',
    },
  ])('when the strategy is $strategy', ({ strategy, expectedFunctionCall }) => {
    it('returns a complete status if search is partial and not running', async () => {
      // Given
      const response = {
        body: {
          is_partial: true,
          is_running: false,
          completion_status: 200,
        },
      };

      const status = jest.fn().mockResolvedValue(response);
      const asyncQueryGet = jest.fn().mockResolvedValue(response);
      const mockEsClient = getEsClientMock(asyncQueryGet, status);

      const mockFunctions: Record<string, jest.Mock> = {
        asyncQueryGet,
        status,
      };

      // When
      const res = await getSearchStatus({
        esClient: mockEsClient,
        asyncId: '123',
        session: getSession({ strategy }),
      });

      // Then
      expect(res.status).toBe(SearchStatus.COMPLETE);
      expect(mockFunctions[expectedFunctionCall]).toHaveBeenCalledWith(
        { id: '123' },
        { meta: true }
      );
    });

    it('returns an error status if completion_status is an error', async () => {
      // Given
      const response = {
        body: {
          is_partial: false,
          is_running: false,
          completion_status: 500,
        },
      };

      const status = jest.fn().mockResolvedValue(response);
      const asyncQueryGet = jest.fn().mockResolvedValue(response);
      const mockEsClient = getEsClientMock(asyncQueryGet, status);

      const mockFunctions: Record<string, jest.Mock> = {
        asyncQueryGet,
        status,
      };

      // When
      const res = await getSearchStatus({
        esClient: mockEsClient,
        asyncId: '123',
        session: getSession({ strategy }),
      });

      // Then
      expect(res.status).toBe(SearchStatus.ERROR);
      expect(mockFunctions[expectedFunctionCall]).toHaveBeenCalledWith(
        { id: '123' },
        { meta: true }
      );
    });

    it('returns an error status if gets an ES error', async () => {
      // Given
      const response = {
        error: {
          root_cause: {
            reason: 'not found',
          },
        },
      };

      const status = jest.fn().mockResolvedValue(response);
      const asyncQueryGet = jest.fn().mockResolvedValue(response);
      const mockEsClient = getEsClientMock(asyncQueryGet, status);

      const mockFunctions: Record<string, jest.Mock> = {
        asyncQueryGet,
        status,
      };

      // When
      const res = await getSearchStatus({
        esClient: mockEsClient,
        asyncId: '123',
        session: getSession({ strategy }),
      });

      // Then
      expect(res.status).toBe(SearchStatus.ERROR);
      expect(mockFunctions[expectedFunctionCall]).toHaveBeenCalledWith(
        { id: '123' },
        { meta: true }
      );
    });

    it('returns an error status throws', async () => {
      // Given
      const status = jest.fn().mockRejectedValue(new Error('O_o'));
      const asyncQueryGet = jest.fn().mockRejectedValue(new Error('O_o'));
      const mockEsClient = getEsClientMock(asyncQueryGet, status);

      const mockFunctions: Record<string, jest.Mock> = {
        asyncQueryGet,
        status,
      };

      // When
      const res = await getSearchStatus({
        esClient: mockEsClient,
        asyncId: '123',
        session: getSession({ strategy }),
      });

      // Then
      expect(res.status).toBe(SearchStatus.ERROR);
      expect(mockFunctions[expectedFunctionCall]).toHaveBeenCalledWith(
        { id: '123' },
        { meta: true }
      );
    });

    it('returns a complete status', async () => {
      // Given
      const response = {
        body: {
          is_partial: false,
          is_running: false,
          completion_status: 200,
        },
      };

      const status = jest.fn().mockResolvedValue(response);
      const asyncQueryGet = jest.fn().mockResolvedValue(response);
      const mockEsClient = getEsClientMock(asyncQueryGet, status);

      const mockFunctions: Record<string, jest.Mock> = {
        asyncQueryGet,
        status,
      };

      // When
      const res = await getSearchStatus({
        esClient: mockEsClient,
        asyncId: '123',
        session: getSession({ strategy }),
      });

      // Then
      expect(res.status).toBe(SearchStatus.COMPLETE);
      expect(mockFunctions[expectedFunctionCall]).toHaveBeenCalledWith(
        { id: '123' },
        { meta: true }
      );
    });

    it('returns a running status otherwise', async () => {
      // Given
      const response = {
        body: {
          is_partial: false,
          is_running: true,
          completion_status: undefined,
        },
      };

      const status = jest.fn().mockResolvedValue(response);
      const asyncQueryGet = jest.fn().mockResolvedValue(response);
      const mockEsClient = getEsClientMock(asyncQueryGet, status);

      const mockFunctions: Record<string, jest.Mock> = {
        asyncQueryGet,
        status,
      };

      // When
      const res = await getSearchStatus({
        esClient: mockEsClient,
        asyncId: '123',
        session: getSession({ strategy }),
      });

      // Then
      expect(res.status).toBe(SearchStatus.IN_PROGRESS);
      expect(mockFunctions[expectedFunctionCall]).toHaveBeenCalledWith(
        { id: '123' },
        { meta: true }
      );
    });
  });
});
