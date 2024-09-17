/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react-hooks';
import { useInitializeFromLocalStorage } from './use_initialize_from_local_storage';
import { localStorageMock } from '../../__mocks__';
import { EXPANDABLE_FLYOUT_LOCAL_STORAGE, PUSH_VS_OVERLAY_LOCAL_STORAGE } from '../constants';
import { useDispatch } from '../store/redux';
import { changePushVsOverlayAction } from '../store/actions';

jest.mock('../store/redux');

describe('useInitializeFromLocalStorage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock(),
    });
  });

  // if this test fails, it's very likely because the data format of the values saved in local storage
  // has changed and we might need to run a migration
  it('should retrieve push/overlay value from local storage', () => {
    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    localStorage.setItem(
      EXPANDABLE_FLYOUT_LOCAL_STORAGE,
      JSON.stringify({
        [PUSH_VS_OVERLAY_LOCAL_STORAGE]: 'push',
      })
    );

    renderHook(() => useInitializeFromLocalStorage());

    expect(mockUseDispatch).toHaveBeenCalledWith(
      changePushVsOverlayAction({
        type: 'push',
        savedToLocalStorage: false,
      })
    );
  });

  it('should not dispatch action if expandable flyout key is not present in local storage', () => {
    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    localStorage.setItem(
      EXPANDABLE_FLYOUT_LOCAL_STORAGE,
      JSON.stringify({
        wrong_key: 'push',
      })
    );

    renderHook(() => useInitializeFromLocalStorage());

    expect(mockUseDispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch action if expandable flyout key is present in local storage but not push/overlay', () => {
    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    renderHook(() => useInitializeFromLocalStorage());

    expect(mockUseDispatch).not.toHaveBeenCalled();
  });
});
