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
}));

const { useEuiOverflowScroll } = jest.requireMock('@elastic/eui');

describe('useScroll', () => {
  beforeEach(() => {
    useEuiOverflowScroll.mockReturnValue('overflow: auto;');
  });

  afterEach(() => {
    useEuiOverflowScroll.mockReset();
  });

  it('provides vertical overflow styles by default', () => {
    const { result } = renderHook(() => useScroll());

    expect(typeof result.current).toBe('object');
    expect(useEuiOverflowScroll).toHaveBeenCalledWith('y', false);
  });

  it('passes the mask flag through to the overflow helper', () => {
    const { result } = renderHook(() => useScroll(true));

    expect(typeof result.current).toBe('object');
    expect(useEuiOverflowScroll).toHaveBeenCalledWith('y', true);
  });
});
