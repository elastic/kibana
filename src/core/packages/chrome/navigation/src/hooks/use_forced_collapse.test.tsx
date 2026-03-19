/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useIsWithinBreakpoints } from '@elastic/eui';

import { useForcedCollapse } from './use_forced_collapse';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useIsWithinBreakpoints: jest.fn(),
  };
});

const mockUseIsWithinBreakpoints = useIsWithinBreakpoints as jest.MockedFunction<
  typeof useIsWithinBreakpoints
>;

describe('useForcedCollapse', () => {
  beforeEach(() => {
    mockUseIsWithinBreakpoints.mockReturnValue(false);
  });

  afterEach(() => {
    mockUseIsWithinBreakpoints.mockReset();
  });

  it('collapses on mobile EUI breakpoints', () => {
    mockUseIsWithinBreakpoints.mockReturnValue(true);

    const { result, rerender } = renderHook(() => useForcedCollapse());

    expect(result.current).toBe(true);

    mockUseIsWithinBreakpoints.mockReturnValue(false);
    rerender();

    expect(result.current).toBe(false);
  });
});
