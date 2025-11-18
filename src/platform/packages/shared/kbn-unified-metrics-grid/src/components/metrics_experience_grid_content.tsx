/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import { useFetch } from '@kbn/unified-histogram';
import { Subject, shareReplay } from 'rxjs';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  euiScrollBarStyles,
  useEuiTheme,
  type EuiFlexGridProps,
} from '@elastic/eui';
import { PAGE_SIZE } from '../common/constants';
import { MetricsGrid } from './metrics_grid';
import { Pagination } from './pagination';
import { useFilteredMetricFields, usePagination } from '../hooks';
import { MetricsGridLoadingProgress } from './empty_state/empty_state';
import { useMetricsExperienceState } from '../context/metrics_experience_state_provider';

export interface MetricsExperienceGridContentProps
  extends Pick<
    ChartSectionProps,
    | 'timeRange'
    | 'services'
    | 'input$'
    | 'requestParams'
    | 'onBrushEnd'
    | 'onFilter'
    | 'searchSessionId'
    | 'abortController'
    | 'histogramCss'
  > {
  fields: MetricField[];
  isFieldsLoading?: boolean;
  isDiscoverLoading?: boolean;
}

export const MetricsExperienceGridContent = ({
  fields: allFields,
  timeRange,
  services,
  input$: originalInput$,
  requestParams,
  onBrushEnd,
  onFilter,
  searchSessionId,
  abortController,
  histogramCss,
  isFieldsLoading = false,
  isDiscoverLoading,
}: MetricsExperienceGridContentProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const { updateTimeRange } = requestParams;

  const input$ = useMemo(
    () => originalInput$ ?? new Subject<UnifiedHistogramInputMessage>(),
    [originalInput$]
  );

  const baseFetch$ = useFetch({
    input$,
    beforeFetch: updateTimeRange,
  });

  const discoverFetch$ = useMemo(
    // Buffer and replay emissions to child components that subscribe in later useEffects
    // without this, child components would miss emissions that occurred before they subscribed
    () => baseFetch$.pipe(shareReplay({ bufferSize: 1, refCount: false })),
    [baseFetch$]
  );

  const { searchTerm, currentPage, dimensions, valueFilters, onPageChange } =
    useMetricsExperienceState();

  const onFilterComplete = useCallback(() => {
    onPageChange(0);
  }, [onPageChange]);

  const {
    fields: filteredFields,
    filters,
    isLoading: isFilteredFieldsLoading,
  } = useFilteredMetricFields({
    allFields,
    dimensions,
    searchTerm,
    valueFilters,
    timeRange,
    onFilterComplete,
  });

  const {
    currentPageItems: currentPageFields = [],
    totalPages = 0,
    totalCount: filteredFieldsCount = 0,
  } = usePagination({
    items: filteredFields,
    pageSize: PAGE_SIZE,
    currentPage,
  }) ?? {};

  const columns = useMemo<NonNullable<EuiFlexGridProps['columns']>>(
    () => Math.min(filteredFieldsCount, 4) as NonNullable<EuiFlexGridProps['columns']>,
    [filteredFieldsCount]
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      tabIndex={-1}
      data-test-subj="metricsExperienceRendered"
      css={css`
        ${histogramCss || ''}
        height: 100%;
        overflow: auto;
        padding: ${euiTheme.size.s} ${euiTheme.size.s} 0;
        margin-block: ${euiTheme.size.xs};
        ${euiScrollBarStyles(euiThemeContext)}
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
          responsive={false}
          direction="row"
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="center"
              responsive={false}
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('metricsExperience.grid.metricsCount.label', {
                      defaultMessage: '{count} {count, plural, one {metric} other {metrics}}',
                      values: { count: filteredFieldsCount },
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              {(isFilteredFieldsLoading || isFieldsLoading) && (
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('metricsExperience.grid.technicalPreview.label', {
                defaultMessage: 'Technical preview',
              })}
              tooltipContent={i18n.translate('metricsExperience.grid.technicalPreview.tooltip', {
                defaultMessage:
                  'This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
              })}
              tooltipPosition="left"
              title={i18n.translate('metricsExperience.grid.technicalPreview.title', {
                defaultMessage: 'Technical preview',
              })}
              size="s"
              data-test-subj="metricsExperienceTechnicalPreviewBadge"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>
        {(isDiscoverLoading || isFilteredFieldsLoading) && <MetricsGridLoadingProgress />}
        <MetricsGrid
          columns={columns}
          dimensions={dimensions}
          filters={filters}
          services={services}
          fields={currentPageFields}
          searchSessionId={searchSessionId}
          onBrushEnd={onBrushEnd}
          onFilter={onFilter}
          discoverFetch$={discoverFetch$}
          timeRange={timeRange}
          abortController={abortController}
          searchTerm={searchTerm}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Pagination totalPages={totalPages} currentPage={currentPage} onPageChange={onPageChange} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
