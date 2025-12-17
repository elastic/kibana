/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';

import { useMenuHeaderStyle } from './use_menu_header_style';

jest.mock('@elastic/eui', () => ({
  useEuiTheme: jest.fn(),
}));

const { useEuiTheme } = jest.requireMock('@elastic/eui');

const baseTheme = {
  border: {
    width: { thin: '1px' },
  },
  size: { base: '16px', xs: '8px' },
  colors: {},
};

describe('useMenuHeaderStyle', () => {
  afterEach(() => {
    useEuiTheme.mockReset();
  });

  it('returns sticky header styles in light mode', () => {
    useEuiTheme.mockReturnValue({ euiTheme: baseTheme, colorMode: 'LIGHT' });

    const { result } = renderHook(() => useMenuHeaderStyle());

    expect(typeof result.current).toBe('object');
  });

  it('adjusts padding in dark mode', () => {
    useEuiTheme.mockReturnValue({ euiTheme: baseTheme, colorMode: 'DARK' });

    const { result } = renderHook(() => useMenuHeaderStyle());

    expect(typeof result.current).toBe('object');
  });
});
