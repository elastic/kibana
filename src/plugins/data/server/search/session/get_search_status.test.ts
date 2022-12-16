/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchStatus } from './types';
import { getSearchStatus } from './get_search_status';

describe('getSearchStatus', () => {
  let mockClient: any;
  beforeEach(() => {
    mockClient = {
      asyncSearch: {
        status: jest.fn(),
      },
    };
  });

  test('returns an error status if search is partial and not running', async () => {
    mockClient.asyncSearch.status.mockResolvedValue({
      body: {
        is_partial: true,
        is_running: false,
        completion_status: 200,
      },
    });
    const res = await getSearchStatus(mockClient, '123');
    expect(res.status).toBe(SearchStatus.ERROR);
  });

  test('returns an error status if completion_status is an error', async () => {
    mockClient.asyncSearch.status.mockResolvedValue({
      body: {
        is_partial: false,
        is_running: false,
        completion_status: 500,
      },
    });
    const res = await getSearchStatus(mockClient, '123');
    expect(res.status).toBe(SearchStatus.ERROR);
  });

  test('returns an error status if gets an ES error', async () => {
    mockClient.asyncSearch.status.mockResolvedValue({
      error: {
        root_cause: {
          reason: 'not found',
        },
      },
    });
    const res = await getSearchStatus(mockClient, '123');
    expect(res.status).toBe(SearchStatus.ERROR);
  });

  test('returns an error status throws', async () => {
    mockClient.asyncSearch.status.mockRejectedValue(new Error('O_o'));
    const res = await getSearchStatus(mockClient, '123');
    expect(res.status).toBe(SearchStatus.ERROR);
  });

  test('returns a complete status', async () => {
    mockClient.asyncSearch.status.mockResolvedValue({
      body: {
        is_partial: false,
        is_running: false,
        completion_status: 200,
      },
    });
    const res = await getSearchStatus(mockClient, '123');
    expect(res.status).toBe(SearchStatus.COMPLETE);
  });

  test('returns a running status otherwise', async () => {
    mockClient.asyncSearch.status.mockResolvedValue({
      body: {
        is_partial: false,
        is_running: true,
        completion_status: undefined,
      },
    });
    const res = await getSearchStatus(mockClient, '123');
    expect(res.status).toBe(SearchStatus.IN_PROGRESS);
  });
});
