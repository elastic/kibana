/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useQueryTriggerEvents } from '@kbn/workflows-ui';
import { TIMEPICKER_FALLBACK } from './constants';
import { useTriggerEventSearch } from './use_trigger_event_search';

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useQueryTriggerEvents: jest.fn(),
  };
});

const mockUseQueryTriggerEvents = useQueryTriggerEvents as jest.MockedFunction<
  typeof useQueryTriggerEvents
>;

const baseDefinition = {
  version: '1',
  name: 'wf',
  enabled: true,
  triggers: [{ type: 'custom.trigger' }],
  steps: [],
};

const hit = (id: string) => ({
  id,
  source: {
    '@timestamp': '2025-01-01T12:00:00.000Z',
    eventId: id,
    triggerId: 'custom.trigger',
    spaceId: 'default',
    subscriptions: [] as string[],
    payload: { foo: 'bar' },
  },
});

const customTriggerTypeIds = ['custom.trigger'];

describe('useTriggerEventSearch pagination', () => {
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    refetch.mockResolvedValue(undefined);
  });

  const mockSearchResult = (overrides: Partial<ReturnType<typeof useQueryTriggerEvents>> = {}) => {
    mockUseQueryTriggerEvents.mockReturnValue({
      data: {
        hits: Array.from({ length: 50 }, (_, index) => hit(`evt-1-${index}`)),
        total: 100,
        page: 1,
        size: 50,
      },
      isLoading: false,
      isFetching: false,
      isPreviousData: false,
      isError: false,
      error: undefined,
      refetch,
      ...overrides,
    } as unknown as ReturnType<typeof useQueryTriggerEvents>);
  };

  it('exposes onFetchMoreRecords when more hits are available', async () => {
    mockSearchResult();

    const { result } = renderHook(() =>
      useTriggerEventSearch({
        definition: baseDefinition as never,
        customTriggerTypeIds,
        customTriggerIdsKey: 'custom.trigger',
        queryEnabled: true,
        isEventConfigLoading: false,
        getTimeDefaults: () => TIMEPICKER_FALLBACK,
      })
    );

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(50);
    });
    expect(result.current.onFetchMoreRecords).toEqual(expect.any(Function));
  });

  it('requests the next page when onFetchMoreRecords is invoked', async () => {
    const dataByPage: Record<
      number,
      {
        hits: ReturnType<typeof hit>[];
        total: number;
        page: number;
        size: number;
      }
    > = {};

    mockUseQueryTriggerEvents.mockImplementation((params: { page?: number }) => {
      const page = params.page ?? 1;
      if (!dataByPage[page]) {
        dataByPage[page] = {
          hits: Array.from({ length: page === 2 ? 25 : 50 }, (_, index) =>
            hit(`evt-${page}-${index}`)
          ),
          total: 100,
          page,
          size: 50,
        };
      }
      return {
        data: dataByPage[page],
        isLoading: false,
        isFetching: false,
        isPreviousData: false,
        isError: false,
        error: undefined,
        refetch,
      } as unknown as ReturnType<typeof useQueryTriggerEvents>;
    });

    const { result } = renderHook(() =>
      useTriggerEventSearch({
        definition: baseDefinition as never,
        customTriggerTypeIds,
        customTriggerIdsKey: 'custom.trigger',
        queryEnabled: true,
        isEventConfigLoading: false,
        getTimeDefaults: () => TIMEPICKER_FALLBACK,
      })
    );

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(50);
    });

    act(() => {
      result.current.onFetchMoreRecords?.();
    });

    await waitFor(() => {
      expect(
        mockUseQueryTriggerEvents.mock.calls.some(
          ([params]) => (params as { page?: number }).page === 2
        )
      ).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(75);
    });
  });

  it('keeps onFetchMoreRecords when the capped total is reached but the page is full', async () => {
    mockSearchResult({
      data: {
        hits: Array.from({ length: 50 }, (_, index) => hit(`evt-1-${index}`)),
        total: 10_000,
        page: 1,
        size: 50,
      },
    });

    const { result } = renderHook(() =>
      useTriggerEventSearch({
        definition: baseDefinition as never,
        customTriggerTypeIds,
        customTriggerIdsKey: 'custom.trigger',
        queryEnabled: true,
        isEventConfigLoading: false,
        getTimeDefaults: () => TIMEPICKER_FALLBACK,
      })
    );

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(50);
    });
    expect(result.current.onFetchMoreRecords).toEqual(expect.any(Function));
  });

  it('clears onFetchMoreRecords while fetching the next page', async () => {
    mockSearchResult({
      isFetching: true,
    });

    const { result } = renderHook(() =>
      useTriggerEventSearch({
        definition: baseDefinition as never,
        customTriggerTypeIds,
        customTriggerIdsKey: 'custom.trigger',
        queryEnabled: true,
        isEventConfigLoading: false,
        getTimeDefaults: () => TIMEPICKER_FALLBACK,
      })
    );

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(50);
    });
    expect(result.current.onFetchMoreRecords).toBeUndefined();
  });

  it('refetches without clearing rows when refresh is submitted with unchanged search identity', async () => {
    mockSearchResult({
      data: {
        hits: [hit('evt-a'), hit('evt-b')],
        total: 2,
        page: 1,
        size: 50,
      },
    });

    const { result } = renderHook(() =>
      useTriggerEventSearch({
        definition: baseDefinition as never,
        customTriggerTypeIds,
        customTriggerIdsKey: 'custom.trigger',
        queryEnabled: true,
        isEventConfigLoading: false,
        getTimeDefaults: () => TIMEPICKER_FALLBACK,
      })
    );

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(2);
    });

    act(() => {
      result.current.handleQuerySubmit({
        query: result.current.query,
        dateRange: result.current.timeRange,
      });
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(result.current.rows).toHaveLength(2);
  });

  it('clears rows when the submitted search identity changes', async () => {
    mockSearchResult({
      data: {
        hits: [hit('evt-a'), hit('evt-b')],
        total: 2,
        page: 1,
        size: 50,
      },
    });

    const { result } = renderHook(() =>
      useTriggerEventSearch({
        definition: baseDefinition as never,
        customTriggerTypeIds,
        customTriggerIdsKey: 'custom.trigger',
        queryEnabled: true,
        isEventConfigLoading: false,
        getTimeDefaults: () => TIMEPICKER_FALLBACK,
      })
    );

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(2);
    });

    act(() => {
      result.current.handleQuerySubmit({
        query: { query: 'eventId: "evt-a"', language: 'kuery' },
        dateRange: result.current.timeRange,
      });
    });

    expect(refetch).not.toHaveBeenCalled();
    expect(result.current.rows).toHaveLength(0);
  });
});
