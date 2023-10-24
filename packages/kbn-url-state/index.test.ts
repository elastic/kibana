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
    const { result } = renderHook(() => useUrlState('namespace', 'test'));

    act(() => {
      result.current[1]('foo');
      jest.runAllTimers();
    });

    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '?namespace=(test:foo)');
  });
});
