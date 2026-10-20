/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiFlexGrid, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ChangePointLensChart, type ChangePointCardModel } from '@kbn/change-point-chart-viewer';
import type { Filter, Query } from '@kbn/es-query';
import { getChangePointSeriesColumns } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram';
import type { UnifiedHistogramFetch$ } from '@kbn/unified-histogram/types';
import React from 'react';

export const ChangePointGridRenderer = ({
  esql,
  cards,
  services,
  fetchParams,
  fetch$,
  searchContext,
}: {
  esql: string;
  cards: ChangePointCardModel[];
  services: UnifiedHistogramServices;
  fetchParams: React.ComponentProps<typeof ChangePointLensChart>['fetchParams'];
  fetch$: UnifiedHistogramFetch$;
  searchContext: {
    filters: Filter[];
    query?: Query;
  };
}) => {
  const { euiTheme } = useEuiTheme();
  const seriesColumns = getChangePointSeriesColumns(esql);
  if (!seriesColumns || cards.length === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            {i18n.translate('discover.changePointGrid.noSeriesTitle', {
              defaultMessage: 'No change point series to chart',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('discover.changePointGrid.noSeriesBody', {
              defaultMessage: 'No change points detected.',
            })}
          </p>
        }
      />
    );
  }

  const columns = Math.min(Math.max(cards.length, 1), 4) as 1 | 2 | 3 | 4;

  return (
    <EuiFlexGrid
      columns={columns}
      gutterSize="s"
      css={css`
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        /* The panel clips its contents. Inset the grid so chart outlines, which are
           drawn outside each card, stay inside the panel on every edge. */
        padding: ${euiTheme.size.s};
        overflow: auto;
        align-content: start;
        grid-template-columns: repeat(${columns}, minmax(0, 1fr));
      `}
    >
      {cards.map((card, index) => (
        <EuiFlexItem key={`${card.id}-${index}`}>
          <ChangePointLensChart
            card={card}
            cardIndex={index}
            valueColumn={seriesColumns.valueColumn}
            timeColumn={seriesColumns.timeColumn}
            services={services}
            fetchParams={fetchParams}
            fetch$={fetch$}
            showPanelActions={false}
            searchContext={searchContext}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
