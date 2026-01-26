/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useGetRuleTagsQuery } from './use_get_rule_tags_query';
import { getRuleTags } from '../apis/get_rule_tags';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { QueryClient } from '@kbn/react-query';
import { testQueryClientConfig } from '../test_utils';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

const MOCK_TAGS = ['a', 'b', 'c'];

jest.mock('../apis/get_rule_tags');
const mockGetRuleTags = jest.mocked(getRuleTags);

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

const queryClient = new QueryClient(testQueryClientConfig);

const { provider: wrapper } = createTestResponseOpsQueryClient({
  dependencies: { notifications },
});

describe('useGetRuleTagsQuery', () => {
  beforeEach(() => {
    mockGetRuleTags.mockResolvedValue({
      data: MOCK_TAGS,
      page: 1,
      perPage: 50,
      total: MOCK_TAGS.length,
    });
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should call the getRuleTags API and collect the tags into one array', async () => {
    const { rerender, result } = renderHook(
      () =>
        useGetRuleTagsQuery({
          http,
          enabled: true,
          search: 'test',
          perPage: 50,
          page: 1,
        }),
      {
        wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(mockGetRuleTags).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'test',
          perPage: 50,
          page: 1,
        })
      );

      expect(result.current.tags).toEqual(MOCK_TAGS);
      expect(result.current.hasNextPage).toEqual(false);
    });
  });

  it('should support pagination', async () => {
    mockGetRuleTags.mockResolvedValue({
      data: ['a', 'b', 'c', 'd', 'e'],
      page: 1,
      perPage: 5,
      total: 10,
    });
    const { rerender, result } = renderHook(
      () =>
        useGetRuleTagsQuery({
          http,
          enabled: true,
          perPage: 5,
          page: 1,
        }),
      {
        wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(mockGetRuleTags).toHaveBeenLastCalledWith(
        expect.objectContaining({
          perPage: 5,
          page: 1,
        })
      );

      expect(result.current.tags).toEqual(['a', 'b', 'c', 'd', 'e']);
      expect(result.current.hasNextPage).toEqual(true);
    });

    mockGetRuleTags.mockResolvedValue({
      data: ['a', 'b', 'c', 'd', 'e'],
      page: 2,
      perPage: 5,
      total: 10,
    });

    result.current.fetchNextPage();

    expect(mockGetRuleTags).toHaveBeenLastCalledWith(
      expect.objectContaining({
        perPage: 5,
        page: 2,
      })
    );

    rerender();
    await waitFor(() => expect(result.current.hasNextPage).toEqual(false));
  });

  it('should support pagination when there are no tags', async () => {
    mockGetRuleTags.mockResolvedValue({
      data: [],
      page: 1,
      perPage: 5,
      total: 0,
    });

    const { rerender, result } = renderHook(
      () =>
        useGetRuleTagsQuery({
          http,
          enabled: true,
          perPage: 5,
          page: 1,
        }),
      {
        wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(mockGetRuleTags).toHaveBeenLastCalledWith(
        expect.objectContaining({
          perPage: 5,
          page: 1,
        })
      );

      expect(result.current.tags).toEqual([]);
      expect(result.current.hasNextPage).toEqual(false);
    });
  });

  it('should show error toast if API fails', async () => {
    mockGetRuleTags.mockRejectedValue('');

    const { result } = renderHook(
      () =>
        useGetRuleTagsQuery({
          http,
          enabled: true,
        }),
      { wrapper }
    );

    expect(mockGetRuleTags).toBeCalled();
    expect(result.current.tags).toEqual([]);
    await waitFor(() => expect(notifications.toasts.addDanger).toBeCalled());
  });
});
