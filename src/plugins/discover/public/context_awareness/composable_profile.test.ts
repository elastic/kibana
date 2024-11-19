/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataGridDensity } from '@kbn/unified-data-table';
import { AppliedProfile, getMergedAccessor } from './composable_profile';
import { Profile } from './types';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';

const getCellRenderersParams = {
  actions: { addFilter: jest.fn() },
  dataView: dataViewWithTimefieldMock,
  density: DataGridDensity.COMPACT,
  rowHeight: 0,
};

describe('getMergedAccessor', () => {
  it('should return the base implementation if no profiles are provided', () => {
    const baseImpl: Profile['getCellRenderers'] = jest.fn(() => ({ base: jest.fn() }));
    const mergedAccessor = getMergedAccessor([], 'getCellRenderers', baseImpl);
    const result = mergedAccessor(getCellRenderersParams);
    expect(baseImpl).toHaveBeenCalled();
    expect(result).toEqual({ base: expect.any(Function) });
  });

  it('should merge the accessors in the correct order', () => {
    const baseImpl: Profile['getCellRenderers'] = jest.fn(() => ({ base: jest.fn() }));
    const profile1: AppliedProfile = {
      getCellRenderers: jest.fn((prev) => (params) => ({
        ...prev(params),
        profile1: jest.fn(),
      })),
    };
    const profile2: AppliedProfile = {
      getCellRenderers: jest.fn((prev) => (params) => ({
        ...prev(params),
        profile2: jest.fn(),
      })),
    };
    const mergedAccessor = getMergedAccessor([profile1, profile2], 'getCellRenderers', baseImpl);
    const result = mergedAccessor(getCellRenderersParams);
    expect(baseImpl).toHaveBeenCalled();
    expect(profile1.getCellRenderers).toHaveBeenCalled();
    expect(profile2.getCellRenderers).toHaveBeenCalled();
    expect(result).toEqual({
      base: expect.any(Function),
      profile1: expect.any(Function),
      profile2: expect.any(Function),
    });
    expect(Object.keys(result)).toEqual(['base', 'profile1', 'profile2']);
  });

  it('should allow overwriting previous accessors', () => {
    const baseImpl: Profile['getCellRenderers'] = jest.fn(() => ({ base: jest.fn() }));
    const profile1: AppliedProfile = {
      getCellRenderers: jest.fn(() => () => ({ profile1: jest.fn() })),
    };
    const profile2: AppliedProfile = {
      getCellRenderers: jest.fn((prev) => (params) => ({
        ...prev(params),
        profile2: jest.fn(),
      })),
    };
    const mergedAccessor = getMergedAccessor([profile1, profile2], 'getCellRenderers', baseImpl);
    const result = mergedAccessor(getCellRenderersParams);
    expect(baseImpl).not.toHaveBeenCalled();
    expect(profile1.getCellRenderers).toHaveBeenCalled();
    expect(profile2.getCellRenderers).toHaveBeenCalled();
    expect(result).toEqual({ profile1: expect.any(Function), profile2: expect.any(Function) });
    expect(Object.keys(result)).toEqual(['profile1', 'profile2']);
  });
});
