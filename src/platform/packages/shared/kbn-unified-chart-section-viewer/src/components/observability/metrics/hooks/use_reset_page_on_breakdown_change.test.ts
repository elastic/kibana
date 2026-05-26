/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useResetPageOnBreakdownChange } from './use_reset_page_on_breakdown_change';

describe('useResetPageOnBreakdownChange', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does NOT call onPageChange on the first render (tab restore path)', async () => {
    renderHook(() => useResetPageOnBreakdownChange('host.name', mockOnPageChange));

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });

  it('calls onPageChange(0) when breakdownField changes from one defined value to another (user action)', async () => {
    const { rerender } = renderHook(
      ({ breakdownField }: { breakdownField: string | undefined }) =>
        useResetPageOnBreakdownChange(breakdownField, mockOnPageChange),
      {
        initialProps: { breakdownField: 'host.name' as string | undefined },
      }
    );

    // First render — no reset.
    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );

    // User picks a different breakdown (toolbar or Discover sidebar) — page must reset.
    rerender({ breakdownField: 'service.name' });

    await waitFor(() => {
      expect(mockOnPageChange).toHaveBeenCalledWith(0);
    });
  });

  it('does NOT call onPageChange when breakdownField value does not change between renders', async () => {
    const { rerender } = renderHook(
      ({ breakdownField }: { breakdownField: string | undefined }) =>
        useResetPageOnBreakdownChange(breakdownField, mockOnPageChange),
      {
        initialProps: { breakdownField: 'host.name' as string | undefined },
      }
    );

    // Rerender with the same value (equivalent to any re-render that doesn't
    // change the breakdown, e.g. a stream catch-up updating dimensions).
    rerender({ breakdownField: 'host.name' });

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });

  it('does NOT call onPageChange when breakdownField changes to undefined (clear / Discover internal blip)', async () => {
    const { rerender } = renderHook(
      ({ breakdownField }: { breakdownField: string | undefined }) =>
        useResetPageOnBreakdownChange(breakdownField, mockOnPageChange),
      {
        initialProps: { breakdownField: 'host.name' as string | undefined },
      }
    );

    // First render — no reset.
    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );

    // Discover momentarily drops the breakdown on duplicated tabs; the user
    // can also clear it explicitly. Either way, the page must NOT reset.
    rerender({ breakdownField: undefined });

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });

  it('does NOT call onPageChange when breakdownField changes from undefined to a defined value (async mount settle)', async () => {
    const { rerender } = renderHook(
      ({ breakdownField }: { breakdownField: string | undefined }) =>
        useResetPageOnBreakdownChange(breakdownField, mockOnPageChange),
      {
        initialProps: { breakdownField: undefined as string | undefined },
      }
    );

    // First render with no breakdown — no reset.
    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );

    // Breakdown settles after mount (e.g. Discover Redux hydration) — must NOT reset.
    rerender({ breakdownField: 'host.name' });

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });
});
