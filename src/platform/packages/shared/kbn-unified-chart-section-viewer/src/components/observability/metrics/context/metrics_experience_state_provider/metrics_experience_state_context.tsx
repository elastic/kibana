/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { createContext } from 'react';
import {
  METRICS_GRID_SETTINGS_DEFAULTS,
  METRICS_GRID_SORT_DEFAULTS,
  type MetricsGridSettings,
} from '@kbn/discover-utils';
import type { Dimension, MetricsSort, UnifiedMetricsGridProps } from '../../../../../types';
import { FEATURE_FLAGS, FEATURE_FLAG_DEFAULTS } from '../../../../../common/constants';
import { useFeatureFlag } from '../../../../../hooks';
import { useRecentlyExploredMetrics } from '../../hooks';
import {
  type FlyoutState,
  type FlyoutTabId,
  type MetricsExperienceRestorableState,
  useRestorableState,
} from '../../../../../restorable_state';

export interface MetricsExperienceStateContextValue extends MetricsExperienceRestorableState {
  profileId: string;
  gridSettings: MetricsGridSettings;
  metricsSort: MetricsSort;
  recentlyExploredMetrics: readonly string[];
  onMetricExplored?: (metricUniqueKey: string) => void;
  onPageChange: (value: number) => void;
  onDimensionsChange: (value: Dimension[]) => void;
  onSearchTermChange: (value: string) => void;
  onMetricsSortChange: (value: MetricsSort) => void;
  onToggleFullscreen: () => void;
  onExitFullscreen: () => void;
  onFlyoutStateChange: (value: FlyoutState | undefined) => void;
  onFlyoutSelectedTabChange: (value: FlyoutTabId) => void;
  onGridSettingsChange: (update: Partial<MetricsGridSettings>) => void;
}

export const MetricsExperienceStateContext =
  createContext<MetricsExperienceStateContextValue | null>(null);

export function MetricsExperienceStateProvider({
  children,
  profileId,
  gridSettings = METRICS_GRID_SETTINGS_DEFAULTS,
  onGridSettingsChange,
  metricsSort = METRICS_GRID_SORT_DEFAULTS,
  onMetricsSortChange,
  getRecentlyExploredMetrics,
  onMetricExplored,
  discoverFetch$,
}: {
  children: React.ReactNode;
  profileId: string;
  gridSettings?: MetricsGridSettings;
  onGridSettingsChange?: (update: Partial<MetricsGridSettings>) => void;
  metricsSort?: MetricsSort;
  onMetricsSortChange?: (sort: MetricsSort) => void;
  getRecentlyExploredMetrics?: () => readonly string[];
  onMetricExplored?: (metricUniqueKey: string) => void;
  discoverFetch$?: UnifiedMetricsGridProps['fetch$'];
}) {
  const [currentPage, setCurrentPage] = useRestorableState('currentPage', 0);
  const [selectedDimensions, setSelectedDimensions] = useRestorableState('selectedDimensions', []);
  const [searchTerm, setSearchTerm] = useRestorableState('searchTerm', '');
  const [isFullscreen, setIsFullscreen] = useRestorableState('isFullscreen', false);
  const [flyoutState, setFlyoutState] = useRestorableState('flyoutState', undefined);

  const isSortingEnabled = useFeatureFlag(
    FEATURE_FLAGS.IS_SORTING_ENABLED,
    FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.IS_SORTING_ENABLED]
  );

  // When sorting is disabled, ignore any host-provided sort
  const effectiveMetricsSort = isSortingEnabled ? metricsSort : METRICS_GRID_SORT_DEFAULTS;

  const recentlyExploredMetrics = useRecentlyExploredMetrics({
    getRecentlyExploredMetrics,
    discoverFetch$,
    metricsSort: effectiveMetricsSort,
    searchTerm,
    selectedDimensions,
  });

  const onDimensionsChange = useCallback(
    (nextDimensions: Dimension[]) => {
      setSelectedDimensions(nextDimensions);
    },
    [setSelectedDimensions]
  );

  const onPageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
    },
    [setCurrentPage]
  );

  const onSearchTermChange = useCallback(
    (term: string) => {
      setSearchTerm((prevTerm) => {
        if (prevTerm !== term) {
          setCurrentPage(0);
        }
        return term;
      });
    },
    [setSearchTerm, setCurrentPage]
  );

  const handleMetricsSortChange = useCallback(
    (nextSort: MetricsSort) => {
      if (!isSortingEnabled) {
        return;
      }

      // compare against the current sort before forwarding the change
      if (
        effectiveMetricsSort.sortField !== nextSort.sortField ||
        effectiveMetricsSort.sortDirection !== nextSort.sortDirection
      ) {
        setCurrentPage(0);
      }

      onMetricsSortChange?.(nextSort);
    },
    [effectiveMetricsSort, isSortingEnabled, onMetricsSortChange, setCurrentPage]
  );

  const onToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, [setIsFullscreen]);

  const onExitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, [setIsFullscreen]);

  const onFlyoutStateChange = useCallback(
    (nextFlyoutState: FlyoutState | undefined) => {
      setFlyoutState(nextFlyoutState);
    },
    [setFlyoutState]
  );

  const onFlyoutSelectedTabChange = useCallback(
    (nextTabId: FlyoutTabId) => {
      setFlyoutState((prev) => (prev ? { ...prev, selectedTabId: nextTabId } : prev));
    },
    [setFlyoutState]
  );

  const handleGridSettingsChange = useCallback(
    (update: Partial<MetricsGridSettings>) => {
      onGridSettingsChange?.(update);
    },
    [onGridSettingsChange]
  );

  return (
    <MetricsExperienceStateContext.Provider
      value={{
        profileId,
        gridSettings,
        recentlyExploredMetrics,
        onMetricExplored,
        currentPage,
        isFullscreen,
        searchTerm,
        selectedDimensions,
        metricsSort: effectiveMetricsSort,
        flyoutState,
        onPageChange,
        onDimensionsChange,
        onSearchTermChange,
        onMetricsSortChange: handleMetricsSortChange,
        onToggleFullscreen,
        onExitFullscreen,
        onFlyoutStateChange,
        onFlyoutSelectedTabChange,
        onGridSettingsChange: handleGridSettingsChange,
      }}
    >
      {children}
    </MetricsExperienceStateContext.Provider>
  );
}
