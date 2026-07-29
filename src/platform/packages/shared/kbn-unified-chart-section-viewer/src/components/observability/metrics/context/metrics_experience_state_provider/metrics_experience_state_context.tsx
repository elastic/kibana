/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { createContext } from 'react';
import { METRICS_GRID_SETTINGS_DEFAULTS, type MetricsGridSettings } from '@kbn/discover-utils';
import type { Dimension, MetricsSort, UnifiedMetricsGridProps } from '../../../../../types';
import {
  DEFAULT_METRICS_SORT,
  FEATURE_FLAGS,
  FEATURE_FLAG_DEFAULTS,
} from '../../../../../common/constants';
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
  // Sourced from the host's persistent profile state (no longer restorable
  // state), so it is declared explicitly here rather than inherited.
  metricsSort: MetricsSort;
  recentlyExploredMetrics: readonly string[];
  onMetricExplored?: (metricUniqueKey: string) => void;
  onPageChange: (value: number) => void;
  onDimensionsChange: (value: Dimension[]) => void;
  onSearchTermChange: (value: string) => void;
  onMetricsSortChange: (value: MetricsSort) => void;
  onToggleFullscreen: () => void;
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
  metricsSort,
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

  // Sort is controlled when the host provides `onMetricsSortChange` (e.g.
  // Discover's persistent profile state). Without it, fall back to internal
  // state so standalone hosts still get a working sort control -- `metricsSort`
  // then acts as the initial value, like a DOM input's `defaultValue`.
  const isSortControlled = onMetricsSortChange !== undefined;
  const [uncontrolledSort, setUncontrolledSort] = useState<MetricsSort>(
    metricsSort ?? DEFAULT_METRICS_SORT
  );
  const hostSort = isSortControlled ? metricsSort ?? DEFAULT_METRICS_SORT : uncontrolledSort;

  // When sorting is disabled, ignore any host-provided sort (e.g. state
  // persisted or shared while the flag was on) and swallow change requests so
  // no sorting behavior runs and no new sort state is written while it is off.
  const effectiveMetricsSort = isSortingEnabled ? hostSort : DEFAULT_METRICS_SORT;

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

      // Preserve the page-reset-on-sort-change behavior from #277184: compare
      // against the current sort before forwarding the change.
      const [prevSortBy, prevDirection] = effectiveMetricsSort;
      const [nextSortBy, nextDirection] = nextSort;
      if (prevSortBy !== nextSortBy || prevDirection !== nextDirection) {
        setCurrentPage(0);
      }

      if (isSortControlled) {
        onMetricsSortChange(nextSort);
      } else {
        setUncontrolledSort(nextSort);
      }
    },
    [effectiveMetricsSort, isSortControlled, isSortingEnabled, onMetricsSortChange, setCurrentPage]
  );

  const onToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
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
        onFlyoutStateChange,
        onFlyoutSelectedTabChange,
        onGridSettingsChange: handleGridSettingsChange,
      }}
    >
      {children}
    </MetricsExperienceStateContext.Provider>
  );
}
