/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { useDimensionsSelector } from './use_dimensions_selector';
import type { Dimension, ParsedMetricItem } from '../../../types';
import { DEBOUNCE_TIME, MAX_DIMENSIONS_SELECTIONS } from '../../../common/constants';
import type { DimensionEntry } from '../dimensions_selector_helpers';

const wrapper = ({ children }: { children: ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const dim = (name: string, type: string = 'keyword'): Dimension => ({ name, type });

const makeMetric = (metricName: string, dimensionFields: Dimension[]): ParsedMetricItem => ({
  metricName,
  dataStream: 'metrics-test',
  units: [],
  metricTypes: [],
  fieldTypes: [],
  dimensionFields,
});

type HookArgs = Parameters<typeof useDimensionsSelector>[0];

/**
 * Render the hook with a stable arg object. The hook has a
 * `useEffect([selectedDimensions])` that re-syncs local state on every
 * reference change, so tests MUST pass the same array identity across
 * internal re-renders to avoid tripping React's infinite-update guard.
 * `renderHook`'s re-render calls this callback with the original `args`
 * reference, preserving identity.
 */
const renderDimensionsHook = (args: HookArgs) =>
  renderHook(() => useDimensionsSelector(args), { wrapper });

describe('useDimensionsSelector', () => {
  describe('options', () => {
    it('attaches the source Dimension to each option so handleChange can read it back', () => {
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name'), dim('service.name'), dim('cloud.region')],
        selectedDimensions: [],
        onChange: jest.fn(),
        singleSelection: false,
        isLoading: false,
      });

      const options = result.current.options as DimensionEntry[];
      expect(options.map((o) => o.dimension.name)).toEqual([
        'host.name',
        'service.name',
        'cloud.region',
      ]);
      expect(options.every((o) => typeof o.dimension === 'object')).toBe(true);
    });

    it('marks selected options as checked and leaves the rest unchecked', () => {
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name'), dim('service.name'), dim('cloud.region')],
        selectedDimensions: [dim('service.name')],
        onChange: jest.fn(),
        singleSelection: false,
        isLoading: false,
      });

      const byValue = Object.fromEntries(result.current.options.map((o) => [o.value, o.checked]));
      expect(byValue['service.name']).toBe('on');
      expect(byValue['host.name']).toBeUndefined();
      expect(byValue['cloud.region']).toBeUndefined();
    });

    it('disables unselected options when at the max selection limit (multi)', () => {
      const selected = Array.from({ length: MAX_DIMENSIONS_SELECTIONS }, (_, i) => dim(`d${i}`));
      const all = [...selected, dim('extra.one'), dim('extra.two')];
      const { result } = renderDimensionsHook({
        dimensions: all,
        selectedDimensions: selected,
        onChange: jest.fn(),
        singleSelection: false,
        isLoading: false,
      });

      const byValue = Object.fromEntries(result.current.options.map((o) => [o.value, o]));
      // Selected options stay enabled so they can be deselected.
      selected.forEach((d) => expect(byValue[d.name].disabled).toBe(false));
      // Unselected options are disabled once the limit is reached.
      expect(byValue['extra.one'].disabled).toBe(true);
      expect(byValue['extra.two'].disabled).toBe(true);
    });

    it('appends the tooltip overlay only on disabled-at-limit options', () => {
      const selected = Array.from({ length: MAX_DIMENSIONS_SELECTIONS }, (_, i) => dim(`d${i}`));
      const all = [...selected, dim('extra.one')];
      const { result } = renderDimensionsHook({
        dimensions: all,
        selectedDimensions: selected,
        onChange: jest.fn(),
        singleSelection: false,
        isLoading: false,
      });

      const byValue = Object.fromEntries(result.current.options.map((o) => [o.value, o]));
      // Selected entries are enabled, so no max-limit overlay.
      expect(byValue.d0.append).toBeUndefined();
      // Disabled-at-limit gets the overlay.
      expect(byValue['extra.one'].append).toBeDefined();
    });

    it('never disables options in single-selection mode, even past the limit', () => {
      // `singleSelection: true` short-circuits the at-max-limit check.
      const selected = Array.from({ length: MAX_DIMENSIONS_SELECTIONS + 2 }, (_, i) =>
        dim(`d${i}`)
      );
      const { result } = renderDimensionsHook({
        dimensions: selected,
        selectedDimensions: selected,
        onChange: jest.fn(),
        singleSelection: true,
        isLoading: false,
      });

      expect(result.current.options.every((o) => o.disabled === false)).toBe(true);
    });

    it('prepends orphan selections (dimensions not in `dimensions`) alphabetically', () => {
      // Orphan = selected dimension not present in the `dimensions` array.
      // This mirrors the URL-restore case where selections outlive the list.
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name')],
        selectedDimensions: [dim('zeta.orphan'), dim('alpha.orphan')],
        onChange: jest.fn(),
        singleSelection: false,
        isLoading: false,
      });

      expect(result.current.options.map((o) => o.value)).toEqual([
        'alpha.orphan',
        'zeta.orphan',
        'host.name',
      ]);
    });

    it('applies the optimistic filter when metricItems is provided', () => {
      // Only metrics that carry `service.name` also carry `cloud.region` here,
      // so picking `service.name` should hide `host.name` from the suggestion
      // set.
      const metricItems: ParsedMetricItem[] = [
        makeMetric('m1', [dim('service.name'), dim('cloud.region')]),
        makeMetric('m2', [dim('host.name')]),
      ];
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name'), dim('service.name'), dim('cloud.region')],
        selectedDimensions: [dim('service.name')],
        onChange: jest.fn(),
        singleSelection: false,
        isLoading: false,
        metricItems,
      });

      const values = result.current.options.map((o) => o.value);
      expect(values).toContain('service.name');
      expect(values).toContain('cloud.region');
      expect(values).not.toContain('host.name');
    });
  });

  describe('selectedValues', () => {
    it('returns the de-duplicated names of local selections', () => {
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name'), dim('service.name')],
        selectedDimensions: [dim('host.name'), dim('service.name')],
        onChange: jest.fn(),
        singleSelection: false,
        isLoading: false,
      });

      expect(result.current.selectedValues).toEqual(['host.name', 'service.name']);
    });
  });

  describe('local/controlled-prop sync', () => {
    it('re-syncs local state when `selectedDimensions` prop changes', () => {
      // All non-changing args share the same reference across renders so only
      // `selectedDimensions` can trigger the sync effect.
      const dimensions = [dim('host.name'), dim('service.name')];
      const onChange = jest.fn();

      const { result, rerender } = renderHook(
        ({ selectedDimensions }: { selectedDimensions: Dimension[] }) =>
          useDimensionsSelector({
            dimensions,
            selectedDimensions,
            onChange,
            singleSelection: false,
            isLoading: false,
          }),
        { wrapper, initialProps: { selectedDimensions: [] as Dimension[] } }
      );

      expect(result.current.selectedValues).toEqual([]);

      rerender({ selectedDimensions: [dim('host.name')] });
      expect(result.current.selectedValues).toEqual(['host.name']);
    });
  });

  describe('handleChange (multi-select)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('debounces onChange by DEBOUNCE_TIME ms', () => {
      const onChange = jest.fn();
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name'), dim('service.name'), dim('cloud.region')],
        selectedDimensions: [],
        onChange,
        singleSelection: false,
        isLoading: false,
      });

      const hostOption = (result.current.options as DimensionEntry[]).find(
        (o) => o.value === 'host.name'
      )!;

      act(() => {
        result.current.handleChange([{ ...hostOption, checked: 'on' }]);
      });

      // Pre-debounce: no onChange fired yet, but local state updates immediately
      // so selectedValues already reflects the pick.
      expect(onChange).not.toHaveBeenCalled();
      expect(result.current.selectedValues).toEqual(['host.name']);

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_TIME);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([dim('host.name')]);
    });

    it('collapses rapid consecutive changes into a single onChange call', () => {
      const onChange = jest.fn();
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name'), dim('service.name'), dim('cloud.region')],
        selectedDimensions: [],
        onChange,
        singleSelection: false,
        isLoading: false,
      });
      const opts = result.current.options as DimensionEntry[];
      const host = opts.find((o) => o.value === 'host.name')!;
      const service = opts.find((o) => o.value === 'service.name')!;

      act(() => {
        result.current.handleChange([{ ...host, checked: 'on' }]);
        result.current.handleChange([
          { ...host, checked: 'on' },
          { ...service, checked: 'on' },
        ]);
      });

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_TIME);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([dim('host.name'), dim('service.name')]);
    });

    it('caps the emitted selection at MAX_DIMENSIONS_SELECTIONS', () => {
      const onChange = jest.fn();
      const extras = Array.from({ length: MAX_DIMENSIONS_SELECTIONS + 2 }, (_, i) => dim(`d${i}`));
      const { result } = renderDimensionsHook({
        dimensions: extras,
        selectedDimensions: [],
        onChange,
        singleSelection: false,
        isLoading: false,
      });

      const selections = (result.current.options as DimensionEntry[]).map((o) => ({
        ...o,
        checked: 'on' as const,
      }));

      act(() => {
        result.current.handleChange(selections);
      });
      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_TIME);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toHaveLength(MAX_DIMENSIONS_SELECTIONS);
    });

    it('coerces `undefined` into an empty-array selection', () => {
      const onChange = jest.fn();
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name')],
        selectedDimensions: [],
        onChange,
        singleSelection: false,
        isLoading: false,
      });

      act(() => {
        result.current.handleChange(undefined);
      });
      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_TIME);
      });

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe('handleChange (single-select)', () => {
    it('fires onChange synchronously without debouncing', () => {
      const onChange = jest.fn();
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name'), dim('service.name')],
        selectedDimensions: [],
        onChange,
        singleSelection: true,
        isLoading: false,
      });

      const hostOption = (result.current.options as DimensionEntry[]).find(
        (o) => o.value === 'host.name'
      )!;

      act(() => {
        // Real ToolbarSelector emits a single option (not an array) in single-selection mode.
        result.current.handleChange({ ...hostOption, checked: 'on' });
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([dim('host.name')]);
    });
  });

  describe('button & popover nodes', () => {
    it('exposes a `buttonTooltipContent` only when at the max limit', () => {
      const atLimit = Array.from({ length: MAX_DIMENSIONS_SELECTIONS }, (_, i) => dim(`d${i}`));

      const { result: belowLimit } = renderDimensionsHook({
        dimensions: atLimit,
        selectedDimensions: atLimit.slice(0, 1),
        onChange: jest.fn(),
        singleSelection: false,
        isLoading: false,
      });
      expect(belowLimit.current.buttonTooltipContent).toBeUndefined();

      const { result: atTheLimit } = renderDimensionsHook({
        dimensions: atLimit,
        selectedDimensions: atLimit,
        onChange: jest.fn(),
        singleSelection: false,
        isLoading: false,
      });
      expect(atTheLimit.current.buttonTooltipContent).toBeDefined();
    });

    it('always provides a `buttonLabel` and `popoverContentBelowSearch`', () => {
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name')],
        selectedDimensions: [],
        onChange: jest.fn(),
        singleSelection: false,
        isLoading: false,
      });
      expect(result.current.buttonLabel).toBeDefined();
      expect(result.current.popoverContentBelowSearch).toBeDefined();
    });
  });

  describe('type discipline', () => {
    it('gracefully drops options missing a `dimension` field (defensive guard)', () => {
      // Simulates a third-party shape that slipped through without a dimension.
      // `handleChange` must not crash; it should just produce an empty selection.
      const onChange = jest.fn();
      const { result } = renderDimensionsHook({
        dimensions: [dim('host.name')],
        selectedDimensions: [],
        onChange,
        singleSelection: true,
        isLoading: false,
      });

      act(() => {
        const rogue: SelectableEntry = { value: 'mystery', label: 'mystery', key: 'mystery' };
        result.current.handleChange([rogue]);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });
});
