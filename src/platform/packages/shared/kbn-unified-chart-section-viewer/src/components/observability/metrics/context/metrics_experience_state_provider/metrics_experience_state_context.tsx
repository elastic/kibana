/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createContext } from 'react';
import { isEqual } from 'lodash';
import type {
  Dimension,
  MetricsGridSettings,
  MetricsSort,
  UnifiedMetricsGridProps,
} from '../../../../../types';
import { METRICS_GRID_SETTINGS_DEFAULTS } from '../../../../flyout/metrics_grid_settings_flyout/constants';
import { DEFAULT_METRICS_SORT } from '../../../../../common/constants';
import {
  type FlyoutState,
  type FlyoutTabId,
  type MetricsExperienceRestorableState,
  useRestorableState,
} from '../../../../../restorable_state';

export interface MetricsExperienceStateContextValue extends MetricsExperienceRestorableState {
  profileId: string;
  gridSettings: MetricsGridSettings;
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

const EMPTY_RECENT_METRICS: readonly string[] = [];

export function MetricsExperienceStateProvider({
  children,
  profileId,
  gridSettings = METRICS_GRID_SETTINGS_DEFAULTS,
  onGridSettingsChange,
  getRecentlyExploredMetrics,
  discoverFetch$,
  onMetricExplored,
}: {
  children: React.ReactNode;
  profileId: string;
  gridSettings?: MetricsGridSettings;
  onGridSettingsChange?: (update: Partial<MetricsGridSettings>) => void;
  getRecentlyExploredMetrics?: () => readonly string[];
  discoverFetch$?: UnifiedMetricsGridProps['fetch$'];
  onMetricExplored?: (metricUniqueKey: string) => void;
}) {
  const [currentPage, setCurrentPage] = useRestorableState('currentPage', 0);
  const [selectedDimensions, setSelectedDimensions] = useRestorableState('selectedDimensions', []);
  const [searchTerm, setSearchTerm] = useRestorableState('searchTerm', '');
  const [isFullscreen, setIsFullscreen] = useRestorableState('isFullscreen', false);
  const [flyoutState, setFlyoutState] = useRestorableState('flyoutState', undefined);
  const [metricsSort, setMetricsSort] = useRestorableState('metricsSort', DEFAULT_METRICS_SORT);

  // Recency snapshot: read fresh from storage on mount and re-sampled only on the triggers
  // below, so the "Recently explored" order stays stable while the user interacts or paginates.
  const [recentlyExploredMetrics, setRecentlyExploredMetrics] = useState<readonly string[]>(
    () => getRecentlyExploredMetrics?.() ?? EMPTY_RECENT_METRICS
  );

  const refreshRecentlyExplored = useCallback(() => {
    setRecentlyExploredMetrics((prev) => {
      const next = getRecentlyExploredMetrics?.() ?? EMPTY_RECENT_METRICS;
      // Keep the previous reference when unchanged to avoid a needless re-sort.
      return isEqual(prev, next) ? prev : next;
    });
  }, [getRecentlyExploredMetrics]);

  // Grid triggers: sort, search and dimensions changes.
  useEffect(refreshRecentlyExplored, [
    refreshRecentlyExplored,
    metricsSort,
    searchTerm,
    selectedDimensions,
  ]);

  // Discover triggers: ES|QL query executed and time range changes.
  useEffect(() => {
    const subscription = discoverFetch$?.subscribe(() => refreshRecentlyExplored());
    return () => subscription?.unsubscribe();
  }, [discoverFetch$, refreshRecentlyExplored]);

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

  const onMetricsSortChange = useCallback(
    (nextSort: MetricsSort) => {
      setMetricsSort((prevSort) => {
        const [prevSortBy, prevDirection] = prevSort;
        const [nextSortBy, nextDirection] = nextSort;
        if (prevSortBy !== nextSortBy || prevDirection !== nextDirection) {
          setCurrentPage(0);
        }
        return nextSort;
      });
    },
    [setMetricsSort, setCurrentPage]
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
        metricsSort,
        flyoutState,
        onPageChange,
        onDimensionsChange,
        onSearchTermChange,
        onMetricsSortChange,
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
