/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useActiveSolution } from './use_active_solution';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = jest.mocked(useKibana);

function mockActiveSolutionNavId(solutionNavId: string | null) {
  mockUseKibana.mockReturnValue({
    services: {
      chrome: {
        getActiveSolutionNavId$: () => of(solutionNavId),
        getActiveSolutionNavId: () => solutionNavId,
      },
    },
  } as unknown as ReturnType<typeof useKibana>);
}

describe('useActiveSolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined in classic-nav mode (no active solution)', () => {
    mockActiveSolutionNavId(null);

    const { result } = renderHook(() => useActiveSolution());

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when chrome is not available in the Kibana context', () => {
    mockUseKibana.mockReturnValue({ services: {} } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useActiveSolution());

    expect(result.current).toBeUndefined();
  });

  it('passes through the security solution id as-is', () => {
    mockActiveSolutionNavId('security');

    const { result } = renderHook(() => useActiveSolution());

    expect(result.current).toBe('security');
  });

  it('maps the observability project id ("oblt") to the catalog vocabulary', () => {
    mockActiveSolutionNavId('oblt');

    const { result } = renderHook(() => useActiveSolution());

    expect(result.current).toBe('observability');
  });

  it('maps the search project id ("es") to the catalog vocabulary', () => {
    mockActiveSolutionNavId('es');

    const { result } = renderHook(() => useActiveSolution());

    expect(result.current).toBe('search');
  });
});
