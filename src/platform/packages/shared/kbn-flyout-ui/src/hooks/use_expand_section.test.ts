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
import type { UseExpandSectionParams } from './use_expand_section';
import { useExpandSection } from './use_expand_section';
import * as localStorage from '../utils/local_storage';

jest.mock('../utils/local_storage', () => ({
  getExpandedSectionFromLocalStorage: jest.fn().mockReturnValue({}),
}));

const mockGetExpandedSectionFromLocalStorage =
  localStorage.getExpandedSectionFromLocalStorage as jest.Mock;

describe('useExpandSection', () => {
  let hookResult: RenderHookResult<boolean, UseExpandSectionParams>;

  const STORAGE_KEY = 'test-storage-key';

  it('should return default value if nothing in localStorage', () => {
    mockGetExpandedSectionFromLocalStorage.mockReturnValue({});

    const initialProps: UseExpandSectionParams = {
      storageKey: STORAGE_KEY,
      title: 'test',
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(mockGetExpandedSectionFromLocalStorage).toHaveBeenCalledWith(STORAGE_KEY.toLowerCase());
    expect(hookResult.result.current).toBe(true);
  });

  it(`should return default value if localStorage doesn't have the correct key`, () => {
    mockGetExpandedSectionFromLocalStorage.mockReturnValue({ other: false });

    const initialProps: UseExpandSectionParams = {
      storageKey: STORAGE_KEY,
      title: 'test',
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(mockGetExpandedSectionFromLocalStorage).toHaveBeenCalledWith(STORAGE_KEY.toLowerCase());
    expect(hookResult.result.current).toBe(true);
  });

  it('should return value from local storage', () => {
    mockGetExpandedSectionFromLocalStorage.mockReturnValue({ test: false });

    const initialProps: UseExpandSectionParams = {
      storageKey: STORAGE_KEY,
      title: 'test',
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(mockGetExpandedSectionFromLocalStorage).toHaveBeenCalledWith(STORAGE_KEY.toLowerCase());
    expect(hookResult.result.current).toBe(false);
  });

  it('should check against lowercase values', () => {
    mockGetExpandedSectionFromLocalStorage.mockReturnValue({ test: false });

    const initialProps: UseExpandSectionParams = {
      storageKey: STORAGE_KEY,
      title: 'Test', // should be normalized to 'test'
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(mockGetExpandedSectionFromLocalStorage).toHaveBeenCalledWith(STORAGE_KEY.toLowerCase());
    expect(hookResult.result.current).toBe(false);
  });
});
