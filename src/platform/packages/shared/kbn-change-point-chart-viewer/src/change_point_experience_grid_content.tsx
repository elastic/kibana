/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  euiScrollBarStyles,
  useEuiTheme,
  type EuiFlexGridProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { Pagination } from './components/pagination';
import { ChangePointLensChart } from './components/change_point_lens_chart';
import { CHANGE_POINT_CHART_PAGE_SIZE } from './constants';
import { usePagination } from './hooks/use_pagination';
import type { UnifiedChangePointGridProps } from './types';
import type { ChangePointCardModel } from './utils/derive_change_point_cards';

interface ChangePointExperienceGridContentProps extends UnifiedChangePointGridProps {
  displayedCards: ChangePointCardModel[];
  currentPage: number;
  onPageChange: (page: number) => void;
  seriesColumns: { valueColumn: string; timeColumn: string } | undefined;
}

export const ChangePointExperienceGridContent: React.FC<ChangePointExperienceGridContentProps> = ({
  fetchParams,
  fetch$,
  services,
  onBrushEnd,
  onFilter,
  actions,
  histogramCss,
  displayedCards,
  currentPage,
  onPageChange,
  seriesColumns,
}) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const { currentPageItems, totalPages, totalCount } = usePagination({
    items: displayedCards,
    pageSize: CHANGE_POINT_CHART_PAGE_SIZE,
    currentPage,
  });

  const columns = useMemo<NonNullable<EuiFlexGridProps['columns']>>(
    () => Math.min(Math.max(totalCount, 1), 4) as NonNullable<EuiFlexGridProps['columns']>,
    [totalCount]
  );

  if (!seriesColumns || !displayedCards.length) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      tabIndex={-1}
      data-test-subj="changePointExperienceRendered"
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
        <EuiText size="s">
          <strong>
            {i18n.translate('changePointChartViewer.grid.seriesCount', {
              defaultMessage: '{count, plural, one {# series} other {# series}}',
              values: { count: totalCount },
            })}
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiFlexGrid
          gutterSize="s"
          columns={columns}
          css={css`
            grid-template-columns: repeat(${columns}, 1fr);
          `}
        >
          {currentPageItems.map((card, i) => (
            <EuiFlexItem key={card.id}>
              <ChangePointLensChart
                card={card}
                cardIndex={currentPage * CHANGE_POINT_CHART_PAGE_SIZE + i}
                valueColumn={seriesColumns.valueColumn}
                timeColumn={seriesColumns.timeColumn}
                services={services}
                fetchParams={fetchParams}
                fetch$={fetch$}
                onBrushEnd={onBrushEnd}
                onFilter={onFilter}
                actions={actions}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Pagination totalPages={totalPages} currentPage={currentPage} onPageChange={onPageChange} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
