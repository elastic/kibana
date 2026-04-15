/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchStatus } from '../types';
import { getSearchStatus } from './get_search_status';
import type { SearchSessionRequestInfo } from '../../../../common';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

const getEsClientMock = (asyncQueryGet = jest.fn(), status = jest.fn()) => {
  const client = elasticsearchClientMock.createElasticsearchClient();
  return {
    ...client,
    esql: { ...client.esql, asyncQueryGet },
    asyncSearch: { ...client.asyncSearch, status },
  };
};

const getSearch = ({
  strategy = 'some-strategy',
  ...params
}: Partial<SearchSessionRequestInfo> = {}): SearchSessionRequestInfo => ({
  id: '1234',
  strategy,
  ...params,
});

const getClientMock = (returnValue: unknown) => {
  const status = jest.fn().mockResolvedValue(returnValue);
  const asyncQueryGet = jest.fn().mockResolvedValue(returnValue);
  const mockEsClient = getEsClientMock(asyncQueryGet, status);

  const mockFunctions: Record<string, jest.Mock> = {
    asyncQueryGet,
    status,
  };

  return { mockEsClient, mockFunctions };
};

describe('getSearchStatus', () => {
  describe.each([
    { strategy: 'esql_async', expectedFunctionCall: 'asyncQueryGet' },
    {
      strategy: 'default',
      expectedFunctionCall: 'status',
    },
  ])('when the strategy is $strategy', ({ strategy, expectedFunctionCall }) => {
    describe('when the search was already completed', () => {
      it('should return complete status immediately', async () => {
        // Given
        const { mockEsClient, mockFunctions } = getClientMock({});

        // When
        const res = await getSearchStatus({
          esClient: mockEsClient,
          asyncId: '123',
          search: getSearch({
            strategy,
            status: SearchStatus.COMPLETE,
            startedAt: '2023-01-01T00:00:00.000Z',
            completedAt: '2023-01-01T01:00:00.000Z',
          }),
        });

        // Then
        expect(res).toEqual({
          status: SearchStatus.COMPLETE,
          startedAt: '2023-01-01T00:00:00.000Z',
          completedAt: '2023-01-01T01:00:00.000Z',
        });
        expect(mockFunctions[expectedFunctionCall]).not.toHaveBeenCalledWith();
      });
    });

    describe('when the search was failed', () => {
      it('should return error status immediately', async () => {
        // Given
        const { mockEsClient, mockFunctions } = getClientMock({});

        // When
        const res = await getSearchStatus({
          esClient: mockEsClient,
          asyncId: '123',
          search: getSearch({
            strategy,
            status: SearchStatus.ERROR,
            error: { code: 400, message: 'Bad Request' },
            startedAt: '2023-01-01T00:00:00.000Z',
            completedAt: '2023-01-01T01:00:00.000Z',
          }),
        });

        // Then
        expect(res).toEqual({
          status: SearchStatus.ERROR,
          startedAt: '2023-01-01T00:00:00.000Z',
          completedAt: '2023-01-01T01:00:00.000Z',
          error: { code: 400, message: 'Bad Request' },
        });
        expect(mockFunctions[expectedFunctionCall]).not.toHaveBeenCalledWith();
      });
    });

    describe('when completion_status is an error', () => {
      it('should return an error status', async () => {
        // Given
        const response = {
          body: {
            is_running: false,
            completion_status: 500,
            start_time_in_millis: 1672531200000,
            completion_time_in_millis: 1672534800000,
          },
        };
        const { mockEsClient, mockFunctions } = getClientMock(response);

        // When
        const res = await getSearchStatus({
          esClient: mockEsClient,
          asyncId: '123',
          search: getSearch({ strategy }),
        });

        // Then
        expect(res).toEqual({
          status: SearchStatus.ERROR,
          startedAt: '2023-01-01T00:00:00.000Z',
          completedAt: '2023-01-01T01:00:00.000Z',
          error: {
            code: 500,
          },
        });
        expect(mockFunctions[expectedFunctionCall]).toHaveBeenCalledWith(
          { id: '123' },
          { meta: true }
        );
      });
    });

    describe('when the search is not running', () => {
      it('should return a complete status', async () => {
        // Given
        const response = {
          body: {
            is_running: false,
            completion_status: 200,
            start_time_in_millis: 1672531200000,
            completion_time_in_millis: 1672534800000,
          },
        };
        const { mockEsClient, mockFunctions } = getClientMock(response);

        // When
        const res = await getSearchStatus({
          esClient: mockEsClient,
          asyncId: '123',
          search: getSearch({ strategy }),
        });

        // Then
        expect(res).toEqual({
          status: SearchStatus.COMPLETE,
          startedAt: '2023-01-01T00:00:00.000Z',
          completedAt: '2023-01-01T01:00:00.000Z',
          error: undefined,
        });
        expect(mockFunctions[expectedFunctionCall]).toHaveBeenCalledWith(
          { id: '123' },
          { meta: true }
        );
      });
    });

    describe('when the search is still running', () => {
      it('should return an in_progress status', async () => {
        // Given
        const response = {
          body: {
            is_running: true,
            start_time_in_millis: 1672531200000,
          },
        };
        const { mockEsClient, mockFunctions } = getClientMock(response);

        // When
        const res = await getSearchStatus({
          esClient: mockEsClient,
          asyncId: '123',
          search: getSearch({ strategy }),
        });

        // Then
        expect(res).toEqual({
          status: SearchStatus.IN_PROGRESS,
          startedAt: '2023-01-01T00:00:00.000Z',
          completedAt: undefined,
          error: undefined,
        });
        expect(mockFunctions[expectedFunctionCall]).toHaveBeenCalledWith(
          { id: '123' },
          { meta: true }
        );
      });
    });

    describe('when an unexpected error occurs', () => {
      it('should return an error status', async () => {
        // Given
        const error = new Error('Unexpected error');

        const status = jest.fn().mockRejectedValue(error);
        const asyncQueryGet = jest.fn().mockRejectedValue(error);
        const mockEsClient = getEsClientMock(asyncQueryGet, status);

        const mockFunctions: Record<string, jest.Mock> = {
          asyncQueryGet,
          status,
        };

        // When
        const res = await getSearchStatus({
          esClient: mockEsClient,
          asyncId: '123',
          search: getSearch({ strategy }),
        });

        // Then
        expect(res).toEqual({
          status: SearchStatus.ERROR,
          error: {
            code: 500,
            message: 'Unexpected error',
          },
        });
        expect(mockFunctions[expectedFunctionCall]).toHaveBeenCalledWith(
          { id: '123' },
          { meta: true }
        );
      });
    });
  });
});
