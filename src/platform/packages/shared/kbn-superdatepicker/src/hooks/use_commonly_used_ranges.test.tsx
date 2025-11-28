/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useCommonlyUsedRanges } from './use_commonly_used_ranges';
import { TIMEPICKER_QUICK_RANGES } from '../constants';
import type { CoreStart } from '@kbn/core/public';

const mockQuickRanges = [
  { from: 'now-15m', to: 'now', display: 'Last 15 minutes' },
  { from: 'now-30m', to: 'now', display: 'Last 30 minutes' },
  { from: 'now-1h', to: 'now', display: 'Last 1 hour' },
];

const mockUiSettings = {
  get: jest.fn((key: string) => {
    if (key === TIMEPICKER_QUICK_RANGES) {
      return mockQuickRanges;
    }
    return undefined;
  }),
} as unknown as CoreStart['uiSettings'];

describe('useCommonlyUsedRanges', () => {
  it('should return undefined when uiSettings is not provided', () => {
    const { result } = renderHook(() => useCommonlyUsedRanges({ uiSettings: undefined }));

    expect(result.current).toBeUndefined();
  });

  it('should return commonly used ranges with correct format', () => {
    const { result } = renderHook(() => useCommonlyUsedRanges({ uiSettings: mockUiSettings }));

    expect(result.current).toEqual([
      { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
      { start: 'now-30m', end: 'now', label: 'Last 30 minutes' },
      { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
    ]);
  });
});
