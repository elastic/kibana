/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useUrlState } from '.';

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
      hash: '',
    };
    window.history = {
      ...originalHistory,
      replaceState: jest.fn(),
      pushState: jest.fn(),
    };

    jest.useFakeTimers();
  });

  afterEach(() => {
    window.location = originalLocation;
    window.history = originalHistory;
    jest.useRealTimers();
  });

  it('should update the URL when the state changes', () => {
    window.location.hash = '#should_be_there';

    const { result } = renderHook(() => useUrlState('namespace', 'test'));

    act(() => {
      result.current[1]('foo');
      jest.runAllTimers();
    });

    expect(window.history.pushState).toHaveBeenCalledWith(
      {},
      '',
      '#should_be_there?namespace=(test:foo)'
    );
  });

  it('should remove the key from the namespace after undefined is passed (state clear mechanism)', () => {
    window.location.hash = '#should_be_there';

    const { result } = renderHook(() => useUrlState('namespace', 'test'));

    act(() => {
      result.current[1](undefined);
      jest.runAllTimers();
    });

    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '#should_be_there?namespace=()');
  });

  it('should restore the value from the query string on mount', () => {
    window.location.search = `?namespace=(test:foo)`;

    const {
      result: { current: state },
    } = renderHook(() => useUrlState('namespace', 'test'));

    expect(state[0]).toEqual('foo');
  });

  it('should return updated state on browser navigation', () => {
    window.location.search = '?namespace=(test:foo)';

    const { result } = renderHook(() => useUrlState('namespace', 'test'));

    expect(result.current[0]).toEqual('foo');

    act(() => {
      window.location.search = '?namespace=(test:bar)';
      window.dispatchEvent(new CustomEvent('popstate'));
    });

    expect(result.current[0]).toEqual('bar');
  });
});
