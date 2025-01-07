/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { AppliedProfile, getMergedAccessor } from '../composable_profile';
import { useProfileAccessor } from './use_profile_accessor';
import { getDataTableRecords } from '../../__fixtures__/real_hits';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { useProfiles } from './use_profiles';
import { DataGridDensity } from '@kbn/unified-data-table';

let mockProfiles: AppliedProfile[] = [];

jest.mock('./use_profiles', () => ({
  useProfiles: jest.fn(() => mockProfiles),
}));

jest.mock('../composable_profile', () => {
  const originalModule = jest.requireActual('../composable_profile');
  return {
    ...originalModule,
    getMergedAccessor: jest.fn(originalModule.getMergedAccessor),
  };
});

const record = getDataTableRecords(dataViewWithTimefieldMock)[0];

const getCellRenderersParams = {
  actions: { addFilter: jest.fn() },
  dataView: dataViewWithTimefieldMock,
  density: DataGridDensity.COMPACT,
  rowHeight: 0,
};

describe('useProfileAccessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfiles = [
      { getCellRenderers: (prev) => (params) => ({ ...prev(params), profile1: jest.fn() }) },
      { getCellRenderers: (prev) => (params) => ({ ...prev(params), profile2: jest.fn() }) },
    ];
  });

  it('should return a function that merges accessors', () => {
    const { result } = renderHook(() => useProfileAccessor('getCellRenderers', { record }));
    expect(useProfiles).toHaveBeenCalledTimes(1);
    expect(useProfiles).toHaveBeenCalledWith({ record });
    const base = () => ({ base: jest.fn() });
    const accessor = result.current(base);
    expect(getMergedAccessor).toHaveBeenCalledTimes(1);
    expect(getMergedAccessor).toHaveBeenCalledWith(mockProfiles, 'getCellRenderers', base);
    const renderers = accessor(getCellRenderersParams);
    expect(renderers).toEqual({
      base: expect.any(Function),
      profile1: expect.any(Function),
      profile2: expect.any(Function),
    });
    expect(Object.keys(renderers)).toEqual(['base', 'profile1', 'profile2']);
  });

  it('should recalculate the accessor when the key changes', () => {
    const { rerender, result } = renderHook(({ key }) => useProfileAccessor(key, { record }), {
      initialProps: { key: 'getCellRenderers' as const },
    });
    const prevResult = result.current;
    rerender({ key: 'getCellRenderers' });
    expect(result.current).toBe(prevResult);
    rerender({ key: 'otherKey' as unknown as 'getCellRenderers' });
    expect(result.current).not.toBe(prevResult);
  });

  it('should recalculate the accessor when the profiles change', () => {
    const { rerender, result } = renderHook(() =>
      useProfileAccessor('getCellRenderers', { record })
    );
    const prevResult = result.current;
    mockProfiles = [
      { getCellRenderers: (prev) => (params) => ({ ...prev(params), profile3: jest.fn() }) },
    ];
    rerender();
    expect(result.current).not.toBe(prevResult);
  });
});
