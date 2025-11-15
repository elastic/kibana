/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { keys } from '@elastic/eui';
import {
  METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ,
  METRICS_VALUES_SELECTOR_DATA_TEST_SUBJ,
} from '../common/constants';
import { useMetricsExperienceState } from '../context/metrics_experience_state_provider';
import { MetricsGridWrapper } from './metrics_grid_wrapper';
import { EmptyState } from './empty_state/empty_state';
import { useToolbarActions } from './toolbar/hooks/use_toolbar_actions';
import { SearchButton } from './toolbar/right_side_actions/search_button';
import { useMetricFieldsQuery } from '../hooks';
import { MetricsExperienceGridContent } from './metrics_experience_grid_content';

export const MetricsExperienceGrid = ({
  renderToggleActions,
  chartToolbarCss,
  histogramCss,
  onBrushEnd,
  onFilter,
  services,
  fetch$: discoverFetch$,
  fetchParams,
  isChartLoading: isDiscoverLoading,
  isComponentVisible,
}: ChartSectionProps) => {
  const { dataView, timeRange } = fetchParams;
  const { searchTerm, isFullscreen, valueFilters, onSearchTermChange, onToggleFullscreen } =
    useMetricsExperienceState();

  const indexPattern = useMemo(() => dataView?.getIndexPattern() ?? 'metrics-*', [dataView]);
  const { data: fields = [], isFetching: isFetchingAllFields } = useMetricFieldsQuery({
    index: indexPattern,
    timeRange,
  });

  const { toggleActions, leftSideActions, rightSideActions } = useToolbarActions({
    fields,
    renderToggleActions,
    fetchParams,
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

  if (fields.length === 0 && valueFilters.length === 0) {
    return <EmptyState isLoading={isFetchingAllFields} />;
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
        fields={fields}
        services={services}
        discoverFetch$={discoverFetch$}
        fetchParams={fetchParams}
        onBrushEnd={onBrushEnd}
        onFilter={onFilter}
        histogramCss={histogramCss}
        isFieldsLoading={isFetchingAllFields}
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
    const hasValuesSelector = portal.querySelector(
      `[data-test-subj*=${METRICS_VALUES_SELECTOR_DATA_TEST_SUBJ}]`
    );
    const hasSelectableList = portal.querySelector('[data-test-subj*="Selectable"]');

    if (hasBreakdownSelector || hasValuesSelector || hasSelectableList) {
      // Check if the portal is visible and has focusable content
      const style = window.getComputedStyle(portal);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return true;
      }
    }
  }
};
