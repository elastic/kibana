/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import { keys } from '@elastic/eui';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ } from '../../../common/constants';
import { useMetricsExperienceState } from './context/metrics_experience_state_provider';
import { ChartsGrid } from '../../charts_grid';
import { EmptyState } from '../../empty_state/empty_state';
import { useToolbarActions } from '../../toolbar/hooks/use_toolbar_actions';
import { SearchButton } from '../../toolbar/right_side_actions/search_button';
import { useMetricFields } from './hooks';
import { MetricsExperienceGridContent } from './metrics_experience_grid_content';
import type { UnifiedMetricsGridProps } from '../../../types';

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
}: UnifiedMetricsGridProps) => {
  const { searchTerm, isFullscreen, onSearchTermChange, onToggleFullscreen } =
    useMetricsExperienceState();

  const { allMetricFields, visibleMetricFields, dimensions } = useMetricFields();

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
    <ChartsGrid
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
    </ChartsGrid>
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
