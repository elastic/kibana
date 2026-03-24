/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { UnifiedHistogramFetch$ } from '../../../types';
import { UnifiedHistogramFetchStatus } from '../../../types';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { useTotalHits } from './use_total_hits';
import { useEffect as mockUseEffect } from 'react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { of, throwError } from 'rxjs';
import { waitFor, renderHook } from '@testing-library/react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { SearchSourceSearchOptions } from '@kbn/data-plugin/common';
import { DataViewType } from '@kbn/data-plugin/common';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { getFetchParamsMock, getFetch$Mock } from '../../../__mocks__/fetch_params';

jest.mock('react-use/lib/useDebounce', () => {
  return jest.fn((...args) => {
    mockUseEffect(args[0], args[2]);
  });
});

describe('useTotalHits', () => {
  let fetch$: UnifiedHistogramFetch$ = getFetch$Mock();
  const getDeps = () => ({
    services: {
      data: dataPluginMock.createStartContract(),
      expressions: {
        ...expressionsPluginMock.createStartContract(),
        run: jest.fn(() =>
          of({
            partial: false,
            result: {
              rows: [{}, {}, {}],
            },
          })
        ),
      },
    } as any,
    hits: {
      status: UnifiedHistogramFetchStatus.uninitialized,
      total: undefined,
    },
    chartVisible: false,
    fetch$,
    abortController: new AbortController(),
    onTotalHitsChange: jest.fn(),
  });

  beforeEach(() => {
    fetch$ = getFetch$Mock();
  });

  it('should fetch total hits on first execution', async () => {
    const onTotalHitsChange = jest.fn();
    let fetchOptions: SearchSourceSearchOptions | undefined;
    const fetchSpy = jest
      .spyOn(searchSourceInstanceMock, 'fetch$')
      .mockClear()
      .mockImplementation((options) => {
        fetchOptions = options;
        return of({
          isRunning: false,
          isPartial: false,
          rawResponse: {
            hits: {
              total: 42,
            },
          },
        }) as any;
      });
    const setFieldSpy = jest.spyOn(searchSourceInstanceMock, 'setField').mockClear();
    const data = dataPluginMock.createStartContract();
    const adapter = new RequestAdapter();
    const fetchParams = getFetchParamsMock({
      query: { query: 'test query', language: 'kuery' },
      filters: [{ meta: { index: 'test' }, query: { match_all: {} } }],
      searchSessionId: '123',
      requestAdapter: adapter,
    });
    jest
      .spyOn(data.query.timefilter.timefilter, 'createFilter')
      .mockClear()
      .mockReturnValue(fetchParams.timeRange as any);
    const { rerender } = renderHook(() =>
      useTotalHits({
        ...getDeps(),
        services: { data } as any,
        onTotalHitsChange,
      })
    );
    fetch$.next({ fetchParams, lensVisServiceState: undefined });
    rerender();
    expect(onTotalHitsChange).toBeCalledTimes(1);
    expect(onTotalHitsChange).toBeCalledWith(UnifiedHistogramFetchStatus.loading, undefined);
    expect(setFieldSpy).toHaveBeenCalledWith('index', dataViewWithTimefieldMock);
    expect(setFieldSpy).toHaveBeenCalledWith('query', fetchParams.query);
    expect(setFieldSpy).toHaveBeenCalledWith('size', 0);
    expect(setFieldSpy).toHaveBeenCalledWith('trackTotalHits', true);
    expect(setFieldSpy).toHaveBeenCalledWith('filter', [
      ...fetchParams.filters,
      fetchParams.timeRange,
    ]);
    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchOptions?.inspector?.adapter).toBe(adapter);
    expect(fetchOptions?.sessionId).toBe('123');
    expect(fetchOptions?.abortSignal).toBeInstanceOf(AbortSignal);
    expect(fetchOptions?.executionContext?.description).toBe('fetch total hits');
    await waitFor(() => {
      expect(onTotalHitsChange).toBeCalledTimes(2);
      expect(onTotalHitsChange).toBeCalledWith(UnifiedHistogramFetchStatus.complete, 42);
    });
  });

  it('should not fetch total hits if isPlainRecord is true', async () => {
    const onTotalHitsChange = jest.fn();
    const fetchParams = getFetchParamsMock({
      query: { esql: 'from test' },
    });
    const deps = {
      ...getDeps(),
      onTotalHitsChange,
    };
    const { rerender } = renderHook(() => useTotalHits(deps));
    fetch$.next({ fetchParams, lensVisServiceState: undefined });
    rerender();
    expect(onTotalHitsChange).not.toHaveBeenCalled();
  });

  it('should not fetch total hits if chartVisible is true', async () => {
    const onTotalHitsChange = jest.fn();
    const fetchSpy = jest.spyOn(searchSourceInstanceMock, 'fetch$').mockClear();
    const setFieldSpy = jest.spyOn(searchSourceInstanceMock, 'setField').mockClear();
    renderHook(() => useTotalHits({ ...getDeps(), chartVisible: true, onTotalHitsChange }));
    expect(onTotalHitsChange).toBeCalledTimes(0);
    expect(setFieldSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should not fetch total hits if hits is undefined', async () => {
    const onTotalHitsChange = jest.fn();
    const fetchSpy = jest.spyOn(searchSourceInstanceMock, 'fetch$').mockClear();
    const setFieldSpy = jest.spyOn(searchSourceInstanceMock, 'setField').mockClear();
    renderHook(() => useTotalHits({ ...getDeps(), hits: undefined, onTotalHitsChange }));
    expect(onTotalHitsChange).toBeCalledTimes(0);
    expect(setFieldSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should not fetch if fetch$ is not triggered', async () => {
    const onTotalHitsChange = jest.fn();
    const fetchSpy = jest.spyOn(searchSourceInstanceMock, 'fetch$').mockClear();
    const setFieldSpy = jest.spyOn(searchSourceInstanceMock, 'setField').mockClear();
    const options = { ...getDeps(), onTotalHitsChange };
    const { rerender } = renderHook(() => useTotalHits(options));
    rerender();
    expect(onTotalHitsChange).toBeCalledTimes(0);
    expect(setFieldSpy).toHaveBeenCalledTimes(0);
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it('should fetch a second time if fetch$ is triggered', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort').mockClear();
    const onTotalHitsChange = jest.fn();
    const fetchSpy = jest.spyOn(searchSourceInstanceMock, 'fetch$').mockClear();
    const setFieldSpy = jest.spyOn(searchSourceInstanceMock, 'setField').mockClear();
    const options = { ...getDeps(), onTotalHitsChange };
    const { rerender } = renderHook(() => useTotalHits(options));
    fetch$.next({ fetchParams: getFetchParamsMock(), lensVisServiceState: undefined });
    rerender();
    expect(onTotalHitsChange).toBeCalledTimes(1);
    expect(setFieldSpy).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(onTotalHitsChange).toBeCalledTimes(2);
    });
    fetch$.next({ fetchParams: getFetchParamsMock(), lensVisServiceState: undefined });
    rerender();
    expect(abortSpy).toHaveBeenCalled();
    expect(onTotalHitsChange).toBeCalledTimes(3);
    expect(setFieldSpy).toHaveBeenCalledTimes(10);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(onTotalHitsChange).toBeCalledTimes(4);
    });
  });

  it('should call onTotalHitsChange with an error status if fetch fails', async () => {
    const onTotalHitsChange = jest.fn();
    const error = new Error('test error');
    jest
      .spyOn(searchSourceInstanceMock, 'fetch$')
      .mockClear()
      .mockReturnValue(throwError(() => error));
    const options = { ...getDeps(), onTotalHitsChange };
    const { rerender } = renderHook(() => useTotalHits(options));
    fetch$.next({ fetchParams: getFetchParamsMock(), lensVisServiceState: undefined });
    rerender();
    await waitFor(() => {
      expect(onTotalHitsChange).toBeCalledTimes(2);
      expect(onTotalHitsChange).toBeCalledWith(UnifiedHistogramFetchStatus.error, error);
    });
  });

  it('should call searchSource.setOverwriteDataViewType if dataView is a rollup', async () => {
    const setOverwriteDataViewTypeSpy = jest
      .spyOn(searchSourceInstanceMock, 'setOverwriteDataViewType')
      .mockClear();
    const setFieldSpy = jest.spyOn(searchSourceInstanceMock, 'setField').mockClear();
    const fetchParams = getFetchParamsMock({
      filters: [{ meta: { index: 'test' }, query: { match_all: {} } }],
      dataView: {
        ...dataViewWithTimefieldMock,
        type: DataViewType.ROLLUP,
      } as any,
    });
    const data = dataPluginMock.createStartContract();
    jest
      .spyOn(data.query.timefilter.timefilter, 'createFilter')
      .mockClear()
      .mockReturnValue(fetchParams.timeRange as any);
    const filters: Filter[] = [{ meta: { index: 'test' }, query: { match_all: {} } }];
    const { rerender } = renderHook(() => useTotalHits(getDeps()));
    fetch$.next({ fetchParams, lensVisServiceState: undefined });
    rerender();
    expect(setOverwriteDataViewTypeSpy).toHaveBeenCalledWith(undefined);
    expect(setFieldSpy).toHaveBeenCalledWith('filter', filters);
  });
});
