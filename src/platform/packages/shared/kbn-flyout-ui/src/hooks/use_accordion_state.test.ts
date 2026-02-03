/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToggleReducerAction, UseAccordionStateValue } from './use_accordion_state';
import { toggleReducer, useAccordionState } from './use_accordion_state';
import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { storage: {} } }),
}));

const mockSet = jest.fn();

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
  });

  it('should return correct state and pass values to localStorage', () => {
    const mockStorage = {
      get: jest.fn().mockReturnValue({}),
      set: mockSet,
    };

    const mockLocalStorageKey = 'test-storage-key';
    const mockTitle = 'AISummary';
    const mockAction = {
      storage: mockStorage,
      localStorageKey: mockLocalStorageKey,
      title: mockTitle,
    } as unknown as ToggleReducerAction;

    const mockState = 'closed';

    const result = toggleReducer(mockState, mockAction);

    expect(result).toBe('open');
    expect(mockSet).toHaveBeenCalledWith(mockLocalStorageKey, {
      [mockTitle]: true,
    });
  });

  it(`should merge with existing localStorage value`, () => {
    const mockStorage = {
      get: jest.fn().mockReturnValue({ existingSection: false }),
      set: mockSet,
    };

    const mockLocalStorageKey = 'test-storage-key';
    const mockTitle = 'AISummary';
    const mockAction = {
      storage: mockStorage,
      localStorageKey: mockLocalStorageKey,
      title: mockTitle,
    } as unknown as ToggleReducerAction;

    const mockState = 'closed';

    toggleReducer(mockState, mockAction);

    expect(mockSet).toHaveBeenCalledWith(mockLocalStorageKey, {
      existingSection: false,
      [mockTitle]: true,
    });
  });

  it(`should not pass values to localStorage if localStorageKey isn't provided`, () => {
    const mockStorage = {
      get: jest.fn(),
      set: mockSet,
    };

    const mockAction = {
      storage: mockStorage,
      title: 'AISummary',
    } as unknown as ToggleReducerAction;

    const mockState = 'open';

    const result = toggleReducer(mockState, mockAction);

    expect(result).toBe('closed');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it(`should not pass values to localStorage if title isn't provided`, () => {
    const mockStorage = {
      get: jest.fn(),
      set: mockSet,
    };

    const mockAction = {
      storage: mockStorage,
      localStorageKey: 'test-storage-key',
    } as unknown as ToggleReducerAction;

    const mockState = 'open';

    const result = toggleReducer(mockState, mockAction);

    expect(result).toBe('closed');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it(`should not pass values to localStorage if storage isn't provided`, () => {
    const mockAction = {
      localStorageKey: 'test-storage-key',
      title: 'AISummary',
    } as unknown as ToggleReducerAction;

    const mockState = 'open';

    const result = toggleReducer(mockState, mockAction);

    expect(result).toBe('closed');
    expect(mockSet).not.toHaveBeenCalled();
  });
});
