/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useActiveSolutionNavId } from '@kbn/core-chrome-browser-hooks';
import { useActiveSolution } from './use_active_solution';

jest.mock('@kbn/core-chrome-browser-hooks', () => ({
  useActiveSolutionNavId: jest.fn(),
}));

describe('useActiveSolution', () => {
  it('returns undefined in classic-nav mode (no active solution)', () => {
    jest.mocked(useActiveSolutionNavId).mockReturnValue(null);

    const { result } = renderHook(() => useActiveSolution());

    expect(result.current).toBeUndefined();
  });

  it('passes through the security solution id as-is', () => {
    jest.mocked(useActiveSolutionNavId).mockReturnValue('security');

    const { result } = renderHook(() => useActiveSolution());

    expect(result.current).toBe('security');
  });

  it('maps the observability project id ("oblt") to the catalog vocabulary', () => {
    jest.mocked(useActiveSolutionNavId).mockReturnValue('oblt');

    const { result } = renderHook(() => useActiveSolution());

    expect(result.current).toBe('observability');
  });

  it('maps the search project id ("es") to the catalog vocabulary', () => {
    jest.mocked(useActiveSolutionNavId).mockReturnValue('es');

    const { result } = renderHook(() => useActiveSolution());

    expect(result.current).toBe('search');
  });
});
