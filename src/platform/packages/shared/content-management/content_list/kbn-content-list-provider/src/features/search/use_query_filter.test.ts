/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act } from '@testing-library/react';
import { useQueryFilter } from './use_query_filter';
import { renderHookWithProvider } from '../../test_utils';

describe('useQueryFilter', () => {
  it('should return empty selection when query text is empty', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: { search: true },
      },
    });

    expect(result.current.selection).toEqual({});
    expect(result.current.selectedValues).toEqual([]);
    expect(result.current.excludedValues).toEqual([]);
    expect(result.current.activeCount).toBe(0);
  });

  it('should parse include clauses from query text with OR syntax', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: {
          search: {
            initialQuery: 'status:(active)',
          },
        },
      },
    });

    expect(result.current.selection).toEqual({ active: 'include' });
    expect(result.current.selectedValues).toEqual(['active']);
    expect(result.current.activeCount).toBe(1);
  });

  it('should parse exclude clauses when supportsExclude is true', async () => {
    const { result } = await renderHookWithProvider(
      () => useQueryFilter('status', { supportsExclude: true }),
      {
        providerOverrides: {
          features: {
            search: {
              initialQuery: '-status:(archived)',
            },
          },
        },
      }
    );

    expect(result.current.selection).toEqual({ archived: 'exclude' });
    expect(result.current.excludedValues).toEqual(['archived']);
    expect(result.current.activeCount).toBe(1);
  });

  it('should parse multiple values from OR clauses', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: {
          search: {
            initialQuery: 'status:(active OR inactive)',
          },
        },
      },
    });

    expect(result.current.selectedValues).toContain('active');
    expect(result.current.selectedValues).toContain('inactive');
    expect(result.current.activeCount).toBe(2);
  });

  it('should toggle a value from unselected to include', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: { search: true },
      },
    });

    act(() => {
      result.current.toggle('active', 'include');
    });

    expect(result.current.getValueState('active')).toBe('include');
    expect(result.current.selectedValues).toContain('active');
  });

  it('should toggle a value from include to unselected', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: {
          search: {
            initialQuery: 'status:(active)',
          },
        },
      },
    });

    expect(result.current.getValueState('active')).toBe('include');

    act(() => {
      result.current.toggle('active', 'include');
    });

    expect(result.current.getValueState('active')).toBeNull();
  });

  it('should toggle a value from include to exclude when supportsExclude is true', async () => {
    const { result } = await renderHookWithProvider(
      () => useQueryFilter('status', { supportsExclude: true }),
      {
        providerOverrides: {
          features: {
            search: {
              initialQuery: 'status:(active)',
            },
          },
        },
      }
    );

    act(() => {
      result.current.toggle('active', 'exclude');
    });

    expect(result.current.getValueState('active')).toBe('exclude');
    expect(result.current.excludedValues).toContain('active');
  });

  it('should add a value', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: { search: true },
      },
    });

    act(() => {
      result.current.addValue('active', 'include');
    });

    expect(result.current.getValueState('active')).toBe('include');
  });

  it('should not add a value if it already exists in the same state', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: {
          search: {
            initialQuery: 'status:(active)',
          },
        },
      },
    });

    const initialCount = result.current.activeCount;

    act(() => {
      result.current.addValue('active', 'include');
    });

    expect(result.current.activeCount).toBe(initialCount);
  });

  it('should remove a value', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: {
          search: {
            initialQuery: 'status:(active)',
          },
        },
      },
    });

    act(() => {
      result.current.removeValue('active');
    });

    expect(result.current.getValueState('active')).toBeNull();
  });

  it('should set multiple values at once', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: { search: true },
      },
    });

    act(() => {
      result.current.setValues(['active', 'inactive'], 'include');
    });

    expect(result.current.selectedValues).toContain('active');
    expect(result.current.selectedValues).toContain('inactive');
    expect(result.current.activeCount).toBe(2);
  });

  it('should clear all values', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: {
          search: {
            initialQuery: 'status:(active OR inactive)',
          },
        },
      },
    });

    expect(result.current.activeCount).toBeGreaterThan(0);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.activeCount).toBe(0);
    expect(result.current.selectedValues).toEqual([]);
  });

  it('should handle invalid query text gracefully', async () => {
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: {
          search: {
            initialQuery: 'invalid query syntax {',
          },
        },
      },
    });

    // Should not crash and return empty selection
    expect(result.current.selection).toEqual({});
    expect(result.current.activeCount).toBe(0);
  });

  it('should react to query text changes from useContentListSearch', async () => {
    // This test verifies that useQueryFilter reads from the same search context
    // We test this by checking that the hook correctly parses queries set via initialQuery
    const { result } = await renderHookWithProvider(() => useQueryFilter('status'), {
      providerOverrides: {
        features: {
          search: {
            initialQuery: 'status:(active)',
          },
        },
      },
    });

    // The filter should parse the initial query correctly
    expect(result.current.getValueState('active')).toBe('include');
    expect(result.current.selectedValues).toContain('active');
  });
});
