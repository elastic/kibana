/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';

import { useScroll } from './use_scroll';

jest.mock('@elastic/eui', () => ({
  useEuiOverflowScroll: jest.fn(),
  useEuiYScrollWithShadows: jest.fn(),
}));

const { useEuiOverflowScroll, useEuiYScrollWithShadows } = jest.requireMock('@elastic/eui');

describe('useScroll', () => {
  beforeEach(() => {
    useEuiOverflowScroll.mockReturnValue('overflow: auto;');
    useEuiYScrollWithShadows.mockReturnValue('overflow: auto; mask: animated;');
  });

  afterEach(() => {
    useEuiOverflowScroll.mockReset();
    useEuiYScrollWithShadows.mockReset();
  });

  it('provides vertical overflow styles by default', () => {
    const { result } = renderHook(() => useScroll());

    expect(typeof result.current).toBe('object');
    expect(useEuiOverflowScroll).toHaveBeenCalledWith('y', false);
    expect(useEuiYScrollWithShadows).toHaveBeenCalledWith({ hasAnimatedOverflowShadow: true });
  });

  it('uses animated overflow shadows when masking', () => {
    const { result } = renderHook(() => useScroll(true));

    expect(typeof result.current).toBe('object');
    expect(useEuiYScrollWithShadows).toHaveBeenCalledWith({ hasAnimatedOverflowShadow: true });
  });
});
