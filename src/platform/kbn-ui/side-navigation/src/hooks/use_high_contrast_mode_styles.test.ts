/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';

import { useHighContrastModeStyles } from './use_high_contrast_mode_styles';

jest.mock('@elastic/eui', () => ({
  useEuiTheme: jest.fn(),
}));

const { useEuiTheme } = jest.requireMock('@elastic/eui');

const themeMock = {
  euiTheme: {
    border: { width: { thin: '1px' }, color: '#000' },
    size: { base: '16px' },
  },
  highContrastMode: undefined as 'preferred' | 'forced' | undefined,
};

describe('useHighContrastModeStyles', () => {
  afterEach(() => {
    useEuiTheme.mockReset();
  });

  it('returns undefined when high contrast mode is not enabled', () => {
    useEuiTheme.mockReturnValue({ ...themeMock, highContrastMode: undefined });

    const { result } = renderHook(() => useHighContrastModeStyles());

    expect(result.current).toBeUndefined();
  });

  it('returns preferred high contrast styles when enabled', () => {
    useEuiTheme.mockReturnValue({ ...themeMock, highContrastMode: 'preferred' });

    const { result } = renderHook(() => useHighContrastModeStyles('.foo'));

    expect(typeof result.current).toBe('object');
  });

  it('returns forced high contrast styles when enabled', () => {
    useEuiTheme.mockReturnValue({ ...themeMock, highContrastMode: 'forced' });

    const { result } = renderHook(() => useHighContrastModeStyles('.foo'));

    expect(typeof result.current).toBe('object');
  });
});
