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
import type { Dimension, MetricsGridSettings, MetricsSort } from '../../../../../types';
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
}: {
  children: React.ReactNode;
  profileId: string;
  gridSettings?: MetricsGridSettings;
  onGridSettingsChange?: (update: Partial<MetricsGridSettings>) => void;
}) {
  const [currentPage, setCurrentPage] = useRestorableState('currentPage', 0);
  const [selectedDimensions, setSelectedDimensions] = useRestorableState('selectedDimensions', []);
  const [searchTerm, setSearchTerm] = useRestorableState('searchTerm', '');
  const [isFullscreen, setIsFullscreen] = useRestorableState('isFullscreen', false);
  const [flyoutState, setFlyoutState] = useRestorableState('flyoutState', undefined);
  const [metricsSort, setMetricsSort] = useRestorableState('metricsSort', DEFAULT_METRICS_SORT);

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
