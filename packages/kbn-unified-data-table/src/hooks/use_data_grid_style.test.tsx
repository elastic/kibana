/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridStyle } from '@elastic/eui';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import { useDataGridStyle } from './use_data_grid_style';

const localStorageMock = {
  get: jest.fn(),
  set: jest.fn(),
};

describe('useDataGridStyle', () => {
  beforeEach(() => {
    localStorageMock.get.mockClear();
    localStorageMock.set.mockClear();
  });

  it('should read from local storage', () => {
    localStorageMock.get.mockReturnValue({ foo: 'bar' });
    const { result } = renderHook(() =>
      useDataGridStyle({
        storage: localStorageMock as unknown as Storage,
        consumer: 'discover',
      })
    );
    const {
      current: { dataGridStyle },
    } = result;
    expect(dataGridStyle).toMatchInlineSnapshot(`
      Object {
        "foo": "bar",
      }
    `);
  });

  it('should update local storage when onChangeDataGridStyle is called', () => {
    const { result } = renderHook(() =>
      useDataGridStyle({
        storage: localStorageMock as unknown as Storage,
        consumer: 'discover',
      })
    );
    const {
      current: { onChangeDataGridStyle },
    } = result;

    const newValue: EuiDataGridStyle = { border: 'all', footer: 'shade' };
    onChangeDataGridStyle(newValue);

    expect(localStorageMock.set).toBeCalledWith('discover:dataGridStyle', newValue);
  });

  it('should call provided onUpdateDataGridStyle with the updated value', () => {
    const onUpdateDataGridStyle = jest.fn();
    const { result } = renderHook(() =>
      useDataGridStyle({
        storage: localStorageMock as unknown as Storage,
        consumer: 'discover',
        onUpdateDataGridStyle,
      })
    );
    const {
      current: { onChangeDataGridStyle },
    } = result;

    const newValue: EuiDataGridStyle = { border: 'all', footer: 'shade' };
    onChangeDataGridStyle(newValue);

    expect(onUpdateDataGridStyle).toBeCalledWith(newValue);
  });
});
