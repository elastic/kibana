/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { Dimension } from '../../../../types';
import { useDimensionsWipe, type UseDimensionsWipeParams } from './use_dimensions_wipe';

const dim = (name: string): Dimension => ({ name });

const baseParams = (overrides: Partial<UseDimensionsWipeParams> = {}): UseDimensionsWipeParams => ({
  selectedDimensions: [dim('host.name'), dim('environment')],
  allDimensions: [dim('host.name')],
  isLoading: false,
  hasError: false,
  onSelectedDimensionsChange: jest.fn(),
  ...overrides,
});

describe('useDimensionsWipe', () => {
  describe('on a fresh, successful response', () => {
    it('prunes selectedDimensions to the intersection with allDimensions', () => {
      const onSelectedDimensionsChange = jest.fn();
      renderHook(() => useDimensionsWipe(baseParams({ onSelectedDimensionsChange })));

      expect(onSelectedDimensionsChange).toHaveBeenCalledTimes(1);
      expect(onSelectedDimensionsChange).toHaveBeenCalledWith([dim('host.name')]);
    });

    it('calls onSelectedDimensionsChange with an empty array when no selection survives', () => {
      const onSelectedDimensionsChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({
            selectedDimensions: [dim('environment')],
            allDimensions: [dim('host.name')],
            onSelectedDimensionsChange,
          })
        )
      );

      expect(onSelectedDimensionsChange).toHaveBeenCalledTimes(1);
      expect(onSelectedDimensionsChange).toHaveBeenCalledWith([]);
    });

    it('does not call the callback when every selection is already in the universe', () => {
      const onSelectedDimensionsChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({
            selectedDimensions: [dim('host.name')],
            allDimensions: [dim('host.name'), dim('environment')],
            onSelectedDimensionsChange,
          })
        )
      );

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
    });

    it('does not call the callback when there are no selected dimensions', () => {
      const onSelectedDimensionsChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({
            selectedDimensions: [],
            onSelectedDimensionsChange,
          })
        )
      );

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
    });
  });

  describe('gates', () => {
    it('does not act while a fetch is in flight (allDimensions can be stale)', () => {
      const onSelectedDimensionsChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(baseParams({ isLoading: true, onSelectedDimensionsChange }))
      );

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
    });

    it('does not act when the last fetch errored', () => {
      const onSelectedDimensionsChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(baseParams({ hasError: true, onSelectedDimensionsChange }))
      );

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
    });

    it('does not act when allDimensions is empty (e.g. fresh mount on a duplicated Discover tab)', () => {
      // Regression: on a duplicated tab `selectedDimensions` is restored
      // from `uiState.metricsGrid` BEFORE the new tab's METRICS_INFO fetch
      // starts, so `isLoading` is briefly false with `allDimensions=[]`.
      // Without this gate the hook would prune the restored selection
      // against the empty universe.
      const onSelectedDimensionsChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({
            selectedDimensions: [dim('host.name')],
            allDimensions: [],
            isLoading: false,
            hasError: false,
            onSelectedDimensionsChange,
          })
        )
      );

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
    });
  });

  describe('reactivity', () => {
    it('fires the wipe when allDimensions changes to expose a new orphan', () => {
      const onSelectedDimensionsChange = jest.fn();
      const selectedDimensions = [dim('host.name'), dim('environment')];

      const { rerender } = renderHook(
        ({ allDimensions }: { allDimensions: Dimension[] }) =>
          useDimensionsWipe(
            baseParams({
              selectedDimensions,
              allDimensions,
              onSelectedDimensionsChange,
            })
          ),
        { initialProps: { allDimensions: [dim('host.name'), dim('environment')] } }
      );
      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();

      rerender({ allDimensions: [dim('host.name')] });

      expect(onSelectedDimensionsChange).toHaveBeenCalledTimes(1);
      expect(onSelectedDimensionsChange).toHaveBeenCalledWith([dim('host.name')]);
    });

    it('fires the wipe when transitioning from loading to a successful response', () => {
      const onSelectedDimensionsChange = jest.fn();
      const selectedDimensions = [dim('host.name'), dim('environment')];
      const allDimensions = [dim('host.name')];

      const { rerender } = renderHook(
        ({ isLoading }: { isLoading: boolean }) =>
          useDimensionsWipe(
            baseParams({
              selectedDimensions,
              allDimensions,
              isLoading,
              onSelectedDimensionsChange,
            })
          ),
        { initialProps: { isLoading: true } }
      );
      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();

      rerender({ isLoading: false });

      expect(onSelectedDimensionsChange).toHaveBeenCalledTimes(1);
    });

    it('fires the wipe when transitioning from error to a successful response', () => {
      const onSelectedDimensionsChange = jest.fn();
      const selectedDimensions = [dim('host.name'), dim('environment')];
      const allDimensions = [dim('host.name')];

      const { rerender } = renderHook(
        ({ hasError }: { hasError: boolean }) =>
          useDimensionsWipe(
            baseParams({
              selectedDimensions,
              allDimensions,
              hasError,
              onSelectedDimensionsChange,
            })
          ),
        { initialProps: { hasError: true } }
      );
      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();

      rerender({ hasError: false });

      expect(onSelectedDimensionsChange).toHaveBeenCalledTimes(1);
    });

    it('does not fire again when only unrelated inputs change (deps stay equal)', () => {
      const onSelectedDimensionsChange = jest.fn();
      const selectedDimensions = [dim('host.name')];
      const allDimensions = [dim('host.name')];

      const { rerender } = renderHook(
        ({ isLoading }: { isLoading: boolean }) =>
          useDimensionsWipe(
            baseParams({
              selectedDimensions,
              allDimensions,
              isLoading,
              onSelectedDimensionsChange,
            })
          ),
        { initialProps: { isLoading: false } }
      );
      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();

      rerender({ isLoading: false });

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
    });
  });
});
