/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { ToggleReducerAction, UseAccordionStateValue } from './use_accordion_state';
import { toggleReducer, useAccordionState } from './use_accordion_state';
import {
  getExpandedSectionFromLocalStorage,
  setExpandedSectionToLocalStorage,
} from '../utils/local_storage';

jest.mock('../utils/local_storage', () => ({
  getExpandedSectionFromLocalStorage: jest.fn().mockReturnValue({}),
  setExpandedSectionToLocalStorage: jest.fn(),
}));

const mockSetSectionState = setExpandedSectionToLocalStorage as jest.Mock;

describe('useAccordionState', () => {
  let hookResult: RenderHookResult<UseAccordionStateValue, boolean>;

  it('should return initial value', () => {
    hookResult = renderHook((props: boolean) => useAccordionState(props), {
      initialProps: true,
    });

    expect(hookResult.result.current.renderContent).toBe(true);
    expect(hookResult.result.current.state).toBe('open');
  });
});

describe('toggleReducer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getExpandedSectionFromLocalStorage as jest.Mock).mockReturnValue({});
  });

  it('should return correct state and pass values to localStorage', () => {
    const mockLocalStorageKey = 'test-storage-key';
    const mockTitle = 'AISummary';
    const mockAction: ToggleReducerAction = {
      localStorageKey: mockLocalStorageKey,
      title: mockTitle,
    };

    const mockState = 'closed';

    const result = toggleReducer(mockState, mockAction);

    expect(result).toBe('open');
    expect(mockSetSectionState).toHaveBeenCalledWith('test-storage-key', {
      [mockTitle]: true,
    });
  });

  it(`should merge with existing localStorage value`, () => {
    (getExpandedSectionFromLocalStorage as jest.Mock).mockReturnValue({
      existingSection: false,
    });

    const mockLocalStorageKey = 'test-storage-key';
    const mockTitle = 'AISummary';
    const mockAction: ToggleReducerAction = {
      localStorageKey: mockLocalStorageKey,
      title: mockTitle,
    };

    const mockState = 'closed';

    toggleReducer(mockState, mockAction);

    expect(mockSetSectionState).toHaveBeenCalledWith('test-storage-key', {
      existingSection: false,
      [mockTitle]: true,
    });
  });

  it(`should not pass values to localStorage if localStorageKey isn't provided`, () => {
    const mockAction: ToggleReducerAction = {
      localStorageKey: undefined,
      title: 'AISummary',
    };

    const mockState = 'open';

    const result = toggleReducer(mockState, mockAction);

    expect(result).toBe('closed');
    expect(mockSetSectionState).not.toHaveBeenCalled();
  });

  it(`should not pass values to localStorage if title isn't provided`, () => {
    const mockAction: ToggleReducerAction = {
      localStorageKey: 'test-storage-key',
      title: undefined,
    };

    const mockState = 'open';

    const result = toggleReducer(mockState, mockAction);

    expect(result).toBe('closed');
    expect(mockSetSectionState).not.toHaveBeenCalled();
  });
});
