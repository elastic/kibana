/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { ReactNode } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useColumns } from './use_data_grid_columns';
import { dataViewMock } from '../__mocks__/data_view';
import { KibanaContextProvider } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana';
import { discoverServiceMock } from '../__mocks__/services';
import { getState } from '../application/main/services/discover_state';
import { createBrowserHistory } from 'history';

describe('useColumns', () => {
  const defaultProps = {
    dataView: dataViewMock,
    stateContainer: getState({
      getStateDefaults: () => ({ index: 'test', columns: ['Time', 'message'] }),
      history: createBrowserHistory(),
      uiSettings: discoverServiceMock.uiSettings,
    }),
    useNewFieldsApi: false,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <KibanaContextProvider services={discoverServiceMock}>{children}</KibanaContextProvider>
  );

  test('should return valid result', () => {
    const { result } = renderHook(
      () => {
        return useColumns(defaultProps);
      },
      { wrapper }
    );

    expect(result.current.columns).toEqual(['Time', 'message']);
    expect(result.current.onAddColumn).toBeInstanceOf(Function);
    expect(result.current.onRemoveColumn).toBeInstanceOf(Function);
    expect(result.current.onMoveColumn).toBeInstanceOf(Function);
    expect(result.current.onSetColumns).toBeInstanceOf(Function);
  });

  test('should skip _source column when useNewFieldsApi is set to true', () => {
    const { result } = renderHook(
      () => {
        return useColumns({
          ...defaultProps,
          stateContainer: getState({
            getStateDefaults: () => ({ index: 'test', columns: ['Time', '_source'] }),
            history: createBrowserHistory(),
            uiSettings: discoverServiceMock.uiSettings,
          }),
        });
      },
      { wrapper }
    );

    expect(result.current.columns).toEqual(['Time']);
  });

  test('should return empty columns array', () => {
    const { result } = renderHook(
      () => {
        return useColumns({
          ...defaultProps,
          stateContainer: getState({
            getStateDefaults: () => ({ index: 'test', columns: [] }),
            history: createBrowserHistory(),
            uiSettings: discoverServiceMock.uiSettings,
          }),
        });
      },
      { wrapper }
    );
    expect(result.current.columns).toEqual([]);
  });
});
