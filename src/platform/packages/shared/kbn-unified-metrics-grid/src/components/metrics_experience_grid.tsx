/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { keys } from '@elastic/eui';
import { usePerformanceContext } from '@kbn/ebt-tools';
import {
  METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ,
  MAX_DIMENSIONS_SELECTIONS,
} from '../common/constants';
import { useMetricsExperienceState } from '../context/metrics_experience_state_provider';
import { MetricsGridWrapper } from './metrics_grid_wrapper';
import { EmptyState } from './empty_state/empty_state';
import { useToolbarActions } from './toolbar/hooks/use_toolbar_actions';
import { SearchButton } from './toolbar/right_side_actions/search_button';
import { useMetricFields } from '../hooks';
import { MetricsExperienceGridContent } from './metrics_experience_grid_content';
import type { UnifiedMetricsGridProps } from '../types';

export const MetricsExperienceGrid = ({
  renderToggleActions,
  chartToolbarCss,
  histogramCss,
  onBrushEnd,
  onFilter,
  actions,
  services,
  fetch$: discoverFetch$,
  fetchParams,
  isChartLoading: isDiscoverLoading,
  isComponentVisible,
  breakdownField,
}: UnifiedMetricsGridProps) => {
  const {
    searchTerm,
    isFullscreen,
    onSearchTermChange,
    onToggleFullscreen,
    selectedDimensions,
    onDimensionsChange,
  } = useMetricsExperienceState();

  const { allMetricFields, visibleMetricFields, dimensions } = useMetricFields();

  // Track previous breakdownField to avoid unnecessary updates and detect clearing
  // Initialize to undefined so effect runs on initial mount if breakdownField is set
  const prevBreakdownFieldRef = useRef<string | undefined>(undefined);
  const hasInitializedRef = useRef(false);

  // Sync breakdownField from Discover's sidebar "Add Breakdown" action to selectedDimensions
  useEffect(() => {
    // Skip if breakdownField hasn't changed (but allow initial mount to proceed)
    if (prevBreakdownFieldRef.current === breakdownField && hasInitializedRef.current) {
      return;
    }

    const previousBreakdownField = prevBreakdownFieldRef.current;
    prevBreakdownFieldRef.current = breakdownField;
    hasInitializedRef.current = true;

    // Case 1: breakdownField is cleared (undefined/null)
    if (!breakdownField) {
      // Clear selection if it matches the previously selected field (only if single selection)
      if (
        selectedDimensions.length === 1 &&
        selectedDimensions[0]?.name === previousBreakdownField
      ) {
        onDimensionsChange([]);
      }
      return;
    }

    // Case 2: Idempotent check - if already selected, do nothing
    const isAlreadySelected = selectedDimensions.some((d) => d.name === breakdownField);
    if (isAlreadySelected) {
      return;
    }

    // Case 3: Find the matching dimension in available dimensions
    const matchingDimension = dimensions.find((d) => d.name === breakdownField);
    if (!matchingDimension) {
      // Field not found in available dimensions - this can happen if dimensions haven't loaded yet
      // or if the field is not a valid dimension. Do nothing - will be handled by dimensions effect.
      return;
    }

    // Case 4: No previous selection - add the clicked dimension
    if (selectedDimensions.length === 0) {
      onDimensionsChange([matchingDimension]);
      return;
    }

    // Case 5: Replace existing selection (since MAX_DIMENSIONS_SELECTIONS = 1)
    // If max is 1, replace; otherwise add up to max limit
    if (MAX_DIMENSIONS_SELECTIONS === 1) {
      onDimensionsChange([matchingDimension]);
    } else {
      const newSelection = [...selectedDimensions, matchingDimension].slice(
        0,
        MAX_DIMENSIONS_SELECTIONS
      );
      onDimensionsChange(newSelection);
    }
  }, [breakdownField, dimensions, selectedDimensions, onDimensionsChange]);

  // Sync when dimensions become available (handles case where breakdownField is set before dimensions load)
  useEffect(() => {
    // Only sync if breakdownField is set, dimensions are available, and we've initialized
    if (!breakdownField || dimensions.length === 0 || !hasInitializedRef.current) {
      return;
    }

    // Check if breakdownField should be synced but wasn't because dimensions weren't ready
    const matchingDimension = dimensions.find((d) => d.name === breakdownField);
    if (!matchingDimension) {
      return;
    }

    // Idempotent check - if already selected, do nothing
    const isAlreadySelected = selectedDimensions.some((d) => d.name === breakdownField);
    if (isAlreadySelected) {
      return;
    }

    // Sync the breakdownField to selectedDimensions
    if (selectedDimensions.length === 0) {
      onDimensionsChange([matchingDimension]);
    } else if (MAX_DIMENSIONS_SELECTIONS === 1) {
      onDimensionsChange([matchingDimension]);
    } else {
      const newSelection = [...selectedDimensions, matchingDimension].slice(
        0,
        MAX_DIMENSIONS_SELECTIONS
      );
      onDimensionsChange(newSelection);
    }
  }, [breakdownField, dimensions, selectedDimensions, onDimensionsChange]);

  const { onPageReady } = usePerformanceContext();
  useEffect(() => {
    if (!isDiscoverLoading && allMetricFields.length > 0) {
      onPageReady({
        meta: {
          rangeFrom: fetchParams.timeRange?.from,
          rangeTo: fetchParams.timeRange?.to,
        },
        customMetrics: {
          key1: 'metric_experience_fields_count',
          value1: allMetricFields.length,
        },
      });
    }
  }, [
    allMetricFields.length,
    onPageReady,
    fetchParams.timeRange?.from,
    fetchParams.timeRange?.to,
    isDiscoverLoading,
  ]);

  const { toggleActions, leftSideActions, rightSideActions } = useToolbarActions({
    allMetricFields,
    dimensions,
    renderToggleActions,
    isLoading: isDiscoverLoading,
  });

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === keys.ESCAPE && isFullscreen && !areSelectorPortalsOpen()) {
        e.preventDefault();
        onToggleFullscreen?.();
      }
    },
    [isFullscreen, onToggleFullscreen]
  );

  if (allMetricFields.length === 0) {
    return <EmptyState isLoading={isDiscoverLoading} />;
  }

  return (
    <MetricsGridWrapper
      id="metricsExperienceGrid"
      toolbarCss={chartToolbarCss}
      toolbar={{
        toggleActions,
        leftSide: leftSideActions,
        rightSide: rightSideActions,
        additionalControls: {
          prependRight: (
            <SearchButton
              isFullscreen={isFullscreen}
              value={searchTerm}
              onSearchTermChange={onSearchTermChange}
              onKeyDown={onKeyDown}
              data-test-subj="metricsExperienceGridToolbarSearch"
            />
          ),
        },
      }}
      toolbarWrapAt={isFullscreen ? 'l' : 'xl'}
      isComponentVisible={isComponentVisible}
      isFullscreen={isFullscreen}
      onKeyDown={onKeyDown}
    >
      <MetricsExperienceGridContent
        fields={visibleMetricFields}
        services={services}
        discoverFetch$={discoverFetch$}
        fetchParams={fetchParams}
        onBrushEnd={onBrushEnd}
        onFilter={onFilter}
        actions={actions}
        histogramCss={histogramCss}
        isDiscoverLoading={isDiscoverLoading}
      />
    </MetricsGridWrapper>
  );
};

const areSelectorPortalsOpen = () => {
  const portals = document.querySelectorAll('[data-euiportal]');

  for (const portal of portals) {
    const hasBreakdownSelector = portal.querySelector(
      `[data-test-subj*=${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}]`
    );
    const hasSelectableList = portal.querySelector('[data-test-subj*="Selectable"]');

    if (hasBreakdownSelector || hasSelectableList) {
      // Check if the portal is visible and has focusable content
      const style = window.getComputedStyle(portal);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return true;
      }
    }
  }
};
