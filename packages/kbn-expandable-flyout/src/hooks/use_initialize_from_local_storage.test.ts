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
import { useExpandableFlyoutContext } from '../context';
import { useDispatch } from '../store/redux';
import { changePushVsOverlayAction } from '../store/actions';

jest.mock('../context');
jest.mock('../store/redux');

const urlKey = 'flyout';

describe('useInitializeFromLocalStorage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock(),
    });
  });

  it('should retrieve push/overlay value from local storage', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey });
    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    localStorage.setItem(
      `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${PUSH_VS_OVERLAY_LOCAL_STORAGE}.${urlKey}`,
      'push'
    );

    renderHook(() => useInitializeFromLocalStorage());

    expect(mockUseDispatch).toHaveBeenCalledWith(
      changePushVsOverlayAction({
        type: 'push',
        id: urlKey,
        savedToLocalStorage: false,
      })
    );
  });
});
