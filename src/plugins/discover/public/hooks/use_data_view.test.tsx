/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import { useDataView } from './use_data_view';

const adhocDataView = {
  id: '2',
  title: 'test2',
  fields: [],
};

const dataViews = [
  {
    id: '1',
    title: 'test',
    fields: [],
  },
  adhocDataView,
];

const mockServices = {
  dataViews: {
    get: jest.fn((dataViewId: string) =>
      Promise.resolve(dataViews.find(({ id }) => id === dataViewId))
    ),
    create: jest.fn((spec) => Promise.resolve(spec)),
  },
};

const render = async ({ dataViewId }: { dataViewId: string }) => {
  const hookResult = renderHook(() => useDataView({ index: dataViewId }), {
    wrapper: ({ children }) => (
      <KibanaContextProvider services={mockServices}>{children}</KibanaContextProvider>
    ),
  });
  await hookResult.waitForNextUpdate();

  return hookResult;
};

describe('useDataView', () => {
  it('should load save data view', async () => {
    const { result } = await render({ dataViewId: '1' });
    expect(mockServices.dataViews.get).toHaveBeenCalledWith('1');
    expect(result.current.dataView).toEqual(dataViews[0]);
  });

  it('should throw an error on saved data view load ', async () => {
    mockServices.dataViews.get.mockImplementationOnce(() =>
      Promise.reject(new Error('can not load'))
    );

    const { result } = await render({ dataViewId: '1' });
    expect(result.current.error!.message).toEqual('can not load');
  });

  it('should get adhoc data view from cache', async () => {
    const { result } = await render({ dataViewId: '2' });

    expect(mockServices.dataViews.get).toHaveBeenCalledWith(adhocDataView.id);
    expect(mockServices.dataViews.create).toBeCalledTimes(0);
    expect(result.current.dataView).toEqual(adhocDataView);
  });
});
