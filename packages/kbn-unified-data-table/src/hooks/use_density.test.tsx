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
import { useDensity } from './use_density';

const localStorageMock = {
  get: jest.fn(),
  set: jest.fn(),
};

describe('useDensity', () => {
  beforeEach(() => {
    localStorageMock.get.mockClear();
    localStorageMock.set.mockClear();
  });

  it('should read from local storage', () => {
    localStorageMock.get.mockReturnValue({ foo: 'bar' });
    const { result } = renderHook(() =>
      useDensity({
        storage: localStorageMock as unknown as Storage,
        consumer: 'discover',
      })
    );
    const {
      current: { density },
    } = result;
    expect(density).toMatchInlineSnapshot(`
      Object {
        "foo": "bar",
      }
    `);
  });

  it('should update local storage when onChangeDensity is called', () => {
    const { result } = renderHook(() =>
      useDensity({
        storage: localStorageMock as unknown as Storage,
        consumer: 'discover',
      })
    );
    const {
      current: { onChangeDensity },
    } = result;

    const newValue: EuiDataGridStyle = { border: 'all', footer: 'shade' };
    onChangeDensity(newValue);

    expect(localStorageMock.set).toBeCalledWith('discover:dataGridStyle', newValue);
  });

  it('should call provided onUpdateDensity with the updated value', () => {
    const onUpdateDensity = jest.fn();
    const { result } = renderHook(() =>
      useDensity({
        storage: localStorageMock as unknown as Storage,
        consumer: 'discover',
        onUpdateDensity,
      })
    );
    const {
      current: { onChangeDensity },
    } = result;

    const newValue: EuiDataGridStyle = { border: 'all', footer: 'shade' };
    onChangeDensity(newValue);

    expect(onUpdateDensity).toBeCalledWith(newValue);
  });
});
