/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useSyncToUrl } from '.';
import { encode } from '@kbn/rison';

describe('useSyncToUrl', () => {
  let originalLocation: Location;
  let originalHistory: History;

  beforeEach(() => {
    originalLocation = window.location;
    originalHistory = window.history;
    delete (window as any).location;
    delete (window as any).history;

    window.location = {
      ...originalLocation,
      search: '',
    };
    window.history = {
      ...originalHistory,
      replaceState: jest.fn(),
    };
  });

  afterEach(() => {
    window.location = originalLocation;
    window.history = originalHistory;
  });

  it('should restore the value from the query string on mount', () => {
    const key = 'testKey';
    const restoredValue = { test: 'value' };
    const encodedValue = encode(restoredValue);
    const restore = jest.fn();

    window.location.search = `?${key}=${encodedValue}`;

    renderHook(() => useSyncToUrl(key, restore));

    expect(restore).toHaveBeenCalledWith(restoredValue);
  });

  it('should sync the value to the query string', () => {
    const key = 'testKey';
    const valueToSerialize = { test: 'value' };

    const { result } = renderHook(() => useSyncToUrl(key, jest.fn()));

    act(() => {
      result.current(valueToSerialize);
    });

    expect(window.history.replaceState).toHaveBeenCalledWith(
      { path: expect.any(String) },
      '',
      '/?testKey=%28test%3Avalue%29'
    );
  });

  it('should clear the value from the query string on unmount', () => {
    const key = 'testKey';

    const { unmount } = renderHook(() => useSyncToUrl(key, jest.fn()));

    act(() => {
      unmount();
    });

    expect(window.history.replaceState).toHaveBeenCalledWith(
      { path: expect.any(String) },
      '',
      expect.any(String)
    );
  });

  it('should clear the value from the query string when history back or forward is pressed', () => {
    const key = 'testKey';
    const restore = jest.fn();

    renderHook(() => useSyncToUrl(key, restore, true));

    act(() => {
      window.dispatchEvent(new Event('popstate'));
    });

    expect(window.history.replaceState).toHaveBeenCalledTimes(1);
    expect(window.history.replaceState).toHaveBeenCalledWith(
      { path: expect.any(String) },
      '',
      '/?'
    );
  });
});
