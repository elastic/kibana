/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react-hooks';
import { useExpandableFlyoutContext } from '../context';
import { useFlyoutType } from './use_flyout_type';
import { localStorageMock } from '../../__mocks__';

jest.mock('../context');

describe('useFlyoutType', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock(),
    });
  });

  it('should return the value in localStorage if set', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    localStorage.setItem('expandableFlyout.pushVsOverlayMode.flyout', 'push');

    const hookResult = renderHook(() => useFlyoutType());

    expect(hookResult.result.current.flyoutType).toEqual('push');
  });

  it('should return overlay if nothing is set in localStorage', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    const hookResult = renderHook(() => useFlyoutType());

    expect(hookResult.result.current.flyoutType).toEqual('overlay');
  });

  it('should set value in localStorage', () => {
    (useExpandableFlyoutContext as jest.Mock).mockReturnValue({ urlKey: 'flyout' });

    const hookResult = renderHook(() => useFlyoutType());

    hookResult.result.current.flyoutTypeChange('push');
    expect(localStorage.getItem('expandableFlyout.pushVsOverlayMode.flyout')).toEqual('push');
  });
});
