/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useUrlTracker } from './use_url_tracker';
import { StubBrowserStorage } from '@kbn/test/jest';
import { createMemoryHistory } from 'history';

describe('useUrlTracker', () => {
  const key = 'key';
  let storage = new StubBrowserStorage();
  let history = createMemoryHistory();
  beforeEach(() => {
    storage = new StubBrowserStorage();
    history = createMemoryHistory();
  });

  it('should track history changes and save them to storage', () => {
    expect(storage.getItem(key)).toBeNull();
    const { unmount } = renderHook(() => {
      useUrlTracker(key, history, () => false, storage);
    });
    expect(storage.getItem(key)).toBe('/');
    history.push('/change');
    expect(storage.getItem(key)).toBe('/change');
    unmount();
    history.push('/other-change');
    expect(storage.getItem(key)).toBe('/change');
  });

  it('by default should restore initial url', () => {
    storage.setItem(key, '/change');
    renderHook(() => {
      useUrlTracker(key, history, undefined, storage);
    });
    expect(history.location.pathname).toBe('/change');
  });

  it('should restore initial url if shouldRestoreUrl cb returns true', () => {
    storage.setItem(key, '/change');
    renderHook(() => {
      useUrlTracker(key, history, () => true, storage);
    });
    expect(history.location.pathname).toBe('/change');
  });

  it('should not restore initial url if shouldRestoreUrl cb returns false', () => {
    storage.setItem(key, '/change');
    renderHook(() => {
      useUrlTracker(key, history, () => false, storage);
    });
    expect(history.location.pathname).toBe('/');
  });
});
