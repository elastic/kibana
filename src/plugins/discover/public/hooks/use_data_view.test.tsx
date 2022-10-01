/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useDataView } from './use_data_view';
import { dataViewMock } from '../__mocks__/data_view';
import { renderHook } from '@testing-library/react-hooks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataViewsMock } from '../__mocks__/data_views';

const render = (id: string) => {
  return renderHook((dataViewId) => useDataView({ dataViewId }), {
    initialProps: id,
    wrapper: ({ children }) => (
      <KibanaContextProvider services={{ dataViews: dataViewsMock }}>
        {children}
      </KibanaContextProvider>
    ),
  });
};

describe('Use data view', () => {
  test('returning a valid data view', async () => {
    const { result, waitForNextUpdate } = render(dataViewMock.id!);
    await waitForNextUpdate();
    expect(result.current.dataView).toBe(dataViewMock);
    expect(result.current.error).toBe(undefined);
  });

  test('returning an error', async () => {
    const { result, waitForNextUpdate } = render('invalid-data-view-id');
    await waitForNextUpdate();
    expect(result.current.dataView).toBe(undefined);
    expect(result.current.error).toBeTruthy();
  });
});
