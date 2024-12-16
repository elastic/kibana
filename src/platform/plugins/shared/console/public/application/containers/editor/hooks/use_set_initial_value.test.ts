/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useSetInitialValue } from './use_set_initial_value';
import { IToasts } from '@kbn/core-notifications-browser';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { DEFAULT_INPUT_VALUE } from '../../../../../common/constants';

jest.mock('lz-string', () => ({
  decompressFromEncodedURIComponent: jest.fn(),
}));

jest.mock('./use_set_initial_value', () => ({
  ...jest.requireActual('./use_set_initial_value'),
}));

describe('useSetInitialValue', () => {
  const setValueMock = jest.fn();
  const addWarningMock = jest.fn();
  const toastsMock: IToasts = { addWarning: addWarningMock } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set the initial value only once', async () => {
    const { rerender } = renderHook(() =>
      useSetInitialValue({
        localStorageValue: 'initial value',
        setValue: setValueMock,
        toasts: toastsMock,
      })
    );

    // Verify initial value is set on first render
    expect(setValueMock).toHaveBeenCalledTimes(1);
    expect(setValueMock).toHaveBeenCalledWith('initial value');

    // Re-render the hook to simulate a component update
    rerender();

    // Verify that setValue is not called again after rerender
    expect(setValueMock).toHaveBeenCalledTimes(1); // Still 1, no additional calls
  });

  it('should set value from localStorage if no load_from param is present', () => {
    renderHook(() =>
      useSetInitialValue({
        localStorageValue: 'saved value',
        setValue: setValueMock,
        toasts: toastsMock,
      })
    );

    expect(setValueMock).toHaveBeenCalledWith('saved value');
  });

  it('should set default value if localStorage is undefined and no load_from param is present', () => {
    renderHook(() =>
      useSetInitialValue({
        localStorageValue: undefined,
        setValue: setValueMock,
        toasts: toastsMock,
      })
    );

    expect(setValueMock).toHaveBeenCalledWith(DEFAULT_INPUT_VALUE);
  });

  it('should load data from load_from param if it is a valid Elastic URL', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hash: '?load_from=https://www.elastic.co/some-data',
      },
    });

    // Mock fetch to return "remote data"
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve('remote data'),
      })
    ) as jest.Mock;

    await act(async () => {
      renderHook(() =>
        useSetInitialValue({
          localStorageValue: 'initial value',
          setValue: setValueMock,
          toasts: toastsMock,
        })
      );
    });

    expect(fetch).toHaveBeenCalledWith(new URL('https://www.elastic.co/some-data'));
    // The remote data should be appended to the initial value in the editor
    expect(setValueMock).toHaveBeenCalledWith('initial value\n\nremote data');
  });

  it('should show a warning if the load_from param is not an Elastic domain', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hash: '?load_from=https://not.elastic.com/some-data',
      },
    });

    await act(async () => {
      renderHook(() =>
        useSetInitialValue({
          localStorageValue: 'initial value',
          setValue: setValueMock,
          toasts: toastsMock,
        })
      );
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(addWarningMock).toHaveBeenCalledWith(
      'Only URLs with the Elastic domain (www.elastic.co) can be loaded in Console.'
    );
  });

  it('should load and decompress data from a data URI', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hash: '?load_from=data:text/plain,compressed-data',
      },
    });
    (decompressFromEncodedURIComponent as jest.Mock).mockReturnValue('decompressed data');

    await act(async () => {
      renderHook(() =>
        useSetInitialValue({
          localStorageValue: 'initial value',
          setValue: setValueMock,
          toasts: toastsMock,
        })
      );
    });

    expect(decompressFromEncodedURIComponent).toHaveBeenCalledWith('compressed-data');
    // The initial value in the editor should be replaces with the decompressed data
    expect(setValueMock).toHaveBeenCalledWith('decompressed data');
  });

  it('should show a warning if decompressing a data URI fails', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hash: '?load_from=data:text/plain,invalid-data',
      },
    });
    (decompressFromEncodedURIComponent as jest.Mock).mockReturnValue(null);

    await act(async () => {
      renderHook(() =>
        useSetInitialValue({
          localStorageValue: 'initial value',
          setValue: setValueMock,
          toasts: toastsMock,
        })
      );
    });

    expect(addWarningMock).toHaveBeenCalledWith(
      'Unable to load data from the load_from query parameter in the URL'
    );
  });
});
