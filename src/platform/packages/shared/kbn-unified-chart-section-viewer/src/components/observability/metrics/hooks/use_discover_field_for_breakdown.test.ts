/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { useDiscoverFieldForBreakdown } from './use_discover_field_for_breakdown';
import type { Dimension } from '../../../../types';
import { MAX_DIMENSIONS_SELECTIONS } from '../../../../common/constants';

describe('useDiscoverFieldForBreakdown', () => {
  const mockOnDimensionsChange = jest.fn();

  const createDimension = (name: string): Dimension => ({
    name,
    type: ES_FIELD_TYPES.KEYWORD,
  });

  const hostDimension = createDimension('host.name');
  const serviceDimension = createDimension('service.name');
  const regionDimension = createDimension('region');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when breakdownField is undefined', () => {
    it('does not call onDimensionsChange', () => {
      renderHook(() =>
        useDiscoverFieldForBreakdown(undefined, [hostDimension], [], mockOnDimensionsChange)
      );

      expect(mockOnDimensionsChange).not.toHaveBeenCalled();
    });

    it('does not call onDimensionsChange even when dimensions are available', () => {
      renderHook(() =>
        useDiscoverFieldForBreakdown(
          undefined,
          [hostDimension, serviceDimension],
          [],
          mockOnDimensionsChange
        )
      );

      expect(mockOnDimensionsChange).not.toHaveBeenCalled();
    });
  });

  describe('when dimensions array is empty', () => {
    it('does not call onDimensionsChange', () => {
      renderHook(() => useDiscoverFieldForBreakdown('host.name', [], [], mockOnDimensionsChange));

      expect(mockOnDimensionsChange).not.toHaveBeenCalled();
    });

    it('calls onDimensionsChange when dimensions become available', async () => {
      const { rerender } = renderHook(
        ({ breakdownField, dimensions }) =>
          useDiscoverFieldForBreakdown(breakdownField, dimensions, [], mockOnDimensionsChange),
        {
          initialProps: {
            breakdownField: 'host.name' as string | undefined,
            dimensions: [] as Dimension[],
          },
        }
      );

      expect(mockOnDimensionsChange).not.toHaveBeenCalled();

      rerender({
        breakdownField: 'host.name',
        dimensions: [hostDimension],
      });

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([hostDimension]);
      });
    });
  });

  describe('when dimension is already selected', () => {
    it('does not call onDimensionsChange (idempotent check)', () => {
      renderHook(() =>
        useDiscoverFieldForBreakdown(
          'host.name',
          [hostDimension, serviceDimension],
          [hostDimension],
          mockOnDimensionsChange
        )
      );

      expect(mockOnDimensionsChange).not.toHaveBeenCalled();
    });

    it('does not call onDimensionsChange when breakdownField changes to already selected dimension', () => {
      const { rerender } = renderHook(
        ({ breakdownField }) =>
          useDiscoverFieldForBreakdown(
            breakdownField,
            [hostDimension, serviceDimension],
            [hostDimension],
            mockOnDimensionsChange
          ),
        {
          initialProps: {
            breakdownField: 'service.name' as string | undefined,
          },
        }
      );

      mockOnDimensionsChange.mockClear();

      rerender({ breakdownField: 'host.name' });

      expect(mockOnDimensionsChange).not.toHaveBeenCalled();
    });
  });

  describe('when dimension is not found in dimensions array', () => {
    it('does not call onDimensionsChange', () => {
      renderHook(() =>
        useDiscoverFieldForBreakdown(
          'nonexistent.field',
          [hostDimension, serviceDimension],
          [],
          mockOnDimensionsChange
        )
      );

      expect(mockOnDimensionsChange).not.toHaveBeenCalled();
    });
  });

  describe('when syncing a new dimension', () => {
    it('adds dimension when no previous selection exists', async () => {
      renderHook(() =>
        useDiscoverFieldForBreakdown(
          'host.name',
          [hostDimension, serviceDimension],
          [],
          mockOnDimensionsChange
        )
      );

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([hostDimension]);
      });
    });

    it('keeps existing selection order and appends new breakdown dimension', async () => {
      renderHook(() =>
        useDiscoverFieldForBreakdown(
          'service.name',
          [hostDimension, serviceDimension],
          [hostDimension],
          mockOnDimensionsChange
        )
      );

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([hostDimension, serviceDimension]);
      });
    });

    it('keeps selection order stable when syncing multiple breakdown field changes', async () => {
      const { rerender } = renderHook(
        ({ breakdownField, selectedDimensions }) =>
          useDiscoverFieldForBreakdown(
            breakdownField,
            [hostDimension, serviceDimension, regionDimension],
            selectedDimensions,
            mockOnDimensionsChange
          ),
        {
          initialProps: {
            breakdownField: 'host.name' as string | undefined,
            selectedDimensions: [serviceDimension] as Dimension[],
          },
        }
      );

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([serviceDimension, hostDimension]);
      });

      mockOnDimensionsChange.mockClear();

      rerender({
        breakdownField: 'region',
        selectedDimensions: [hostDimension],
      });

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([hostDimension, regionDimension]);
      });
    });

    it('keeps most recent dimensions when at MAX_DIMENSIONS_SELECTIONS', async () => {
      const dim2 = createDimension('dim2');
      const dim3 = createDimension('dim3');
      const dim4 = createDimension('dim4');
      const dim5 = createDimension('dim5');
      const dim6 = createDimension('dim6');
      const selectedDimensionsAtMax = [hostDimension, serviceDimension, dim2, dim3, dim4];

      // Guard to ensure this test adapts with any future constant changes.
      expect(selectedDimensionsAtMax).toHaveLength(MAX_DIMENSIONS_SELECTIONS);

      renderHook(() =>
        useDiscoverFieldForBreakdown(
          'dim6',
          [...selectedDimensionsAtMax, dim5, dim6],
          selectedDimensionsAtMax,
          mockOnDimensionsChange
        )
      );

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([
          serviceDimension,
          dim2,
          dim3,
          dim4,
          dim6,
        ]);
      });
    });
  });

  describe('when breakdownField changes', () => {
    it('syncs new breakdownField to dimensions', async () => {
      const { rerender } = renderHook(
        ({ breakdownField }) =>
          useDiscoverFieldForBreakdown(
            breakdownField,
            [hostDimension, serviceDimension],
            [],
            mockOnDimensionsChange
          ),
        {
          initialProps: {
            breakdownField: 'host.name' as string | undefined,
          },
        }
      );

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([hostDimension]);
      });

      mockOnDimensionsChange.mockClear();

      rerender({ breakdownField: 'service.name' });

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([serviceDimension]);
      });
    });

    it('does not sync when breakdownField changes to undefined', async () => {
      const { rerender } = renderHook(
        ({ breakdownField }) =>
          useDiscoverFieldForBreakdown(
            breakdownField,
            [hostDimension, serviceDimension],
            [],
            mockOnDimensionsChange
          ),
        {
          initialProps: {
            breakdownField: 'host.name' as string | undefined,
          },
        }
      );

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([hostDimension]);
      });

      mockOnDimensionsChange.mockClear();

      rerender({ breakdownField: undefined });

      // Should not call onDimensionsChange when breakdownField becomes undefined
      await waitFor(
        () => {
          expect(mockOnDimensionsChange).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );
    });
  });

  describe('when dimensions change', () => {
    it('syncs when dimensions become available for existing breakdownField', async () => {
      const { rerender } = renderHook(
        ({ dimensions }) =>
          useDiscoverFieldForBreakdown('host.name', dimensions, [], mockOnDimensionsChange),
        {
          initialProps: {
            dimensions: [] as Dimension[],
          },
        }
      );

      expect(mockOnDimensionsChange).not.toHaveBeenCalled();

      rerender({ dimensions: [hostDimension, serviceDimension] });

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([hostDimension]);
      });
    });

    it('does not sync when dimensions change but breakdownField is not set', () => {
      const { rerender } = renderHook(
        ({ dimensions }) =>
          useDiscoverFieldForBreakdown(undefined, dimensions, [], mockOnDimensionsChange),
        {
          initialProps: {
            dimensions: [] as Dimension[],
          },
        }
      );

      rerender({ dimensions: [hostDimension, serviceDimension] });

      expect(mockOnDimensionsChange).not.toHaveBeenCalled();
    });
  });

  describe('ref tracking behavior', () => {
    it('does not sync again when breakdownField value does not change and dimension is already selected', async () => {
      const { rerender } = renderHook(
        ({ breakdownField, selectedDimensions }) =>
          useDiscoverFieldForBreakdown(
            breakdownField,
            [hostDimension, serviceDimension],
            selectedDimensions,
            mockOnDimensionsChange
          ),
        {
          initialProps: {
            breakdownField: 'host.name' as string | undefined,
            selectedDimensions: [hostDimension] as Dimension[], // Already selected
          },
        }
      );

      // Should not call because dimension is already selected (idempotent)
      await waitFor(
        () => {
          expect(mockOnDimensionsChange).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );

      // Rerender with same breakdownField value
      rerender({
        breakdownField: 'host.name',
        selectedDimensions: [hostDimension],
      });

      // Should still not call because dimension is already selected (idempotent)
      await waitFor(
        () => {
          expect(mockOnDimensionsChange).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );
    });

    it('updates ref when breakdownField changes', async () => {
      const { rerender } = renderHook(
        ({ breakdownField }) =>
          useDiscoverFieldForBreakdown(
            breakdownField,
            [hostDimension, serviceDimension],
            [],
            mockOnDimensionsChange
          ),
        {
          initialProps: {
            breakdownField: 'host.name' as string | undefined,
          },
        }
      );

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([hostDimension]);
      });

      mockOnDimensionsChange.mockClear();

      rerender({ breakdownField: 'service.name' });

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([serviceDimension]);
      });
    });
  });

  describe('edge cases', () => {
    it('handles rapid changes to breakdownField', async () => {
      const { rerender } = renderHook(
        ({ breakdownField }) =>
          useDiscoverFieldForBreakdown(
            breakdownField,
            [hostDimension, serviceDimension],
            [],
            mockOnDimensionsChange
          ),
        {
          initialProps: {
            breakdownField: 'host.name' as string | undefined,
          },
        }
      );

      rerender({ breakdownField: 'service.name' });
      rerender({ breakdownField: 'host.name' });
      rerender({ breakdownField: 'service.name' });

      await waitFor(() => {
        // Should have called onDimensionsChange for each unique change
        expect(mockOnDimensionsChange).toHaveBeenCalled();
      });
    });

    it('handles when selectedDimensions changes externally', async () => {
      const { rerender } = renderHook(
        ({ selectedDimensions }) =>
          useDiscoverFieldForBreakdown(
            'host.name',
            [hostDimension, serviceDimension],
            selectedDimensions,
            mockOnDimensionsChange
          ),
        {
          initialProps: {
            selectedDimensions: [] as Dimension[],
          },
        }
      );

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([hostDimension]);
      });

      mockOnDimensionsChange.mockClear();

      // External change to selectedDimensions (simulates toolbar clear/replace)
      rerender({ selectedDimensions: [serviceDimension] });

      await waitFor(
        () => {
          expect(mockOnDimensionsChange).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );
    });
  });

  describe('edge-triggered behavior', () => {
    it('does not re-sync after toolbar clear until breakdownField changes again', async () => {
      const { rerender } = renderHook(
        ({ breakdownField, selectedDimensions }) =>
          useDiscoverFieldForBreakdown(
            breakdownField,
            [hostDimension, serviceDimension],
            selectedDimensions,
            mockOnDimensionsChange
          ),
        {
          initialProps: {
            breakdownField: 'host.name' as string | undefined,
            selectedDimensions: [] as Dimension[],
          },
        }
      );

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([hostDimension]);
      });

      mockOnDimensionsChange.mockClear();

      // Simulate user clearing via toolbar dropdown.
      rerender({
        breakdownField: 'host.name',
        selectedDimensions: [],
      });

      await waitFor(
        () => {
          expect(mockOnDimensionsChange).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );

      rerender({
        breakdownField: 'service.name',
        selectedDimensions: [],
      });

      await waitFor(() => {
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([serviceDimension]);
      });
    });
  });
});
