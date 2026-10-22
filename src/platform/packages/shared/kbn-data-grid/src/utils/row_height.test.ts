/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { getLinesRowHeight } from './row_height';

describe('getLinesRowHeight', () => {
  const { result } = renderHook(() => useEuiTheme());
  const themeContext = result.current;
  const params = { fontSize: 'm', cellPadding: 'm', hasBorder: true } as const;

  it('grows by one line height per line', () => {
    const oneLine = getLinesRowHeight(themeContext, { ...params, lineCount: 1 });
    const twoLines = getLinesRowHeight(themeContext, { ...params, lineCount: 2 });
    const threeLines = getLinesRowHeight(themeContext, { ...params, lineCount: 3 });
    expect(threeLines - twoLines).toBe(twoLines - oneLine);
    expect(twoLines - oneLine).toBeGreaterThan(0);
  });

  it('adds the cell padding on both sides and the border', () => {
    const base = getLinesRowHeight(themeContext, { ...params, lineCount: 1, hasBorder: false });
    const withBorder = getLinesRowHeight(themeContext, { ...params, lineCount: 1 });
    const morePadding = getLinesRowHeight(themeContext, {
      ...params,
      lineCount: 1,
      hasBorder: false,
      cellPadding: 'l',
    });
    expect(withBorder).toBe(base + 1);
    expect(morePadding).toBeGreaterThan(base);
  });

  it('uses a custom line height in px, em or unitless', () => {
    const px = getLinesRowHeight(themeContext, { ...params, lineCount: 2, lineHeight: '30px' });
    const pxOneLine = getLinesRowHeight(themeContext, {
      ...params,
      lineCount: 1,
      lineHeight: '30px',
    });
    expect(px - pxOneLine).toBe(30);

    const em = getLinesRowHeight(themeContext, { ...params, lineCount: 1, lineHeight: '2em' });
    const unitless = getLinesRowHeight(themeContext, { ...params, lineCount: 1, lineHeight: '2' });
    expect(em).toBe(unitless);
  });
});
