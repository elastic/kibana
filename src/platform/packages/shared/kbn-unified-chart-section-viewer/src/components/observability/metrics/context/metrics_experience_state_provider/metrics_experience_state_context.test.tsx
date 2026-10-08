/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import { renderHook, act } from '@testing-library/react';
import { METRICS_GRID_SETTINGS_DEFAULTS, type MetricsGridSettings } from '@kbn/discover-utils';
import {
  MetricsExperienceStateContext,
  MetricsExperienceStateProvider,
} from './metrics_experience_state_context';
import { METRICS_GRID_SORT_DEFAULTS } from '@kbn/discover-utils';
import {
  FEATURE_FLAGS,
  METRICS_SORT_BY,
  METRICS_SORT_DIRECTION,
} from '../../../../../common/constants';
import { ExternalServicesProvider } from '../../../../../context/external_services';
import { createFeatureFlagsMock } from '../../../../../test_utils/create_feature_flags_mock';
import type { MetricsSort } from '../../../../../types';

jest.mock('../../../../../restorable_state', () => {
  const { useState, useCallback } = jest.requireActual('react');
  return {
    useRestorableState: <T,>(_key: string, initialValue: T) => {
      const [value, _setValue] = useState(initialValue);

      const setValue = useCallback(
        (next: T | ((prev: T) => T)) => {
          _setValue(next);
        },
        [_setValue]
      );
      return [value, setValue] as const;
    },
  };
});

const useMetricsExperienceState = () => {
  const ctx = useContext(MetricsExperienceStateContext);
  if (!ctx) {
    throw new Error('MetricsExperienceStateContext not found');
  }
  return ctx;
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MetricsExperienceStateProvider profileId="test-profile">
    {children}
  </MetricsExperienceStateProvider>
);

const StatefulGridSettingsWrapper = ({ children }: { children: React.ReactNode }) => {
  const [gridSettings, setGridSettings] = React.useState<MetricsGridSettings>(
    METRICS_GRID_SETTINGS_DEFAULTS
  );
  const onGridSettingsChange = React.useCallback((update: Partial<MetricsGridSettings>) => {
    setGridSettings((prev) => ({ ...prev, ...update }));
  }, []);

  return (
    <MetricsExperienceStateProvider
      profileId="test-profile"
      gridSettings={gridSettings}
      onGridSettingsChange={onGridSettingsChange}
    >
      {children}
    </MetricsExperienceStateProvider>
  );
};

