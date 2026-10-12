/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDelayRender, EuiEmptyPrompt, EuiSkeletonText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ChartSectionTemplate } from '@kbn/unified-histogram';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ChangePointExperienceGridContent } from './change_point_experience_grid_content';
import { CHANGE_POINT_CHART_PAGE_SIZE } from './constants';
import type { UnifiedChangePointGridProps } from './types';
import { useChangePointCards } from './hooks/use_change_point_cards';
import { getChangePointLensConfig } from './utils/get_change_point_lens_config';

export const ChangePointExperienceGrid: React.FC<UnifiedChangePointGridProps> = (props) => {
  const {
    actions,
    renderToggleActions,
    chartToolbarCss,
    isChartLoading,
    isComponentVisible = true,
    fetchParams,
  } = props;

  const { euiTheme } = useEuiTheme();
  const { cards, seriesColumns } = useChangePointCards(fetchParams);

  const [currentPage, setCurrentPage] = useState(0);

  // Reset to page 0 whenever the card set changes (new query result).
  // Intentionally in render (not useEffect) so the reset lands before the next paint,
  // preventing a flash where the user briefly sees the wrong page with new cards.
  const prevCardsRef = useRef(cards);
  if (prevCardsRef.current !== cards) {
    prevCardsRef.current = cards;
    setCurrentPage(0);
  }

  const hasTableRows = Boolean(fetchParams.table?.rows?.length);
  const canRenderChangePointCharts = Boolean(cards?.length);

  const showLoading = Boolean(isChartLoading) && !hasTableRows;
  const showNoData = !isChartLoading && !hasTableRows;
  const showNoSeries =
    !isChartLoading && hasTableRows && (!seriesColumns || !canRenderChangePointCharts);

  const toolbarToggleActions = useMemo(() => renderToggleActions(), [renderToggleActions]);

  const onAddPageToDashboard = useCallback(() => {
    if (!actions?.addPageToDashboard || !seriesColumns || !cards?.length) {
      return;
    }

    const pageStart = currentPage * CHANGE_POINT_CHART_PAGE_SIZE;
    const pageCards = cards.slice(pageStart, pageStart + CHANGE_POINT_CHART_PAGE_SIZE);
    actions.addPageToDashboard(
      pageCards.map((card) => ({
        config: getChangePointLensConfig({
          card,
          timeColumn: seriesColumns.timeColumn,
          valueColumn: seriesColumns.valueColumn,
          annotationColor: euiTheme.colors.danger,
        }),
        description: card.entityDescription,
      }))
    );
  }, [actions, cards, currentPage, euiTheme.colors.danger, seriesColumns]);

  const addToDashboardAction = useMemo(() => {
    if (
      !actions?.addPageToDashboard ||
      isChartLoading ||
      showNoData ||
      showNoSeries ||
      !seriesColumns ||
      !cards?.length
    ) {
      return;
    }

    return {
      label: i18n.translate('changePointChartViewer.actions.addToDashboard', {
        defaultMessage: 'Add to dashboard',
      }),
      toolTipContent: i18n.translate('changePointChartViewer.actions.addToDashboardTooltip', {
        defaultMessage: 'Add the charts on this page to a dashboard',
      }),
      iconType: 'addToDashboard',
      onClick: onAddPageToDashboard,
      'data-test-subj': 'changePointAddPageToDashboard',
    };
  }, [
    actions?.addPageToDashboard,
    cards?.length,
    isChartLoading,
    onAddPageToDashboard,
    seriesColumns,
    showNoData,
    showNoSeries,
  ]);

  return (
    <div
      css={css`
        height: ${isComponentVisible ? '100%' : 0};
        visibility: ${isComponentVisible ? 'visible' : 'hidden'};
        overflow: hidden;
      `}
    >
      <ChartSectionTemplate
        id="changePointExperienceGrid"
        toolbarCss={chartToolbarCss}
        toolbar={{
          toggleActions: toolbarToggleActions,
          rightSide: addToDashboardAction ? [addToDashboardAction] : undefined,
        }}
      >
        {showLoading ? (
          <EuiDelayRender delay={300}>
            <EuiSkeletonText lines={4} />
          </EuiDelayRender>
        ) : null}
        {showNoData ? (
          <EuiEmptyPrompt
            title={
              <h2>
                {i18n.translate('changePointChartViewer.empty.noDataTitle', {
                  defaultMessage: 'No results yet',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('changePointChartViewer.empty.noDataBody', {
                  defaultMessage: 'Run your ES|QL query to load the Discover table.',
                })}
              </p>
            }
          />
        ) : null}
        {showNoSeries ? (
          <EuiEmptyPrompt
            title={
              <h2>
                {i18n.translate('changePointChartViewer.empty.title', {
                  defaultMessage: 'No change point series to chart',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('changePointChartViewer.empty.body', {
                  defaultMessage: 'No change points detected.',
                })}
              </p>
            }
          />
        ) : null}
        {!showLoading &&
        !showNoData &&
        !showNoSeries &&
        seriesColumns &&
        canRenderChangePointCharts ? (
          <ChangePointExperienceGridContent
            {...props}
            displayedCards={cards!}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            seriesColumns={seriesColumns}
          />
        ) : null}
      </ChartSectionTemplate>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default ChangePointExperienceGrid;
