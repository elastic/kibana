/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import { useFetch } from '@kbn/unified-histogram';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  euiScrollBarStyles,
  useEuiTheme,
  type EuiFlexGridProps,
} from '@elastic/eui';
import { Subject } from 'rxjs';
import { FIELD_VALUE_SEPARATOR } from '../common/utils';
import { MetricsGrid } from './metrics_grid';
import { Pagination } from './pagination';
import { usePaginatedFields, useMetricFieldsQuery, useMetricsGridState } from '../hooks';
import { MetricsGridHeader } from './metrics_grid_header';
import { EmptyState } from './empty_state/empty_state';

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
}: ChartSectionProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const { currentPage, dimensions, valueFilters, onPageChange } = useMetricsGridState();
  const { getTimeRange, updateTimeRange } = requestParams;
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const input$ = useMemo(
    () => originalInput$ ?? new Subject<UnifiedHistogramInputMessage>(),
    [originalInput$]
  );

  const discoverFetch$ = useFetch({
    input$,
    beforeFetch: updateTimeRange,
  });

  const indexPattern = useMemo(() => dataView?.getIndexPattern() ?? 'metrics-*', [dataView]);
  const { data: fields = [], isLoading } = useMetricFieldsQuery({
    index: indexPattern,
    timeRange: getTimeRange(),
  });

  const {
    currentPageFields = [],
    totalPages = 0,
    dimensions: appliedDimensions = [],
  } = usePaginatedFields({
    fields,
    dimensions,
    pageSize: 20,
    currentPage,
    searchTerm: debouncedSearchTerm,
  }) ?? {};

  const columns = useMemo<EuiFlexGridProps['columns']>(
    () => Math.min(currentPageFields.length, 4) as EuiFlexGridProps['columns'],
    [currentPageFields]
  );

  const filters = useMemo(() => {
    if (!valueFilters || valueFilters.length === 0) {
      return [];
    }

    return valueFilters
      .map((selectedValue) => {
        const [field, value] = selectedValue.split(`${FIELD_VALUE_SEPARATOR}`);
        return {
          field,
          value,
        };
      })
      .filter((filter) => filter.field !== '');
  }, [valueFilters]);

  if (fields.length === 0) {
    return (
      <MetricsGridHeader
        indexPattern={indexPattern}
        renderToggleActions={renderToggleActions}
        chartToolbarCss={chartToolbarCss}
        requestParams={requestParams}
        setDebouncedSearchTerm={setDebouncedSearchTerm}
        fields={fields}
      >
        <EmptyState isLoading={isLoading} />
      </MetricsGridHeader>
    );
  }

  return (
    <MetricsGridHeader
      indexPattern={indexPattern}
      renderToggleActions={renderToggleActions}
      chartToolbarCss={chartToolbarCss}
      requestParams={requestParams}
      setDebouncedSearchTerm={setDebouncedSearchTerm}
      fields={fields}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        tabIndex={-1}
        data-test-subj="unifiedMetricsExperienceRendered"
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
          {isLoading ? (
            <EuiLoadingSpinner size="s" />
          ) : (
            <EuiText size="s">
              <strong>
                {i18n.translate('metricsExperience.grid.metricsCount.label', {
                  defaultMessage: '{count} {count, plural, one {metric} other {metrics}}',
                  values: { count: currentPageFields.length },
                })}
              </strong>
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow>
          <MetricsGrid
            pivotOn="metric"
            columns={columns}
            dimensions={appliedDimensions}
            filters={filters}
            services={services}
            fields={currentPageFields}
            searchSessionId={searchSessionId}
            onBrushEnd={onBrushEnd}
            onFilter={onFilter}
            discoverFetch$={discoverFetch$}
            requestParams={requestParams}
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
    </MetricsGridHeader>
  );
};
