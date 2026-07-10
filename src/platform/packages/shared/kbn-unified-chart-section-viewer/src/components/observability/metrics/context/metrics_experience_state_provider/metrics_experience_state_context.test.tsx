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
import {
  MetricsExperienceStateContext,
  MetricsExperienceStateProvider,
} from './metrics_experience_state_context';

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

describe('MetricsExperienceStateProvider', () => {
  describe('onSearchTermChange', () => {
    it('resets currentPage to 0 when search term changes', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

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
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

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
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

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
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

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
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

      act(() => {
        result.current.onDimensionsChange([{ name: 'host.name' }]);
      });
      expect(result.current.selectedDimensions).toEqual([{ name: 'host.name' }]);
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
      // currentPage must be preserved — this is the duplicate-tab scenario:
      // useDiscoverFieldForBreakdown fires an internal sync after restore,
      // which must not reset the page the user was on.
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

  describe('gridSettings', () => {
    it('defaults to METRICS_GRID_SETTINGS_DEFAULTS when not provided', () => {
      const { result } = renderHook(() => useMetricsExperienceState(), { wrapper });

      expect(result.current.gridSettings).toEqual({
        counterAggregation: 'sum',
        gaugeAggregation: 'avg',
        histogramPercentile: 'p95',
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
      });
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
});
