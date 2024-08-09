/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import * as ReactQuery from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import { testQueryClientConfig } from '../test_utils/test_query_client_config';
import { queryKeyPrefix, useVirtualDataViewQuery } from './use_virtual_data_view_query';
import { DataView } from '@kbn/data-views-plugin/common';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';

const { QueryClient, QueryClientProvider } = ReactQuery;
const useQuerySpy = jest.spyOn(ReactQuery, 'useQuery');

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: FunctionComponent = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockDataView = { fields: [] } as unknown as DataView;

const mockDataViewsService = dataViewPluginMocks.createStartContract();
mockDataViewsService.create.mockResolvedValue(mockDataView);
mockDataViewsService.clearInstanceCache = jest.fn();

describe('useVirtualDataViewQuery', () => {
  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('does not create a data view if indexNames is empty or nullish', () => {
    const { rerender } = renderHook(
      ({ indexNames }: { indexNames: string[] }) =>
        useVirtualDataViewQuery({ dataViewsService: mockDataViewsService, indexNames }),
      {
        wrapper,
      }
    );

    expect(mockDataViewsService.create).not.toHaveBeenCalled();
    rerender({ indexNames: [] });
    expect(useQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false, queryKey: queryKeyPrefix.concat([]) })
    );

    expect(mockDataViewsService.create).not.toHaveBeenCalled();
  });

  it('calls dataViewsService.create with the correct index names', () => {
    const indexNames = ['.alerts-stack*', '.alerts-o11y*'];
    renderHook(
      () => useVirtualDataViewQuery({ dataViewsService: mockDataViewsService, indexNames }),
      {
        wrapper,
      }
    );

    expect(mockDataViewsService.create).toHaveBeenCalledWith({
      title: indexNames.join(','),
      allowNoIndex: true,
    });
  });

  it('correctly caches the data view', () => {
    const { rerender } = renderHook(
      () =>
        useVirtualDataViewQuery({
          dataViewsService: mockDataViewsService,
          indexNames: ['.alerts-*'],
        }),
      {
        wrapper,
      }
    );

    expect(mockDataViewsService.create).toHaveBeenCalledTimes(1);

    rerender();

    expect(mockDataViewsService.create).toHaveBeenCalledTimes(1);
  });

  it('removes the data view from the instance cache on unmount', async () => {
    const { result, waitForValueToChange, unmount } = renderHook(
      () =>
        useVirtualDataViewQuery({
          dataViewsService: mockDataViewsService,
          indexNames: ['.alerts-*'],
        }),
      {
        wrapper,
      }
    );

    await waitForValueToChange(() => result.current.data);

    unmount();

    expect(mockDataViewsService.clearInstanceCache).toHaveBeenCalled();
  });
});