describe('MetricsExperienceStateProvider', () => {
  describe('onSearchTermChange', () => {
    it('resets currentPage to 0 when search term changes', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: StatefulGridSettingsWrapper,
      });

      // Navigate to page 2
      act(() => {
        result.current.onPageChange(2);
      });
      expect(result.current.currentPage).toBe(2);

      // Change search term — should reset page to 0
      act(() => {
        result.current.onSearchTermChange('cpu');
      });
      expect(result.current.searchTerm).toBe('cpu');
      expect(result.current.currentPage).toBe(0);
    });

    it('does not reset currentPage when search term is unchanged', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: StatefulGridSettingsWrapper,
      });

      // Set a search term
      act(() => {
        result.current.onSearchTermChange('cpu');
      });
      expect(result.current.searchTerm).toBe('cpu');

      // Navigate to page 3
      act(() => {
        result.current.onPageChange(3);
      });
      expect(result.current.currentPage).toBe(3);

      // Call onSearchTermChange with the same term — page should NOT reset
      act(() => {
        result.current.onSearchTermChange('cpu');
      });
      expect(result.current.searchTerm).toBe('cpu');
      expect(result.current.currentPage).toBe(3);
    });

    it('resets currentPage when search term changes from one value to another', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: StatefulGridSettingsWrapper,
      });

      // Set initial search and navigate
      act(() => {
        result.current.onSearchTermChange('cpu');
      });
      act(() => {
        result.current.onPageChange(5);
      });
      expect(result.current.currentPage).toBe(5);

      // Change to a different search term — should reset page
      act(() => {
        result.current.onSearchTermChange('memory');
      });
      expect(result.current.searchTerm).toBe('memory');
      expect(result.current.currentPage).toBe(0);
    });

    it('resets currentPage when search term is cleared', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: StatefulGridSettingsWrapper,
      });

      act(() => {
        result.current.onSearchTermChange('cpu');
      });
      act(() => {
        result.current.onPageChange(2);
      });
      expect(result.current.currentPage).toBe(2);

      // Clear the search term — should reset page
      act(() => {
        result.current.onSearchTermChange('');
      });
      expect(result.current.searchTerm).toBe('');
      expect(result.current.currentPage).toBe(0);
    });
  });

  describe('onDimensionsChange', () => {
    it('updates selectedDimensions', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: StatefulGridSettingsWrapper,
      });

      act(() => {
        result.current.onDimensionsChange([{ name: 'host.name' }]);
      });
      expect(result.current.selectedDimensions).toEqual([{ name: 'host.name' }]);
    });

    it('forwards only dimension names to onGridSettingsChange, dropping `type`', () => {
      const onGridSettingsChange = jest.fn();
      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <MetricsExperienceStateProvider
          profileId="test-profile"
          onGridSettingsChange={onGridSettingsChange}
        >
          {children}
        </MetricsExperienceStateProvider>
      );
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper: customWrapper });

      act(() => {
        result.current.onDimensionsChange([{ name: 'host.name', type: 'keyword' }]);
      });

      expect(onGridSettingsChange).toHaveBeenCalledWith({ dimensions: ['host.name'] });
    });

    it('does not reset currentPage (internal sync should not disrupt pagination)', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

      act(() => {
        result.current.onPageChange(4);
      });
      expect(result.current.currentPage).toBe(4);

      act(() => {
        result.current.onDimensionsChange([{ name: 'host.name' }]);
      });
      // currentPage must be preserved -- resetting it on a dimensions change is owned
      // exclusively by useResetPageOnDimensionsChange in the grid component, not here.
      expect(result.current.currentPage).toBe(4);
    });
  });

  describe('onToggleFullscreen', () => {
    it('toggles fullscreen state', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

      expect(result.current.isFullscreen).toBe(false);

      act(() => {
        result.current.onToggleFullscreen();
      });
      expect(result.current.isFullscreen).toBe(true);

      act(() => {
        result.current.onToggleFullscreen();
      });
      expect(result.current.isFullscreen).toBe(false);
    });
  });

  describe('onExitFullscreen', () => {
    it('leaves fullscreen', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

      act(() => {
        result.current.onToggleFullscreen();
      });
      expect(result.current.isFullscreen).toBe(true);

      act(() => {
        result.current.onExitFullscreen();
      });
      expect(result.current.isFullscreen).toBe(false);
    });

    it('is a no-op when already out of fullscreen', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

      act(() => {
        result.current.onExitFullscreen();
      });
      expect(result.current.isFullscreen).toBe(false);

      act(() => {
        result.current.onExitFullscreen();
      });
      expect(result.current.isFullscreen).toBe(false);
    });
  });

  describe('gridSettings', () => {
    it('defaults to METRICS_GRID_SETTINGS_DEFAULTS when not provided', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

      expect(result.current.gridSettings).toEqual({
        counterAggregation: 'sum',
        gaugeAggregation: 'avg',
        histogramPercentile: 'p95',
        dimensions: [],
        searchTerm: '',
      });
    });

    it('uses the provided gridSettings instead of the defaults', () => {
      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <MetricsExperienceStateProvider
          profileId="test-profile"
          gridSettings={{
            counterAggregation: 'max',
            gaugeAggregation: 'min',
            histogramPercentile: 'p50',
            dimensions: ['host.name'],
            searchTerm: 'host',
          }}
        >
          {children}
        </MetricsExperienceStateProvider>
      );
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper: customWrapper });

      expect(result.current.gridSettings).toEqual({
        counterAggregation: 'max',
        gaugeAggregation: 'min',
        histogramPercentile: 'p50',
        dimensions: ['host.name'],
        searchTerm: 'host',
      });
      expect(result.current.selectedDimensions).toEqual([{ name: 'host.name' }]);
    });

    it('forwards updates to the onGridSettingsChange prop', () => {
      const onGridSettingsChange = jest.fn();
      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <MetricsExperienceStateProvider
          profileId="test-profile"
          onGridSettingsChange={onGridSettingsChange}
        >
          {children}
        </MetricsExperienceStateProvider>
      );
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper: customWrapper });

      act(() => {
        result.current.onGridSettingsChange({ counterAggregation: 'max' });
      });

      expect(onGridSettingsChange).toHaveBeenCalledWith({ counterAggregation: 'max' });
    });

    it('does not throw when onGridSettingsChange is not provided', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

      expect(() => {
        act(() => {
          result.current.onGridSettingsChange({ counterAggregation: 'max' });
        });
      }).not.toThrow();
    });
  });

  describe('metricsSort', () => {
    const createSortWrapper =
      (
        props: { metricsSort?: MetricsSort; onMetricsSortChange?: (sort: MetricsSort) => void },
        { sortingEnabled = true }: { sortingEnabled?: boolean } = {}
      ) =>
      ({ children }: { children: React.ReactNode }) =>
        (
          <ExternalServicesProvider
            externalServices={{
              featureFlags: createFeatureFlagsMock({
                [FEATURE_FLAGS.IS_SORTING_ENABLED]: sortingEnabled,
              }),
            }}
          >
            <MetricsExperienceStateProvider profileId="test-profile" {...props}>
              {children}
            </MetricsExperienceStateProvider>
          </ExternalServicesProvider>
        );

    it('defaults to METRICS_GRID_SORT_DEFAULTS when the prop is omitted', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: createSortWrapper({}),
      });

      expect(result.current.metricsSort).toEqual(METRICS_GRID_SORT_DEFAULTS);
    });

    it('uses the metricsSort prop sourced from the host profile state', () => {
      const metricsSort: MetricsSort = {
        sortField: METRICS_SORT_BY.recency,
        sortDirection: METRICS_SORT_DIRECTION.desc,
      };
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: createSortWrapper({ metricsSort }),
      });

      expect(result.current.metricsSort).toEqual({
        sortField: METRICS_SORT_BY.recency,
        sortDirection: METRICS_SORT_DIRECTION.desc,
      });
    });

    it('forwards sort changes to the host onMetricsSortChange prop', () => {
      const onMetricsSortChange = jest.fn();
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: createSortWrapper({
          metricsSort: METRICS_GRID_SORT_DEFAULTS,
          onMetricsSortChange,
        }),
      });

      const nextSort: MetricsSort = {
        sortField: METRICS_SORT_BY.recency,
        sortDirection: METRICS_SORT_DIRECTION.desc,
      };
      act(() => {
        result.current.onMetricsSortChange(nextSort);
      });

      expect(onMetricsSortChange).toHaveBeenCalledWith(nextSort);
    });

    it('resets currentPage to 0 when the sort changes (parity with #277184)', () => {
      const onMetricsSortChange = jest.fn();
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: createSortWrapper({
          metricsSort: METRICS_GRID_SORT_DEFAULTS,
          onMetricsSortChange,
        }),
      });

      act(() => {
        result.current.onPageChange(2);
      });
      expect(result.current.currentPage).toBe(2);

      act(() => {
        result.current.onMetricsSortChange({
          sortField: METRICS_SORT_BY.alphabetically,
          sortDirection: METRICS_SORT_DIRECTION.desc,
        });
      });
      expect(result.current.currentPage).toBe(0);
    });

    it('does not reset currentPage when the sort is unchanged', () => {
      const onMetricsSortChange = jest.fn();
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: createSortWrapper({
          metricsSort: METRICS_GRID_SORT_DEFAULTS,
          onMetricsSortChange,
        }),
      });

      act(() => {
        result.current.onPageChange(3);
      });
      expect(result.current.currentPage).toBe(3);

      act(() => {
        result.current.onMetricsSortChange({
          sortField: METRICS_SORT_BY.alphabetically,
          sortDirection: METRICS_SORT_DIRECTION.asc,
        });
      });
      expect(result.current.currentPage).toBe(3);
      expect(onMetricsSortChange).toHaveBeenCalled();
    });

    it('defaults to enabled when the host provides no featureFlags service', () => {
      const onMetricsSortChange = jest.fn();
      const { result } = renderHook(() => useMetricsExperienceState(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <MetricsExperienceStateProvider
            profileId="test-profile"
            metricsSort={{
              sortField: METRICS_SORT_BY.recency,
              sortDirection: METRICS_SORT_DIRECTION.desc,
            }}
            onMetricsSortChange={onMetricsSortChange}
          >
            {children}
          </MetricsExperienceStateProvider>
        ),
      });

      expect(result.current.metricsSort).toEqual({
        sortField: METRICS_SORT_BY.recency,
        sortDirection: METRICS_SORT_DIRECTION.desc,
      });

      act(() => {
        result.current.onMetricsSortChange({
          sortField: METRICS_SORT_BY.alphabetically,
          sortDirection: METRICS_SORT_DIRECTION.desc,
        });
      });
      expect(onMetricsSortChange).toHaveBeenCalledWith({
        sortField: METRICS_SORT_BY.alphabetically,
        sortDirection: METRICS_SORT_DIRECTION.desc,
      });
    });

    describe('when the sorting feature flag is disabled', () => {
      it('ignores a host-provided non-default sort and falls back to the default', () => {
        const metricsSort: MetricsSort = {
          sortField: METRICS_SORT_BY.recency,
          sortDirection: METRICS_SORT_DIRECTION.desc,
        };
        const { result } = renderHook(() => useMetricsExperienceState(), {
          wrapper: createSortWrapper({ metricsSort }, { sortingEnabled: false }),
        });

        expect(result.current.metricsSort).toEqual(METRICS_GRID_SORT_DEFAULTS);
      });

      it('swallows sort change requests without forwarding or resetting the page', () => {
        const onMetricsSortChange = jest.fn();
        const { result } = renderHook(() => useMetricsExperienceState(), {
          wrapper: createSortWrapper(
            { metricsSort: METRICS_GRID_SORT_DEFAULTS, onMetricsSortChange },
            { sortingEnabled: false }
          ),
        });

        act(() => {
          result.current.onPageChange(2);
        });
        expect(result.current.currentPage).toBe(2);

        act(() => {
          result.current.onMetricsSortChange({
            sortField: METRICS_SORT_BY.recency,
            sortDirection: METRICS_SORT_DIRECTION.desc,
          });
        });

        expect(onMetricsSortChange).not.toHaveBeenCalled();
        expect(result.current.currentPage).toBe(2);
        expect(result.current.metricsSort).toEqual(METRICS_GRID_SORT_DEFAULTS);
      });
    });
  });
});
