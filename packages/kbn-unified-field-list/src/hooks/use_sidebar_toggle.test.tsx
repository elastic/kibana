/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useSidebarToggle } from './use_sidebar_toggle';
import * as localStorageModule from 'react-use/lib/useLocalStorage';

jest.spyOn(localStorageModule, 'default');

describe('UnifiedFieldList useSidebarToggle', () => {
  const stateService = {
    creationOptions: {
      originatingApp: 'test',
      localStorageKeyPrefix: 'this',
    },
  };

  beforeEach(() => {
    (localStorageModule.default as jest.Mock).mockClear();
  });

  it('should toggle correctly', async () => {
    const storeMock = jest.fn();
    (localStorageModule.default as jest.Mock).mockImplementation(() => {
      return [false, storeMock];
    });

    const { result } = renderHook(useSidebarToggle, {
      initialProps: {
        stateService,
      },
    });

    expect(result.current.isSidebarCollapsed).toBe(false);

    act(() => {
      result.current.onToggleSidebar(true);
    });

    expect(result.current.isSidebarCollapsed).toBe(true);
    expect(storeMock).toHaveBeenCalledWith(true);

    act(() => {
      result.current.onToggleSidebar(false);
    });

    expect(result.current.isSidebarCollapsed).toBe(false);
    expect(storeMock).toHaveBeenLastCalledWith(false);
  });

  it('should restore collapsed state and expand from it', async () => {
    const storeMock = jest.fn();
    (localStorageModule.default as jest.Mock).mockImplementation(() => {
      return [true, storeMock];
    });

    const { result } = renderHook(useSidebarToggle, {
      initialProps: {
        stateService,
      },
    });

    expect(result.current.isSidebarCollapsed).toBe(true);

    act(() => {
      result.current.onToggleSidebar(false);
    });

    expect(result.current.isSidebarCollapsed).toBe(false);
    expect(storeMock).toHaveBeenCalledWith(false);
  });

  it('should not persist if local storage key is not defined', async () => {
    const storeMock = jest.fn();
    (localStorageModule.default as jest.Mock).mockImplementation(() => {
      return [false, storeMock];
    });

    const { result } = renderHook(useSidebarToggle, {
      initialProps: {
        stateService: {
          creationOptions: {
            originatingApp: 'test',
            localStorageKeyPrefix: undefined,
          },
        },
      },
    });

    expect(result.current.isSidebarCollapsed).toBe(false);

    act(() => {
      result.current.onToggleSidebar(true);
    });

    expect(result.current.isSidebarCollapsed).toBe(true);
    expect(storeMock).not.toHaveBeenCalled();
  });
});
