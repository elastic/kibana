/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  euiScrollBarStyles,
  useEuiTheme,
  type EuiFlexGridProps,
} from '@elastic/eui';

import type { MetricField, UnifiedMetricsGridProps } from '../../../types';
import { PAGE_SIZE } from '../../../common/constants';
import { MetricsGrid } from './metrics_grid';
import { Pagination } from '../../pagination';
import { usePagination } from './hooks';
import { MetricsGridLoadingProgress } from '../../empty_state/empty_state';
import { useMetricsExperienceState } from './context/metrics_experience_state_provider';
import { useMetricsExperienceFieldsContext } from './context/metrics_experience_fields_provider';

export interface MetricsExperienceGridContentProps
  extends Pick<
    UnifiedMetricsGridProps,
    'services' | 'fetchParams' | 'onBrushEnd' | 'onFilter' | 'actions' | 'histogramCss'
  > {
  discoverFetch$: UnifiedMetricsGridProps['fetch$'];
  fields: MetricField[];
  isDiscoverLoading?: boolean;
}

export const MetricsExperienceGridContent = ({
  fields,
  services,
  discoverFetch$,
  fetchParams,
  onBrushEnd,
  onFilter,
  actions,
  histogramCss,
  isDiscoverLoading = false,
}: MetricsExperienceGridContentProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const { searchTerm, currentPage, selectedDimensions, onPageChange } = useMetricsExperienceState();
  const { whereStatements } = useMetricsExperienceFieldsContext();

  const {
    currentPageItems: currentPageFields = [],
    totalPages = 0,
    totalCount: filteredFieldsCount = 0,
  } = usePagination({
    items: fields,
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
        {isDiscoverLoading && <MetricsGridLoadingProgress />}
        <MetricsGrid
          columns={columns}
          dimensions={selectedDimensions}
          services={services}
          fields={currentPageFields}
          onBrushEnd={onBrushEnd}
          actions={actions}
          onFilter={onFilter}
          discoverFetch$={discoverFetch$}
          fetchParams={fetchParams}
          searchTerm={searchTerm}
          whereStatements={whereStatements}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Pagination totalPages={totalPages} currentPage={currentPage} onPageChange={onPageChange} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
