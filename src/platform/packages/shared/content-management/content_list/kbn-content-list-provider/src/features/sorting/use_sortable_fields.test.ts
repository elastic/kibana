/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSortableFields } from './use_sortable_fields';
import { renderHookWithProvider } from '../../test_utils';

describe('useSortableFields', () => {
  it('should return default fields when no sorting config is provided', async () => {
    const { result } = await renderHookWithProvider(() => useSortableFields(), {
      providerOverrides: {
        features: { sorting: undefined },
      },
    });

    expect(result.current).toEqual(['title', 'updatedAt']);
  });

  it('should return fields from sorting.fields when provided', async () => {
    const { result } = await renderHookWithProvider(() => useSortableFields(), {
      providerOverrides: {
        features: {
          sorting: {
            fields: [
              { field: 'title', name: 'Title' },
              { field: 'status', name: 'Status' },
              { field: 'createdAt', name: 'Created' },
            ],
          },
        },
      },
    });

    expect(result.current).toEqual(['title', 'status', 'createdAt']);
  });

  it('should extract unique fields from sorting.options when provided', async () => {
    const { result } = await renderHookWithProvider(() => useSortableFields(), {
      providerOverrides: {
        features: {
          sorting: {
            options: [
              { label: 'Name A-Z', field: 'title', direction: 'asc' as const },
              { label: 'Name Z-A', field: 'title', direction: 'desc' as const },
              { label: 'Status', field: 'status', direction: 'asc' as const },
              { label: 'Created', field: 'createdAt', direction: 'desc' as const },
            ],
          },
        },
      },
    });

    // Should return unique fields only
    expect(result.current).toEqual(['title', 'status', 'createdAt']);
  });

  it('should prioritize fields over options when both are provided', async () => {
    const { result } = await renderHookWithProvider(() => useSortableFields(), {
      providerOverrides: {
        features: {
          sorting: {
            fields: [{ field: 'customField', name: 'Custom Field' }],
            options: [{ label: 'Title', field: 'title', direction: 'asc' as const }],
          },
        },
      },
    });

    // Should use fields, not options
    expect(result.current).toEqual(['customField']);
  });

  it('should return default fields when sorting is boolean true', async () => {
    const { result } = await renderHookWithProvider(() => useSortableFields(), {
      providerOverrides: {
        features: { sorting: true },
      },
    });

    expect(result.current).toEqual(['title', 'updatedAt']);
  });

  it('should return default fields when sorting.fields is empty array', async () => {
    const { result } = await renderHookWithProvider(() => useSortableFields(), {
      providerOverrides: {
        features: {
          sorting: {
            fields: [],
          },
        },
      },
    });

    expect(result.current).toEqual(['title', 'updatedAt']);
  });

  it('should return default fields when sorting.options is empty array', async () => {
    const { result } = await renderHookWithProvider(() => useSortableFields(), {
      providerOverrides: {
        features: {
          sorting: {
            options: [],
          },
        },
      },
    });

    expect(result.current).toEqual(['title', 'updatedAt']);
  });
});
