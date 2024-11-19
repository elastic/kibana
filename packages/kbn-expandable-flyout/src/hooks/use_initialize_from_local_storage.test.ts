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
import {
  USER_COLLAPSED_WIDTH_LOCAL_STORAGE,
  EXPANDABLE_FLYOUT_LOCAL_STORAGE,
  USER_EXPANDED_WIDTH_LOCAL_STORAGE,
  USER_SECTION_WIDTHS_LOCAL_STORAGE,
  PUSH_VS_OVERLAY_LOCAL_STORAGE,
} from '../constants';
import { useDispatch } from '../store/redux';
import {
  changeUserCollapsedWidthAction,
  changeUserExpandedWidthAction,
  changeUserSectionWidthsAction,
  changePushVsOverlayAction,
} from '../store/actions';

jest.mock('../store/redux');

describe('useInitializeFromLocalStorage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock(),
    });
  });

  // if this test fails, it's very likely because the data format of the values saved in local storage
  // has changed and we might need to run a migration
  it('should retrieve values from local storage', () => {
    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    localStorage.setItem(
      EXPANDABLE_FLYOUT_LOCAL_STORAGE,
      JSON.stringify({
        [PUSH_VS_OVERLAY_LOCAL_STORAGE]: 'push',
        [USER_COLLAPSED_WIDTH_LOCAL_STORAGE]: 250,
        [USER_EXPANDED_WIDTH_LOCAL_STORAGE]: 500,
        [USER_SECTION_WIDTHS_LOCAL_STORAGE]: { left: 50, right: 50 },
      })
    );

    renderHook(() => useInitializeFromLocalStorage());

    expect(mockUseDispatch).toHaveBeenCalledWith(
      changePushVsOverlayAction({
        type: 'push',
        savedToLocalStorage: false,
      })
    );
    expect(mockUseDispatch).toHaveBeenCalledWith(
      changeUserCollapsedWidthAction({
        width: 250,
        savedToLocalStorage: false,
      })
    );
    expect(mockUseDispatch).toHaveBeenCalledWith(
      changeUserExpandedWidthAction({
        width: 500,
        savedToLocalStorage: false,
      })
    );
    expect(mockUseDispatch).toHaveBeenCalledWith(
      changeUserSectionWidthsAction({
        right: 50,
        left: 50,
        savedToLocalStorage: false,
      })
    );
  });

  it('should not dispatch action if expandable flyout key is not present in local storage', () => {
    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    localStorage.setItem(
      'wrong_top_level_key',
      JSON.stringify({
        [PUSH_VS_OVERLAY_LOCAL_STORAGE]: 'push',
        [USER_COLLAPSED_WIDTH_LOCAL_STORAGE]: 250,
        [USER_EXPANDED_WIDTH_LOCAL_STORAGE]: 500,
        [USER_SECTION_WIDTHS_LOCAL_STORAGE]: { left: 50, right: 50 },
      })
    );

    renderHook(() => useInitializeFromLocalStorage());

    expect(mockUseDispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch action if expandable flyout key is present in local storage but no has no properties', () => {
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
});
