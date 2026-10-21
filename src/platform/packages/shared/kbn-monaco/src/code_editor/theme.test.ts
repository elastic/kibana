/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { createTheme } from './theme';

const createMockTheme = (colorMode: UseEuiTheme['colorMode']): UseEuiTheme => ({
  colorMode,
  highContrastMode: false,
  modifications: {},
  euiTheme: {
    colors: {
      vis: {},
    },
  } as UseEuiTheme['euiTheme'],
});

describe('WHEN creating a code editor theme', () => {
  it.each([
    { colorMode: 'DARK' as const, expectedBase: 'vs-dark' as const },
    { colorMode: 'LIGHT' as const, expectedBase: 'vs' as const },
  ])('SHOULD use $expectedBase as the base in $colorMode mode', ({ colorMode, expectedBase }) => {
    expect(createTheme(createMockTheme(colorMode)).base).toBe(expectedBase);
  });
});
