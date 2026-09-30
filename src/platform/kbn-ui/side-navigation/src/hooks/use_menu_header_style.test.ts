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
  size: { base: '16px', s: '8px', xs: '4px', xxs: '2px' },
  levels: { content: 0 },
  colors: {},
};

describe('useMenuHeaderStyle', () => {
  beforeEach(() => {
    useEuiTheme.mockReturnValue({ euiTheme: baseTheme, colorMode: 'LIGHT' });
  });

  afterEach(() => {
    useEuiTheme.mockReset();
  });

  it('returns styles in light and dark mode', () => {
    expect(typeof renderHook(() => useMenuHeaderStyle()).result.current).toBe('object');

    useEuiTheme.mockReturnValue({ euiTheme: baseTheme, colorMode: 'DARK' });
    expect(typeof renderHook(() => useMenuHeaderStyle()).result.current).toBe('object');
  });

  it('uses App Header standard inset and baseline alignment', () => {
    const { result } = renderHook(() => useMenuHeaderStyle('standard'));
    const { styles } = result.current;

    expect(styles).toContain('padding: 16px');
    expect(styles).toContain('min-height: 64px');
    expect(styles).toContain('line-height: 2.25em');
  });

  it('uses App Header compact inset without the standard baseline tweak', () => {
    const { result } = renderHook(() => useMenuHeaderStyle('compact'));
    const { styles } = result.current;

    expect(styles).toContain('padding: 8px');
    expect(styles).toContain('min-height: 48px');
    expect(styles).not.toContain('line-height: 2.25em');
  });
});
