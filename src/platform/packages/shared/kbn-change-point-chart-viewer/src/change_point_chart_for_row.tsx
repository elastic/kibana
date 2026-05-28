/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getChangePointSeriesColumns } from '@kbn/esql-utils';
import { ChangePointLensChart } from './components/change_point_lens_chart';
import { buildChangePointCards, getCardForRow } from './utils/derive_change_point_cards';
import { getEsqlQuery } from './utils/get_esql_query';
import type { UnifiedChangePointGridProps } from './types';

export interface ChangePointChartForRowProps
  extends Pick<
    UnifiedChangePointGridProps,
    'services' | 'fetchParams' | 'fetch$' | 'onBrushEnd' | 'onFilter' | 'actions'
  > {
  row: Readonly<Record<string, unknown>>;
}

/**
 * Renders the change point mini chart for a single result row.
 * Matches the row to its card by entity values and delegates rendering to
 * {@link ChangePointLensChart}. Renders an empty state when the table is not
 * yet available or no matching card can be found.
 */
export const ChangePointChartForRow: React.FC<ChangePointChartForRowProps> = ({
  fetchParams,
  fetch$,
  services,
  onBrushEnd,
  onFilter,
  actions,
  row,
}) => {
  const esql = useMemo(() => getEsqlQuery(fetchParams.query), [fetchParams.query]);

  // Memoized on (table, esql) — only re-runs when a new Discover fetch delivers new data.
  const cards = useMemo(
    () => buildChangePointCards({ table: fetchParams.table, esql: esql ?? '' }),
    [esql, fetchParams.table]
  );

  const seriesColumns = useMemo(
    () => (esql ? getChangePointSeriesColumns(esql) : undefined),
    [esql]
  );

  const card = useMemo(() => (cards ? getCardForRow(cards, row) : undefined), [cards, row]);

  if (!card || !seriesColumns) {
    return (
      <EuiEmptyPrompt
        iconType="visLine"
        title={
          <h3>
            {i18n.translate('changePointChartViewer.flyout.noChartTitle', {
              defaultMessage: 'No change point chart available',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('changePointChartViewer.flyout.noChartBody', {
              defaultMessage: 'The change point chart for this row could not be loaded.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <ChangePointLensChart
      card={card}
      cardIndex={0}
      valueColumn={seriesColumns.valueColumn}
      timeColumn={seriesColumns.timeColumn}
      services={services}
      fetchParams={fetchParams}
      fetch$={fetch$}
      onBrushEnd={onBrushEnd}
      onFilter={onFilter}
      actions={actions}
    />
  );
};
