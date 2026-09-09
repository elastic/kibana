/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { getESQLSources } from '@kbn/esql-editor/src/helpers';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import { serviceContextMock } from '../../../contexts/services_context.mock';
import {
  CONSOLE_ESQL_SOURCES_CACHE_INVALIDATE_DELAY,
  useConsoleEsqlCallbacks,
} from './use_console_esql_callbacks';

jest.mock('@kbn/esql-editor/src/helpers', () => ({
  getESQLSources: jest.fn(),
}));

jest.mock('@kbn/esql-utils', () => ({
  getESQLQueryColumns: jest.fn(),
}));

const mockGetESQLSources = getESQLSources as jest.MockedFunction<typeof getESQLSources>;
const mockGetESQLQueryColumns = getESQLQueryColumns as jest.MockedFunction<
  typeof getESQLQueryColumns
>;

type SourcesResult = Awaited<ReturnType<typeof getESQLSources>>;

const createParams = () => {
  const {
    services: { application, http, licensing, data, dataViews },
  } = serviceContextMock.create();

  return { application, http, licensing, data, dataViews };
};

describe('useConsoleEsqlCallbacks', () => {
  const sources: SourcesResult = [{ name: 'logs', hidden: false, type: 'Index' }];

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    mockGetESQLSources.mockResolvedValue(sources);
    mockGetESQLQueryColumns.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reuses the same sources request while the cache is fresh', async () => {
    const params = createParams();
    const { result } = renderHook(() => useConsoleEsqlCallbacks(params));

    const firstRequest = result.current.getSources!();
    const secondRequest = result.current.getSources!();

    expect(mockGetESQLSources).toHaveBeenCalledTimes(1);
    expect(mockGetESQLSources).toHaveBeenCalledWith(
      params.dataViews,
      { application: params.application, http: params.http },
      params.licensing.getLicense
    );
    await expect(firstRequest).resolves.toBe(sources);
    await expect(secondRequest).resolves.toBe(sources);

    await result.current.getSources!();

    expect(mockGetESQLSources).toHaveBeenCalledTimes(1);
  });

  it('fetches sources again after the cache expires', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const { result } = renderHook(() => useConsoleEsqlCallbacks(createParams()));

    await result.current.getSources!();
    nowSpy.mockReturnValue(1000 + CONSOLE_ESQL_SOURCES_CACHE_INVALIDATE_DELAY + 1);
    await result.current.getSources!();

    expect(mockGetESQLSources).toHaveBeenCalledTimes(2);
  });

  it('does not cache rejected sources requests', async () => {
    const error = new Error('failed to fetch sources');
    mockGetESQLSources.mockRejectedValueOnce(error).mockResolvedValueOnce(sources);
    const { result } = renderHook(() => useConsoleEsqlCallbacks(createParams()));

    await expect(result.current.getSources!()).rejects.toThrow(error);
    await expect(result.current.getSources!()).resolves.toBe(sources);

    expect(mockGetESQLSources).toHaveBeenCalledTimes(2);
  });

  it('rejects concurrent callers sharing an in-flight request that fails and refetches afterwards', async () => {
    const error = new Error('failed to fetch sources');
    let rejectInFlight: (reason: Error) => void;
    mockGetESQLSources
      .mockImplementationOnce(
        () =>
          new Promise<SourcesResult>((_resolve, reject) => {
            rejectInFlight = reject;
          })
      )
      .mockResolvedValueOnce(sources);
    const { result } = renderHook(() => useConsoleEsqlCallbacks(createParams()));

    const firstRequest = result.current.getSources!();
    const secondRequest = result.current.getSources!();

    expect(mockGetESQLSources).toHaveBeenCalledTimes(1);

    rejectInFlight!(error);

    await expect(firstRequest).rejects.toThrow(error);
    await expect(secondRequest).rejects.toThrow(error);

    await expect(result.current.getSources!()).resolves.toBe(sources);
    expect(mockGetESQLSources).toHaveBeenCalledTimes(2);
  });

  it('keeps a fresh cache when a stale request rejects after the cache was refreshed', async () => {
    const staleError = new Error('stale sources request');
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
    let rejectStale: (reason: Error) => void;
    mockGetESQLSources
      .mockImplementationOnce(
        () =>
          new Promise<SourcesResult>((_resolve, reject) => {
            rejectStale = reject;
          })
      )
      .mockResolvedValueOnce(sources);
    const { result } = renderHook(() => useConsoleEsqlCallbacks(createParams()));

    const staleRequest = Promise.resolve(result.current.getSources!());
    staleRequest.catch(() => {});

    nowSpy.mockReturnValue(1000 + CONSOLE_ESQL_SOURCES_CACHE_INVALIDATE_DELAY + 1);
    await expect(result.current.getSources!()).resolves.toBe(sources);
    expect(mockGetESQLSources).toHaveBeenCalledTimes(2);

    rejectStale!(staleError);
    await expect(staleRequest).rejects.toThrow(staleError);

    await expect(result.current.getSources!()).resolves.toBe(sources);
    expect(mockGetESQLSources).toHaveBeenCalledTimes(2);
  });

  it('starts a fresh sources cache when dependencies change', async () => {
    const { result, rerender } = renderHook((props) => useConsoleEsqlCallbacks(props), {
      initialProps: createParams(),
    });

    await result.current.getSources!();
    rerender(createParams());
    await result.current.getSources!();

    expect(mockGetESQLSources).toHaveBeenCalledTimes(2);
  });

  it('keeps the cached sources and callback identity across rerenders when dependencies are unchanged', async () => {
    const params = createParams();
    const { result, rerender } = renderHook((props) => useConsoleEsqlCallbacks(props), {
      initialProps: params,
    });

    const initialCallbacks = result.current;
    await result.current.getSources!();
    rerender(params);

    expect(result.current).toBe(initialCallbacks);

    await result.current.getSources!();

    expect(mockGetESQLSources).toHaveBeenCalledTimes(1);
  });

  it('delegates column requests without caching them', async () => {
    const params = createParams();
    const { result } = renderHook(() => useConsoleEsqlCallbacks(params));

    await result.current.getColumnsFor!({ query: 'FROM logs' });
    await result.current.getColumnsFor!({ query: 'FROM logs' });

    expect(mockGetESQLQueryColumns).toHaveBeenCalledWith({
      esqlQuery: 'FROM logs',
      search: params.data.search.search,
    });
    expect(mockGetESQLQueryColumns).toHaveBeenCalledTimes(2);

    const emptyResult = await result.current.getColumnsFor!();

    expect(emptyResult).toEqual([]);
    expect(mockGetESQLQueryColumns).toHaveBeenCalledTimes(2);
  });
});
