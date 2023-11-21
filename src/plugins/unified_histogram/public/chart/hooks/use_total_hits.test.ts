/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { UnifiedHistogramFetchStatus, UnifiedHistogramInput$ } from '../../types';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { useTotalHits } from './use_total_hits';
import { useEffect as mockUseEffect } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { of, Subject, throwError } from 'rxjs';
import { waitFor } from '@testing-library/react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { DataViewType, SearchSourceSearchOptions } from '@kbn/data-plugin/common';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';

jest.mock('react-use/lib/useDebounce', () => {
  return jest.fn((...args) => {
    mockUseEffect(args[0], args[2]);
  });
});

describe('useTotalHits', () => {
  const timeRange = { from: 'now-15m', to: 'now' };
  const refetch$: UnifiedHistogramInput$ = new Subject();
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
    dataView: dataViewWithTimefieldMock,
    request: undefined,
    hits: {
      status: UnifiedHistogramFetchStatus.uninitialized,
      total: undefined,
    },
    chartVisible: false,
    filters: [],
    query: { query: '', language: 'kuery' },
    getTimeRange: () => timeRange,
    refetch$,
    onTotalHitsChange: jest.fn(),
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
    jest
      .spyOn(data.query.timefilter.timefilter, 'createFilter')
      .mockClear()
      .mockReturnValue(timeRange as any);
    const query = { query: 'test query', language: 'kuery' };
    const filters: Filter[] = [{ meta: { index: 'test' }, query: { match_all: {} } }];
    const adapter = new RequestAdapter();
    renderHook(() =>
      useTotalHits({
        ...getDeps(),
        services: { data } as any,
        request: {
          searchSessionId: '123',
          adapter,
        },
        query,
        filters,
        refetch$,
        onTotalHitsChange,
      })
    );
    expect(onTotalHitsChange).toBeCalledTimes(1);
    expect(onTotalHitsChange).toBeCalledWith(UnifiedHistogramFetchStatus.loading, undefined);
    expect(setFieldSpy).toHaveBeenCalledWith('index', dataViewWithTimefieldMock);
    expect(setFieldSpy).toHaveBeenCalledWith('query', query);
    expect(setFieldSpy).toHaveBeenCalledWith('size', 0);
    expect(setFieldSpy).toHaveBeenCalledWith('trackTotalHits', true);
    expect(setFieldSpy).toHaveBeenCalledWith('filter', [...filters, timeRange]);
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

  it('should fetch total hits if isPlainRecord is true', async () => {
    const onTotalHitsChange = jest.fn();
    const deps = {
      ...getDeps(),
      isPlainRecord: true,
      onTotalHitsChange,
      query: { esql: 'from test' },
    };
    renderHook(() => useTotalHits(deps));
    expect(onTotalHitsChange).toBeCalledTimes(1);
    await waitFor(() => {
      expect(deps.services.expressions.run).toBeCalledTimes(1);
      expect(onTotalHitsChange).toBeCalledWith(UnifiedHistogramFetchStatus.complete, 3);
    });
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

  it('should not fetch a second time if refetch$ is not triggered', async () => {
    const onTotalHitsChange = jest.fn();
    const fetchSpy = jest.spyOn(searchSourceInstanceMock, 'fetch$').mockClear();
    const setFieldSpy = jest.spyOn(searchSourceInstanceMock, 'setField').mockClear();
    const options = { ...getDeps(), onTotalHitsChange };
    const { rerender } = renderHook(() => useTotalHits(options));
    expect(onTotalHitsChange).toBeCalledTimes(1);
    expect(setFieldSpy).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(onTotalHitsChange).toBeCalledTimes(2);
    });
    rerender();
    expect(onTotalHitsChange).toBeCalledTimes(2);
    expect(setFieldSpy).toHaveBeenCalledTimes(5);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should fetch a second time if refetch$ is triggered', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort').mockClear();
    const onTotalHitsChange = jest.fn();
    const fetchSpy = jest.spyOn(searchSourceInstanceMock, 'fetch$').mockClear();
    const setFieldSpy = jest.spyOn(searchSourceInstanceMock, 'setField').mockClear();
    const options = { ...getDeps(), onTotalHitsChange };
    const { rerender } = renderHook(() => useTotalHits(options));
    expect(onTotalHitsChange).toBeCalledTimes(1);
    expect(setFieldSpy).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(onTotalHitsChange).toBeCalledTimes(2);
    });
    refetch$.next({ type: 'refetch' });
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
    renderHook(() => useTotalHits({ ...getDeps(), onTotalHitsChange }));
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
    const data = dataPluginMock.createStartContract();
    jest
      .spyOn(data.query.timefilter.timefilter, 'createFilter')
      .mockClear()
      .mockReturnValue(timeRange as any);
    const filters: Filter[] = [{ meta: { index: 'test' }, query: { match_all: {} } }];
    renderHook(() =>
      useTotalHits({
        ...getDeps(),
        dataView: {
          ...dataViewWithTimefieldMock,
          type: DataViewType.ROLLUP,
        } as any,
        filters,
      })
    );
    expect(setOverwriteDataViewTypeSpy).toHaveBeenCalledWith(undefined);
    expect(setFieldSpy).toHaveBeenCalledWith('filter', filters);
  });
});
