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
  breakdownField: undefined,
  onSelectedDimensionsChange: jest.fn(),
  onBreakdownFieldChange: jest.fn(),
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

    it('does not call any callback when every selection is already in the universe', () => {
      const onSelectedDimensionsChange = jest.fn();
      const onBreakdownFieldChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({
            selectedDimensions: [dim('host.name')],
            allDimensions: [dim('host.name'), dim('environment')],
            onSelectedDimensionsChange,
            onBreakdownFieldChange,
          })
        )
      );

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
      expect(onBreakdownFieldChange).not.toHaveBeenCalled();
    });

    it('does not call any callback when there are no selected dimensions', () => {
      const onSelectedDimensionsChange = jest.fn();
      const onBreakdownFieldChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({
            selectedDimensions: [],
            onSelectedDimensionsChange,
            onBreakdownFieldChange,
          })
        )
      );

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
      expect(onBreakdownFieldChange).not.toHaveBeenCalled();
    });
  });

  describe('breakdown propagation', () => {
    it('does not change the breakdown when the current one survives the prune', () => {
      const onSelectedDimensionsChange = jest.fn();
      const onBreakdownFieldChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({
            selectedDimensions: [dim('host.name'), dim('environment'), dim('container.id')],
            allDimensions: [dim('host.name'), dim('container.id')],
            breakdownField: 'container.id',
            onSelectedDimensionsChange,
            onBreakdownFieldChange,
          })
        )
      );

      expect(onSelectedDimensionsChange).toHaveBeenCalledWith([
        dim('host.name'),
        dim('container.id'),
      ]);
      expect(onBreakdownFieldChange).not.toHaveBeenCalled();
    });

    it('falls back to pruned[0]?.name when the current breakdown does not survive', () => {
      const onBreakdownFieldChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({
            selectedDimensions: [dim('environment'), dim('host.name')],
            allDimensions: [dim('host.name')],
            breakdownField: 'environment',
            onBreakdownFieldChange,
          })
        )
      );

      expect(onBreakdownFieldChange).toHaveBeenCalledTimes(1);
      expect(onBreakdownFieldChange).toHaveBeenCalledWith('host.name');
    });

    it('clears the breakdown when no selection survives the prune', () => {
      const onBreakdownFieldChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({
            selectedDimensions: [dim('environment')],
            allDimensions: [dim('host.name')],
            breakdownField: 'environment',
            onBreakdownFieldChange,
          })
        )
      );

      expect(onBreakdownFieldChange).toHaveBeenCalledWith(undefined);
    });

    it('proposes a new default breakdown when there was none and a prune happens', () => {
      const onBreakdownFieldChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({
            selectedDimensions: [dim('host.name'), dim('environment')],
            allDimensions: [dim('host.name')],
            breakdownField: undefined,
            onBreakdownFieldChange,
          })
        )
      );

      expect(onBreakdownFieldChange).toHaveBeenCalledWith('host.name');
    });

    it('does not require onBreakdownFieldChange', () => {
      const onSelectedDimensionsChange = jest.fn();
      expect(() =>
        renderHook(() =>
          useDimensionsWipe(
            baseParams({
              breakdownField: 'environment',
              onSelectedDimensionsChange,
              onBreakdownFieldChange: undefined,
            })
          )
        )
      ).not.toThrow();
      expect(onSelectedDimensionsChange).toHaveBeenCalledWith([dim('host.name')]);
    });
  });

  describe('gates', () => {
    it('does not act while a fetch is in flight (allDimensions can be stale)', () => {
      const onSelectedDimensionsChange = jest.fn();
      const onBreakdownFieldChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({ isLoading: true, onSelectedDimensionsChange, onBreakdownFieldChange })
        )
      );

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
      expect(onBreakdownFieldChange).not.toHaveBeenCalled();
    });

    it('does not act when the last fetch errored', () => {
      const onSelectedDimensionsChange = jest.fn();
      const onBreakdownFieldChange = jest.fn();
      renderHook(() =>
        useDimensionsWipe(
          baseParams({ hasError: true, onSelectedDimensionsChange, onBreakdownFieldChange })
        )
      );

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
      expect(onBreakdownFieldChange).not.toHaveBeenCalled();
    });
  });

  describe('reactivity', () => {
    it('fires the wipe when allDimensions changes to expose a new orphan', () => {
      const onSelectedDimensionsChange = jest.fn();
      const onBreakdownFieldChange = jest.fn();
      const selectedDimensions = [dim('host.name'), dim('environment')];

      const { rerender } = renderHook(
        ({ allDimensions }: { allDimensions: Dimension[] }) =>
          useDimensionsWipe(
            baseParams({
              selectedDimensions,
              allDimensions,
              breakdownField: 'environment',
              onSelectedDimensionsChange,
              onBreakdownFieldChange,
            })
          ),
        { initialProps: { allDimensions: [dim('host.name'), dim('environment')] } }
      );
      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();

      rerender({ allDimensions: [dim('host.name')] });

      expect(onSelectedDimensionsChange).toHaveBeenCalledTimes(1);
      expect(onSelectedDimensionsChange).toHaveBeenCalledWith([dim('host.name')]);
      expect(onBreakdownFieldChange).toHaveBeenCalledWith('host.name');
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

    it('does not fire when only breakdownField changes and there are no orphans', () => {
      const onSelectedDimensionsChange = jest.fn();
      const onBreakdownFieldChange = jest.fn();
      const selectedDimensions = [dim('host.name')];
      const allDimensions = [dim('host.name')];

      const { rerender } = renderHook(
        ({ breakdownField }: { breakdownField: string | undefined }) =>
          useDimensionsWipe(
            baseParams({
              selectedDimensions,
              allDimensions,
              breakdownField,
              onSelectedDimensionsChange,
              onBreakdownFieldChange,
            })
          ),
        { initialProps: { breakdownField: 'host.name' as string | undefined } }
      );
      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();

      rerender({ breakdownField: undefined });

      expect(onSelectedDimensionsChange).not.toHaveBeenCalled();
      expect(onBreakdownFieldChange).not.toHaveBeenCalled();
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
