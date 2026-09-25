/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { getBreakdownField } from '@kbn/discover-utils';
import { useServicesBootstrap } from './use_services_bootstrap';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createStateService } from '../services/state_service';
import { useStateProps } from './use_state_props';
import type { UnifiedHistogramFetchParamsExternal } from '../types';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { DataViewSource } from '@kbn/data-source';
import { processFetchParams } from '../utils/process_fetch_params';

jest.mock('../services/state_service');
jest.mock('./use_state_props');
jest.mock('@kbn/discover-utils', () => ({
  ...jest.requireActual('@kbn/discover-utils/src/constants'),
  getBreakdownField: jest.fn(),
}));
jest.mock('../utils/process_fetch_params', () => {
  const actual = jest.requireActual('../utils/process_fetch_params');
  return {
    ...actual,
    processFetchParams: jest.fn((...args: unknown[]) =>
      actual.processFetchParams(
        ...(args as Parameters<typeof actual.processFetchParams>)
      )
    ),
  };
});

const createStateServiceMock = createStateService as jest.MockedFunction<typeof createStateService>;
const useStatePropsMock = useStateProps as jest.MockedFunction<typeof useStateProps>;
const getBreakdownFieldMock = getBreakdownField as jest.MockedFunction<typeof getBreakdownField>;
const processFetchParamsMock = processFetchParams as jest.MockedFunction<typeof processFetchParams>;
const { processFetchParams: actualProcessFetchParams } = jest.requireActual(
  '../utils/process_fetch_params'
);

describe('useServicesBootstrap', () => {
  const localStorageKeyPrefix = 'discover';
  const query = {
    esql: 'FROM index',
  };

  beforeEach(() => {
    processFetchParamsMock.mockImplementation(actualProcessFetchParams);
    useStatePropsMock.mockReturnValue({
      chart: {
        hidden: false,
        timeInterval: 'auto',
      },
    } as ReturnType<typeof useStateProps>);
  });

  it('should initialize', async () => {
    const hook = renderHook(() =>
      useServicesBootstrap(
        {
          services: unifiedHistogramServicesMock,
          localStorageKeyPrefix,
        },
        { enableLensVisService: true }
      )
    );

    expect(createStateServiceMock).toHaveBeenCalledTimes(1);
    expect(getBreakdownFieldMock).toHaveBeenCalledTimes(1);
    expect(useStatePropsMock).toHaveBeenCalledTimes(1);

    expect(hook.result.current.api).not.toBeUndefined();
    expect(hook.result.current.fetch$).not.toBeUndefined();
    expect(hook.result.current.fetchParams).toBeUndefined();
    expect(hook.result.current.hasValidFetchParams).toBe(false);
    expect(hook.result.current.stateProps).toEqual({
      chart: { hidden: false, timeInterval: 'auto' },
    });

    const subscriber = jest.fn();
    hook.result.current.fetch$.subscribe(subscriber);

    expect(subscriber).toHaveBeenCalledTimes(0);

    const fetchParamsExternal: UnifiedHistogramFetchParamsExternal = {
      searchSessionId: 'test-session',
      dataSource: new DataViewSource(dataViewWithTimefieldMock),
      query,
      relativeTimeRange: { from: 'now-15m', to: 'now' },
      requestAdapter: new RequestAdapter(),
    };

    act(() => {
      hook.result.current.api.fetch(fetchParamsExternal);
    });

    await waitFor(() => {
      expect(hook.result.current.hasValidFetchParams).toBe(true);
    });
    expect(hook.result.current.fetchParams).toEqual(
      expect.objectContaining({
        searchSessionId: 'test-session',
        dataSource: fetchParamsExternal.dataSource,
        query,
      })
    );
    expect(hook.result.current.lensVisService).toBeDefined();
    expect(hook.result.current.lensVisServiceState).toBeDefined();
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({
      fetchParams: hook.result.current.fetchParams,
      lensVisServiceState: hook.result.current.lensVisServiceState,
    });
  });

  it('reuses LensVisService and ignores a stale overlapping fetch', async () => {
    const hook = renderHook(() =>
      useServicesBootstrap(
        {
          services: unifiedHistogramServicesMock,
          localStorageKeyPrefix,
        },
        { enableLensVisService: true }
      )
    );

    const baseFetchParams: UnifiedHistogramFetchParamsExternal = {
      searchSessionId: 'first',
      dataSource: new DataViewSource(dataViewWithTimefieldMock),
      query,
      relativeTimeRange: { from: 'now-15m', to: 'now' },
      requestAdapter: new RequestAdapter(),
    };

    await act(async () => {
      await hook.result.current.api.fetch(baseFetchParams);
    });

    const lensVisService = hook.result.current.lensVisService;
    expect(lensVisService).toBeDefined();

    let resolveStaleFetch: (value: unknown) => void = () => {};
    const staleFetchGate = new Promise((resolve) => {
      resolveStaleFetch = resolve;
    });

    processFetchParamsMock.mockImplementation(async (args) => {
      const result = await actualProcessFetchParams(args);
      if (args.params.searchSessionId === 'stale-area') {
        await staleFetchGate;
      }
      return result;
    });

    let staleFetchDone = false;
    const staleFetch = hook.result.current.api.fetch({
      ...baseFetchParams,
      searchSessionId: 'stale-area',
    });
    void staleFetch.then(() => {
      staleFetchDone = true;
    });

    await act(async () => {
      await hook.result.current.api.fetch({
        ...baseFetchParams,
        searchSessionId: 'line',
      });
    });

    expect(hook.result.current.fetchParams?.searchSessionId).toBe('line');
    expect(hook.result.current.lensVisService).toBe(lensVisService);

    await act(async () => {
      resolveStaleFetch(undefined);
      await staleFetch;
    });

    expect(staleFetchDone).toBe(true);
    expect(hook.result.current.fetchParams?.searchSessionId).toBe('line');
    expect(hook.result.current.lensVisService).toBe(lensVisService);
  });
});
