/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { Dimension } from '../../../../types';
import { useResetPageOnDimensionsChange } from './use_reset_page_on_dimensions_change';

const HOST: Dimension = { name: 'host.name', type: 'keyword' };
const SERVICE: Dimension = { name: 'service.name', type: 'keyword' };
const NAMESPACE: Dimension = { name: 'kubernetes.namespace', type: 'keyword' };

describe('useResetPageOnDimensionsChange', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does NOT call onPageChange on the first render (tab restore path)', async () => {
    renderHook(() => useResetPageOnDimensionsChange([HOST], mockOnPageChange));

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });

  it('calls onPageChange(0) when the primary dimension changes (user action)', async () => {
    const { rerender } = renderHook(
      ({ dims }: { dims: Dimension[] }) => useResetPageOnDimensionsChange(dims, mockOnPageChange),
      {
        initialProps: { dims: [HOST] },
      }
    );

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );

    rerender({ dims: [SERVICE] });

    await waitFor(() => {
      expect(mockOnPageChange).toHaveBeenCalledWith(0);
    });
  });

  it('does NOT call onPageChange when the selection does not change between renders', async () => {
    const { rerender } = renderHook(
      ({ dims }: { dims: Dimension[] }) => useResetPageOnDimensionsChange(dims, mockOnPageChange),
      {
        initialProps: { dims: [HOST] },
      }
    );

    rerender({ dims: [HOST] });

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });

  it('calls onPageChange(0) when the last breakdown is cleared', async () => {
    const { rerender } = renderHook(
      ({ dims }: { dims: Dimension[] }) => useResetPageOnDimensionsChange(dims, mockOnPageChange),
      {
        initialProps: { dims: [HOST] },
      }
    );

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );

    rerender({ dims: [] });

    await waitFor(() => {
      expect(mockOnPageChange).toHaveBeenCalledWith(0);
    });
  });

  it('calls onPageChange(0) when the first breakdown is added', async () => {
    const { rerender } = renderHook(
      ({ dims }: { dims: Dimension[] }) => useResetPageOnDimensionsChange(dims, mockOnPageChange),
      {
        initialProps: { dims: [] as Dimension[] },
      }
    );

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );

    rerender({ dims: [HOST] });

    await waitFor(() => {
      expect(mockOnPageChange).toHaveBeenCalledWith(0);
    });
  });

  it('calls onPageChange(0) when a secondary dimension is added to the selection', async () => {
    const { rerender } = renderHook(
      ({ dims }: { dims: Dimension[] }) => useResetPageOnDimensionsChange(dims, mockOnPageChange),
      {
        initialProps: { dims: [HOST] },
      }
    );

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );

    rerender({ dims: [HOST, SERVICE] });

    await waitFor(() => {
      expect(mockOnPageChange).toHaveBeenCalledWith(0);
    });
  });

  it('calls onPageChange(0) when a secondary dimension is removed from the selection', async () => {
    const { rerender } = renderHook(
      ({ dims }: { dims: Dimension[] }) => useResetPageOnDimensionsChange(dims, mockOnPageChange),
      {
        initialProps: { dims: [HOST, SERVICE, NAMESPACE] },
      }
    );

    await waitFor(
      () => {
        expect(mockOnPageChange).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );

    rerender({ dims: [HOST, SERVICE] });

    await waitFor(() => {
      expect(mockOnPageChange).toHaveBeenCalledWith(0);
    });
  });
});
