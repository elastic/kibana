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
import { ChartSectionTemplate, useFetch } from '@kbn/unified-histogram';
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
import { FIELD_VALUE_SEPARATOR } from '../common/utils';
import { MetricsGrid } from './metrics_grid';
import { Pagination } from './pagination';
import { usePaginatedFields, useMetricFieldsQuery, useMetricsGridState } from '../hooks';
import { useToolbarActions } from './toolbar/hooks/use_toolbar_actions';
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

  const { leftSideActions, rightSideActions } = useToolbarActions({
    fields,
    requestParams,
    indexPattern,
    renderToggleActions,
  });

  const {
    allFields = [],
    currentPageFields = [],
    totalPages = 0,
    dimensions: appliedDimensions = [],
  } = usePaginatedFields({ fields, dimensions, pageSize: 20, currentPage }) ?? {};

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
    return <EmptyState isLoading={isLoading} />;
  }

  return (
    <ChartSectionTemplate
      id="unifiedMetricsExperienceGridPanel"
      toolbarCss={chartToolbarCss}
      toolbar={{
        leftSide: leftSideActions,
        rightSide: rightSideActions,
      }}
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
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {isLoading ? (
                <EuiLoadingSpinner size="s" />
              ) : (
                <EuiText size="s">
                  <strong>
                    {i18n.translate('metricsExperience.grid.metricsCount.label', {
                      defaultMessage: '{count} metrics',
                      values: { count: allFields.length },
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
    </ChartSectionTemplate>
  );
};
