/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlGroupRuntimeState } from '@kbn/controls-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import { useControlGroupSyncToLocalStorage } from './use_control_group_sync_to_local_storage';
import { Storage } from '@kbn/kibana-utils-plugin/public';

const TEST_STORAGE_KEY = 'test_key';
const DEFAULT_STORED_VALUE = {
  val: 'default_local_storage_value',
} as unknown as ControlGroupRuntimeState;

const ANOTHER_SAMPLE_VALUE = {
  val: 'another_local_storage_value',
} as unknown as ControlGroupRuntimeState;

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
        Storage,
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );
    waitForNextUpdate();
    expect(result.current.controlGroupState).toMatchObject(DEFAULT_STORED_VALUE);
  });
  it('should be undefined if localstorage as NO initial value', () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useControlGroupSyncToLocalStorage({
        Storage,
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );
    waitForNextUpdate();
    expect(result.current.controlGroupState).toBeUndefined();
    expect(result.current.setControlGroupState).toBeTruthy();
  });
  it('should be update values to local storage when sync is ON', () => {
    const { result, waitFor } = renderHook(() =>
      useControlGroupSyncToLocalStorage({
        Storage,
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );
    waitFor(() => {
      expect(result.current.controlGroupState).toBeUndefined();
      expect(result.current.setControlGroupState).toBeTruthy();
    });
    result.current.setControlGroupState(DEFAULT_STORED_VALUE);
    waitFor(() => {
      expect(result.current.controlGroupState).toMatchObject(DEFAULT_STORED_VALUE);
      expect(global.localStorage.getItem(TEST_STORAGE_KEY)).toBe(
        JSON.stringify(DEFAULT_STORED_VALUE)
      );
    });
  });
  it('should not update values to local storage when sync is OFF', () => {
    const { waitFor, result, rerender } = renderHook(() =>
      useControlGroupSyncToLocalStorage({
        Storage,
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );

    // Sync is ON
    waitFor(() => {
      expect(result.current.controlGroupState).toBeUndefined();
      expect(result.current.setControlGroupState).toBeTruthy();
    });

    result.current.setControlGroupState(DEFAULT_STORED_VALUE);
    waitFor(() => {
      expect(result.current.controlGroupState).toMatchObject(DEFAULT_STORED_VALUE);
    });

    // Sync is OFF
    rerender({ storageKey: TEST_STORAGE_KEY, shouldSync: false });
    result.current.setControlGroupState(ANOTHER_SAMPLE_VALUE);
    waitFor(() => {
      expect(result.current.controlGroupState).toMatchObject(ANOTHER_SAMPLE_VALUE);
      // old value
      expect(global.localStorage.getItem(TEST_STORAGE_KEY)).toBe(
        JSON.stringify(DEFAULT_STORED_VALUE)
      );
    });
  });
});
