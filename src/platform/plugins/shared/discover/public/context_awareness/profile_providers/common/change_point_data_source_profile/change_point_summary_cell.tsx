/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiIcon,
  EuiLoadingChart,
  EuiScreenReaderOnly,
  mathWithUnits,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getCardForRow,
  getChangePointRowTimestamp,
  getEntityKey,
  isChangePointTableRow,
} from '@kbn/change-point-chart-viewer';
import type { UnifiedChangePointGridProps } from '@kbn/change-point-chart-viewer';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { ChangePointSummaryChart } from './change_point_summary_chart';
import type { ChangePointChartSectionProps$ } from './change_point_context';
import { useChangePointSummarySeries } from './change_point_summary_series';

export interface ChangePointSummaryCellContext {
  chartSectionProps$: ChangePointChartSectionProps$;
  typeColumnId: string;
  pvalueColumnId: string;
}

interface ChangePointSummaryCellProps extends DataGridCellValueElementProps {
  context: ChangePointSummaryCellContext;
  charts: ChartsPluginStart;
}

const shouldRenderChangePointChart = (
  row: Readonly<Record<string, unknown>>,
  columnIds: ReadonlySet<string> | undefined,
  typeColumnId: string,
  pvalueColumnId: string
): boolean => {
  if (!columnIds?.size) return false;
  const hasTypedColumns = columnIds.has(typeColumnId) && columnIds.has(pvalueColumnId);
  return hasTypedColumns ? isChangePointTableRow(row, typeColumnId, pvalueColumnId) : true;
};

interface ChangePointSummaryCellInnerProps {
  row: DataGridCellValueElementProps['row'];
  charts: ChartsPluginStart;
  fetchParams: UnifiedChangePointGridProps['fetchParams'];
  data: UnifiedChangePointGridProps['services']['data'];
}

const errorLabel = i18n.translate(
  'discover.contextAwareness.changePointSummaryCell.seriesLoadErrorMessage',
  {
    defaultMessage: 'Unable to load change point sparkline',
  }
);

/**
 * Subscribes to the shared series snapshot. Mounted only for change-point rows.
 */
const ChangePointSummaryCellInner: FC<ChangePointSummaryCellInnerProps> = ({
  row,
  charts,
  fetchParams,
  data,
}) => {
  const seriesState = useChangePointSummarySeries(fetchParams, data);

  const cards = seriesState.status === 'idle' ? undefined : seriesState.cards;
  const card = useMemo(
    () => (cards?.length ? getCardForRow(cards, row.flattened) : undefined),
    [cards, row.flattened]
  );

  const annotationTime = useMemo(() => {
    if (!card || seriesState.status !== 'ready' || !fetchParams.table) return undefined;
    const iso = getChangePointRowTimestamp(
      row.flattened,
      seriesState.timeColumn,
      fetchParams.table,
      new Set([card.typeColumnId, card.pvalueColumnId, seriesState.valueColumn])
    );
    if (!iso) return undefined;
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? undefined : ms;
  }, [card, fetchParams.table, row.flattened, seriesState]);

  const points = useMemo(() => {
    if (!card || seriesState.status !== 'ready') return undefined;
    const entityKey = getEntityKey(row.flattened, seriesState.entityColumnIds);
    return seriesState.seriesByEntity.get(entityKey);
  }, [card, row.flattened, seriesState]);

  if (seriesState.status === 'idle') {
    return null;
  }

  if (seriesState.status === 'error') {
    return (
      <>
        <EuiIcon
          type="warning"
          color="danger"
          title={errorLabel}
          aria-hidden
          data-test-subj="changePointSummarySeriesError"
        />
        <EuiScreenReaderOnly>
          <span>{errorLabel}</span>
        </EuiScreenReaderOnly>
      </>
    );
  }

  if (seriesState.status === 'loading') {
    if (cards !== undefined && !card) {
      return null;
    }
    return <EuiLoadingChart size="m" />;
  }

  if (card && points && points.length > 0) {
    return (
      <ChangePointSummaryChart charts={charts} points={points} annotationTime={annotationTime} />
    );
  }

  return null;
};

/**
 * Summary-column cell: glanceable sparkline for this row's change point.
 * Non-interactive; detail lives in the Overview flyout / top Lens charts.
 */
export const ChangePointSummaryCell: FC<ChangePointSummaryCellProps> = ({
  row,
  context,
  charts,
}) => {
  const { euiTheme } = useEuiTheme();
  const fallbackHeight = useMemo(
    () => mathWithUnits(euiTheme.size.l, (l) => l * 2),
    [euiTheme.size.l]
  );

  const chartSectionProps = useObservable(
    context.chartSectionProps$,
    context.chartSectionProps$.getValue()
  );

  const fetchParams = chartSectionProps?.fetchParams;
  const columnIds = useMemo(
    () =>
      fetchParams?.table?.columns.length
        ? new Set(fetchParams.table.columns.map((c) => c.id))
        : undefined,
    [fetchParams?.table]
  );
  const showChart = shouldRenderChangePointChart(
    row.flattened,
    columnIds,
    context.typeColumnId,
    context.pvalueColumnId
  );

  return (
    <div
      css={{
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: fallbackHeight,
        overflow: 'hidden',
      }}
    >
      {showChart && fetchParams && chartSectionProps?.services.data ? (
        <ChangePointSummaryCellInner
          row={row}
          charts={charts}
          fetchParams={fetchParams}
          data={chartSectionProps.services.data}
        />
      ) : null}
    </div>
  );
};
