/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlGroupRuntimeState } from '@kbn/controls-plugin/public';
import { waitFor, act, renderHook } from '@testing-library/react';
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

  it('should not be undefined if localStorage has initial value', async () => {
    global.localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(DEFAULT_STORED_VALUE));
    const { result } = renderHook(() =>
      useControlGroupSyncToLocalStorage({
        Storage,
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );
    await waitFor(() =>
      expect(result.current.controlGroupState).toMatchObject(DEFAULT_STORED_VALUE)
    );
  });

  it('should be undefined if localstorage as NO initial value', async () => {
    const { result } = renderHook(() =>
      useControlGroupSyncToLocalStorage({
        Storage,
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );
    await waitFor(() =>
      expect(result.current).toEqual(
        expect.objectContaining({
          controlGroupState: undefined,
          setControlGroupState: expect.any(Function),
        })
      )
    );
  });
  it('should be update values to local storage when sync is ON', async () => {
    const { result } = renderHook(() =>
      useControlGroupSyncToLocalStorage({
        Storage,
        storageKey: TEST_STORAGE_KEY,
        shouldSync: true,
      })
    );
    await waitFor(() => {
      expect(result.current.controlGroupState).toBeUndefined();
      expect(result.current.setControlGroupState).toBeTruthy();
    });
    act(() => {
      result.current.setControlGroupState(DEFAULT_STORED_VALUE);
    });
    await waitFor(() => {
      expect(result.current.controlGroupState).toMatchObject(DEFAULT_STORED_VALUE);
      expect(global.localStorage.getItem(TEST_STORAGE_KEY)).toBe(
        JSON.stringify(DEFAULT_STORED_VALUE)
      );
    });
  });
  it('should not update values to local storage when sync is OFF', async () => {
    const initialProps = {
      Storage,
      storageKey: TEST_STORAGE_KEY,
      shouldSync: true,
    };

    const { result, rerender } = renderHook(useControlGroupSyncToLocalStorage, {
      initialProps,
    });

    // Sync is ON
    await waitFor(() => {
      expect(result.current.controlGroupState).toBeUndefined();
      expect(result.current.setControlGroupState).toBeTruthy();
    });

    act(() => {
      result.current.setControlGroupState(DEFAULT_STORED_VALUE);
    });

    await waitFor(() => {
      expect(result.current.controlGroupState).toMatchObject(DEFAULT_STORED_VALUE);
    });

    // Sync is OFF
    rerender({ ...initialProps, shouldSync: false });

    act(() => {
      result.current.setControlGroupState(ANOTHER_SAMPLE_VALUE);
    });

    await waitFor(() => {
      expect(result.current.controlGroupState).toMatchObject(ANOTHER_SAMPLE_VALUE);
      // old value
      expect(global.localStorage.getItem(TEST_STORAGE_KEY)).toBe(
        JSON.stringify(DEFAULT_STORED_VALUE)
      );
    });
  });
});
