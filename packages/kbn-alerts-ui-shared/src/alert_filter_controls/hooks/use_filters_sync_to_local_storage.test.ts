/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ControlGroupInput } from '@kbn/controls-plugin/common';
import { renderHook } from '@testing-library/react-hooks';
import { useControlGroupSyncToLocalStorage } from './use_control_group_sync_to_local_storage';

const TEST_STORAGE_KEY = 'test_key';
const DEFAULT_STORED_VALUE = {
  val: 'default_local_storage_value',
} as unknown as ControlGroupInput;

const ANOTHER_SAMPLE_VALUE = {
  val: 'another_local_storage_value',
} as unknown as ControlGroupInput;

let mockLocalStorage: Record<string, unknown> = {};
describe('Filters Sync to Local Storage', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn((key) => {
          return key in mockLocalStorage ? mockLocalStorage[key] : undefined;
        }),
        setItem: jest.fn((key, val) => (mockLocalStorage[key] = val)),
      },
      writable: true,
    });
  });
  afterEach(() => {
    mockLocalStorage = {};
  });
  it('should not be undefined if localStorage has initial value', () => {
    global.localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(DEFAULT_STORED_VALUE));
    const { result, waitForNextUpdate } = renderHook(() =>
      useControlGroupSyncToLocalStorage({
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );
    waitForNextUpdate();
    expect(result.current.controlGroupInput).toMatchObject(DEFAULT_STORED_VALUE);
  });
  it('should be undefined if localstorage as NO initial value', () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useControlGroupSyncToLocalStorage({
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );
    waitForNextUpdate();
    expect(result.current.controlGroupInput).toBeUndefined();
    expect(result.current.setControlGroupInput).toBeTruthy();
  });
  it('should be update values to local storage when sync is ON', () => {
    const { result, waitFor } = renderHook(() =>
      useControlGroupSyncToLocalStorage({
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );
    waitFor(() => {
      expect(result.current.controlGroupInput).toBeUndefined();
      expect(result.current.setControlGroupInput).toBeTruthy();
    });
    result.current.setControlGroupInput(DEFAULT_STORED_VALUE);
    waitFor(() => {
      expect(result.current.controlGroupInput).toMatchObject(DEFAULT_STORED_VALUE);
      expect(global.localStorage.getItem(TEST_STORAGE_KEY)).toBe(
        JSON.stringify(DEFAULT_STORED_VALUE)
      );
    });
  });
  it('should not update values to local storage when sync is OFF', () => {
    const { waitFor, result, rerender } = renderHook(() =>
      useControlGroupSyncToLocalStorage({
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );

    // Sync is ON
    waitFor(() => {
      expect(result.current.controlGroupInput).toBeUndefined();
      expect(result.current.setControlGroupInput).toBeTruthy();
    });

    result.current.setControlGroupInput(DEFAULT_STORED_VALUE);
    waitFor(() => {
      expect(result.current.controlGroupInput).toMatchObject(DEFAULT_STORED_VALUE);
    });

    // Sync is OFF
    rerender({ storageKey: TEST_STORAGE_KEY, shouldSync: false });
    result.current.setControlGroupInput(ANOTHER_SAMPLE_VALUE);
    waitFor(() => {
      expect(result.current.controlGroupInput).toMatchObject(ANOTHER_SAMPLE_VALUE);
      // old value
      expect(global.localStorage.getItem(TEST_STORAGE_KEY)).toBe(
        JSON.stringify(DEFAULT_STORED_VALUE)
      );
    });
  });
});
