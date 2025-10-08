/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import { useFetch } from '@kbn/unified-histogram';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
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
import { Subject } from 'rxjs';
import { PAGE_SIZE } from '../common/constants';
import { MetricsGrid } from './metrics_grid';
import { Pagination } from './pagination';
import {
  usePaginatedFields,
  useMetricFieldsQuery,
  useMetricsGridState,
  useValueFilters,
} from '../hooks';
import { MetricsGridWrapper } from './metrics_grid_wrapper';
import { ChartLoadingProgress, EmptyState } from './empty_state/empty_state';

export const MetricsExperienceGrid = ({
  dataView,
  renderToggleActions,
  chartToolbarCss,
  histogramCss,
  onBrushEnd,
  onFilter,
  searchSessionId,
  requestParams,
  services,
  input$: originalInput$,
  isChartLoading: isDiscoverLoading,
  isComponentVisible,
  abortController,
}: ChartSectionProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const { currentPage, dimensions, valueFilters, onPageChange, searchTerm } = useMetricsGridState();
  const { getTimeRange, updateTimeRange } = requestParams;

  const input$ = useMemo(
    () => originalInput$ ?? new Subject<UnifiedHistogramInputMessage>(),
    [originalInput$]
  );

  const discoverFetch$ = useFetch({
    input$,
    beforeFetch: updateTimeRange,
  });

  const indexPattern = useMemo(() => dataView?.getIndexPattern() ?? 'metrics-*', [dataView]);
  const { data: fields = [], isFetching: isFieldsLoading } = useMetricFieldsQuery({
    index: indexPattern,
    timeRange: getTimeRange(),
  });

  const {
    currentPageFields = [],
    totalPages = 0,
    filteredFieldsBySearch = [],
  } = usePaginatedFields({
    fields,
    dimensions,
    pageSize: PAGE_SIZE,
    currentPage,
    searchTerm,
  }) ?? {};

  const columns = useMemo<EuiFlexGridProps['columns']>(
    () => Math.min(currentPageFields.length, 4) as EuiFlexGridProps['columns'],
    [currentPageFields]
  );

  const filters = useValueFilters(valueFilters);

  if (fields.length === 0) {
    return <EmptyState isLoading={isFieldsLoading} />;
  }

  return (
    <MetricsGridWrapper
      indexPattern={indexPattern}
      renderToggleActions={renderToggleActions}
      chartToolbarCss={chartToolbarCss}
      requestParams={requestParams}
      fields={fields}
      isComponentVisible={isComponentVisible}
    >
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
              {isFieldsLoading ? (
                <EuiLoadingSpinner size="s" />
              ) : (
                <EuiText size="s">
                  <strong>
                    {i18n.translate('metricsExperience.grid.metricsCount.label', {
                      defaultMessage: '{count} {count, plural, one {metric} other {metrics}}',
                      values: { count: filteredFieldsBySearch.length },
                    })}
                  </strong>
                </EuiText>
              )}
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
          {isDiscoverLoading && <ChartLoadingProgress />}
          <MetricsGrid
            pivotOn="metric"
            columns={columns}
            dimensions={dimensions}
            filters={filters}
            services={services}
            fields={currentPageFields}
            searchSessionId={searchSessionId}
            onBrushEnd={onBrushEnd}
            onFilter={onFilter}
            discoverFetch$={discoverFetch$}
            requestParams={requestParams}
            abortController={abortController}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Pagination
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={onPageChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </MetricsGridWrapper>
  );
};
