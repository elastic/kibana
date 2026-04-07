/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDelayRender, EuiEmptyPrompt, EuiSkeletonText } from '@elastic/eui';
import { css } from '@emotion/react';
import { ChartSectionTemplate } from '@kbn/unified-histogram';
import { getChangePointSeriesColumns } from '@kbn/esql-utils';
import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ChangePointExperienceGridContent } from './change_point_experience_grid_content';
import type { UnifiedChangePointGridProps } from './types';
import { getEsqlQuery } from './utils/get_esql_query';
import { buildChangePointCards } from './utils/derive_change_point_cards';
import { useChangePointControls } from './hooks/use_change_point_controls';

export const ChangePointExperienceGrid: React.FC<UnifiedChangePointGridProps> = (props) => {
  const {
    renderToggleActions,
    chartToolbarCss,
    isChartLoading,
    isComponentVisible = true,
    fetchParams,
    changePointLensContext$,
  } = props;

  const esql = useMemo(() => getEsqlQuery(fetchParams.query), [fetchParams.query]);

  const cards = useMemo(
    () => buildChangePointCards({ table: fetchParams.table, esql: esql ?? '' }),
    [esql, fetchParams.table]
  );

  const { displayedCards, currentPage, setCurrentPage, controlsNode } =
    useChangePointControls(cards);

  const seriesColumns = useMemo(
    () => (esql ? getChangePointSeriesColumns(esql) : undefined),
    [esql]
  );

  useEffect(() => {
    if (!changePointLensContext$) return;
    changePointLensContext$.next({
      lensAttributesByRecordId: {},
      fetchSlice: {
        relativeTimeRange: fetchParams.relativeTimeRange,
        esqlVariables: fetchParams.esqlVariables,
        searchSessionId: fetchParams.searchSessionId,
      },
    });
  }, [
    changePointLensContext$,
    fetchParams.esqlVariables,
    fetchParams.relativeTimeRange,
    fetchParams.searchSessionId,
  ]);

  const hasTableRows = Boolean(fetchParams.table?.rows?.length);
  const canRenderChangePointCharts = Boolean(cards?.length);

  const showLoading = Boolean(isChartLoading) && !hasTableRows;
  const showNoData = !isChartLoading && !hasTableRows;
  const showNoSeries =
    !isChartLoading && hasTableRows && (!seriesColumns || !canRenderChangePointCharts);

  const toolbarToggleActions = useMemo(() => renderToggleActions(), [renderToggleActions]);

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
          additionalControls: { prependRight: controlsNode },
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
                  defaultMessage:
                    'Ensure the result includes change point rows (type column is set) to see charts.',
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
            displayedCards={displayedCards}
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
