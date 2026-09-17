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
import { EuiIconTip, EuiLoadingChart, mathWithUnits, useEuiTheme } from '@elastic/eui';
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
import { SUMMARY_SERIES_STATUS, useChangePointSummarySeries } from './change_point_summary_series';

export interface ChangePointSummaryCellContext {
  chartSectionProps$: ChangePointChartSectionProps$;
  typeColumnId: string;
  pvalueColumnId: string;
}

interface ChangePointSummaryCellProps extends DataGridCellValueElementProps {
  context: ChangePointSummaryCellContext;
  charts: ChartsPluginStart;
}

const EMPTY_CELL_VALUE = '-';

const shouldRenderChangePointChart = (
  row: Readonly<Record<string, unknown>>,
  columnIds: ReadonlySet<string>,
  typeColumnId: string,
  pvalueColumnId: string
): boolean => {
  const hasTypedColumns = columnIds.has(typeColumnId) && columnIds.has(pvalueColumnId);
  return hasTypedColumns ? isChangePointTableRow(row, typeColumnId, pvalueColumnId) : true;
};

interface ChangePointSummaryCellInnerProps {
  row: DataGridCellValueElementProps['row'];
  charts: ChartsPluginStart;
  fetchParams: UnifiedChangePointGridProps['fetchParams'];
  data: UnifiedChangePointGridProps['services']['data'];
}

const seriesLoadErrorMessage = i18n.translate(
  'discover.contextAwareness.changePointSummaryCell.seriesLoadErrorMessage',
  {
    defaultMessage: 'Unable to load change point sparkline',
  }
);

const noSparklineDataErrorMessage = i18n.translate(
  'discover.contextAwareness.changePointSummaryCell.noSparklineDataErrorMessage',
  {
    defaultMessage: 'No sparkline data for this change point',
  }
);

const noChangePointAriaLabel = i18n.translate(
  'discover.contextAwareness.changePointSummaryCell.noChangePointAriaLabel',
  {
    defaultMessage: 'No change point',
  }
);

const getSeriesLoadErrorMessage = (reason?: string): string =>
  reason
    ? i18n.translate(
        'discover.contextAwareness.changePointSummaryCell.seriesLoadWithReasonErrorMessage',
        {
          defaultMessage: 'Unable to load change point sparkline: {reason}',
          values: { reason },
        }
      )
    : seriesLoadErrorMessage;

const ChangePointSummaryErrorIcon: FC<{ message: string }> = ({ message }) => (
  <EuiIconTip
    type="warning"
    color="danger"
    content={message}
    aria-label={message}
    iconProps={{ 'data-test-subj': 'changePointSummarySeriesError' }}
  />
);

const ChangePointSummaryEmptyValue: FC = () => (
  <span aria-label={noChangePointAriaLabel}>{EMPTY_CELL_VALUE}</span>
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

  const cards =
    seriesState.status === SUMMARY_SERIES_STATUS.IDLE ||
    seriesState.status === SUMMARY_SERIES_STATUS.UNAVAILABLE
      ? undefined
      : seriesState.cards;
  const card = useMemo(
    () => (cards?.length ? getCardForRow(cards, row.flattened) : undefined),
    [cards, row.flattened]
  );

  const annotationTime = useMemo(() => {
    if (!card || seriesState.status !== SUMMARY_SERIES_STATUS.READY || !fetchParams.table)
      return undefined;
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
    if (!card || seriesState.status !== SUMMARY_SERIES_STATUS.READY) return undefined;
    const entityKey = getEntityKey(row.flattened, seriesState.entityColumnIds);
    return seriesState.seriesByEntity.get(entityKey);
  }, [card, row.flattened, seriesState]);

  if (seriesState.status === SUMMARY_SERIES_STATUS.IDLE) {
    return <EuiLoadingChart size="m" />;
  }

  if (seriesState.status === SUMMARY_SERIES_STATUS.LOADING) {
    return cards !== undefined && !card ? (
      <ChangePointSummaryErrorIcon message={noSparklineDataErrorMessage} />
    ) : (
      <EuiLoadingChart size="m" />
    );
  }

  if (seriesState.status === SUMMARY_SERIES_STATUS.UNAVAILABLE) {
    return <ChangePointSummaryErrorIcon message={seriesLoadErrorMessage} />;
  }

  if (seriesState.status === SUMMARY_SERIES_STATUS.ERROR) {
    return (
      <ChangePointSummaryErrorIcon message={getSeriesLoadErrorMessage(seriesState.error.message)} />
    );
  }

  if (card && points && points.length > 0) {
    return (
      <ChangePointSummaryChart charts={charts} points={points} annotationTime={annotationTime} />
    );
  }

  return <ChangePointSummaryErrorIcon message={noSparklineDataErrorMessage} />;
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
  let content: React.ReactNode;
  if (!fetchParams || !columnIds) {
    content = <EuiLoadingChart size="m" />;
  } else if (
    !shouldRenderChangePointChart(
      row.flattened,
      columnIds,
      context.typeColumnId,
      context.pvalueColumnId
    )
  ) {
    content = <ChangePointSummaryEmptyValue />;
  } else if (!chartSectionProps?.services.data) {
    content = <ChangePointSummaryErrorIcon message={seriesLoadErrorMessage} />;
  } else {
    content = (
      <ChangePointSummaryCellInner
        row={row}
        charts={charts}
        fetchParams={fetchParams}
        data={chartSectionProps.services.data}
      />
    );
  }

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
      {content}
    </div>
  );
};
