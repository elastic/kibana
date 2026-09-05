/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { buildChangePointCards } from '@kbn/change-point-chart-viewer';
import type { UnifiedChangePointGridProps } from '@kbn/change-point-chart-viewer';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { ChangePointSummaryCell } from './change_point_summary_cell';
import type {
  ChangePointChartSectionProps$,
  ChangePointChartSectionSnapshot,
} from './change_point_context';
import type { ChangePointSummarySeriesState } from './change_point_summary_series';

jest.mock('./change_point_summary_chart', () => ({
  ChangePointSummaryChart: ({
    points,
    annotationTime,
  }: {
    points: Array<{ x: number; y: number }>;
    annotationTime?: number;
  }) => (
    <div
      data-test-subj="changePointSummaryChartMock"
      data-points={points.length}
      data-annotation={annotationTime ?? ''}
    />
  ),
}));

const mockUseChangePointSummarySeries = jest.fn();

jest.mock('./change_point_summary_series', () => {
  const actual = jest.requireActual('./change_point_summary_series');
  return {
    ...actual,
    useChangePointSummarySeries: (...args: unknown[]) => mockUseChangePointSummarySeries(...args),
  };
});

const ESQL_NO_BY =
  'FROM idx | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket';

const ESQL_WITH_HOST_BY =
  'FROM idx | STATS avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket BY host';

const SERIES_ROW = {
  bucket: '2023-11-14T00:00:00.000Z',
  avg_bytes: 12,
  type: '',
  pvalue: null,
};

const CHANGE_POINT_ROW = {
  bucket: '2023-11-15T00:00:00.000Z',
  avg_bytes: 14,
  type: 'mean_shift',
  pvalue: 0.001,
};

const NO_BY_ROWS = [SERIES_ROW, CHANGE_POINT_ROW];

const COLUMNS_NO_BY: Datatable['columns'] = [
  { id: 'bucket', name: 'bucket', meta: { type: 'date' } },
  { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' } },
  { id: 'type', name: 'type', meta: { type: 'string' } },
  { id: 'pvalue', name: 'pvalue', meta: { type: 'number' } },
];

const makeTable = (
  rows: Datatable['rows'],
  columns: Datatable['columns'] = COLUMNS_NO_BY
): Datatable => ({
  type: 'datatable',
  columns,
  rows,
});

describe('ChangePointSummaryCell', () => {
  const charts = {
    theme: { useChartsBaseTheme: () => ({}) },
  } as unknown as ChartsPluginStart;

  const setCellProps = jest.fn();

  const seriesPoints = [
    { x: Date.parse(SERIES_ROW.bucket), y: 12 },
    { x: Date.parse(CHANGE_POINT_ROW.bucket), y: 14 },
  ];

  const gridProps = (flattened: Record<string, unknown>): DataGridCellValueElementProps =>
    ({
      row: { id: '1', raw: {}, flattened },
      dataView: {},
      columnId: '_source',
      isDetails: false,
      isExpanded: false,
      fieldFormats: {},
      closePopover: jest.fn(),
      setCellProps,
    } as unknown as DataGridCellValueElementProps);

  const cellContext = (chartSectionProps$: ChangePointChartSectionProps$) => ({
    chartSectionProps$,
    typeColumnId: 'type',
    pvalueColumnId: 'pvalue',
  });

  beforeEach(() => {
    setCellProps.mockClear();
    mockUseChangePointSummarySeries.mockClear();
  });

  const renderCell = ({
    flattened,
    table,
    esql = ESQL_NO_BY,
    seriesState,
  }: {
    flattened: Record<string, unknown>;
    table: Datatable;
    esql?: string;
    seriesState?: ChangePointSummarySeriesState;
  }) => {
    mockUseChangePointSummarySeries.mockReturnValue(
      seriesState ?? {
        status: 'ready',
        entityColumnIds: [],
        timeColumn: 'bucket',
        valueColumn: 'avg_bytes',
        seriesByEntity: new Map([['', seriesPoints]]),
        cards: buildChangePointCards({ table, esql }),
      }
    );

    const fetchParams = {
      table,
      query: { esql },
      dataView: { isTimeBased: () => false },
      filters: [],
      timeRange: { from: 'now-1d', to: 'now' },
      searchSessionId: 's1',
      lastReloadRequestTime: 1,
    } as unknown as UnifiedChangePointGridProps['fetchParams'];

    const chartSectionProps$ = new BehaviorSubject<ChangePointChartSectionSnapshot | undefined>({
      fetchParams,
      fetch$: new BehaviorSubject(undefined) as never,
      services: { data: { search: { esql: jest.fn() } } } as never,
      onBrushEnd: undefined,
      onFilter: undefined,
    });

    return render(
      <ChangePointSummaryCell
        {...gridProps(flattened)}
        context={cellContext(chartSectionProps$)}
        charts={charts}
      />
    );
  };

  it('renders the sparkline for a change-point row', () => {
    renderCell({ flattened: CHANGE_POINT_ROW, table: makeTable(NO_BY_ROWS) });

    expect(setCellProps).not.toHaveBeenCalled();
    const chart = screen.getByTestId('changePointSummaryChartMock');
    expect(chart).toHaveAttribute('data-points', '2');
    expect(chart).toHaveAttribute('data-annotation', String(Date.parse(CHANGE_POINT_ROW.bucket)));
  });

  it('does not subscribe to the series hook for a non-change-point row', () => {
    renderCell({ flattened: SERIES_ROW, table: makeTable(NO_BY_ROWS) });

    expect(mockUseChangePointSummarySeries).not.toHaveBeenCalled();
    expect(screen.queryByTestId('changePointSummaryChartMock')).not.toBeInTheDocument();
  });

  it('subscribes for every row when type and pvalue columns are absent from the table', () => {
    const columns = COLUMNS_NO_BY.filter((c) => c.id !== 'type' && c.id !== 'pvalue');
    renderCell({ flattened: SERIES_ROW, table: makeTable([SERIES_ROW], columns) });

    expect(mockUseChangePointSummarySeries).toHaveBeenCalled();
  });

  it('renders nothing when the shared series is idle', () => {
    renderCell({
      flattened: CHANGE_POINT_ROW,
      table: makeTable([CHANGE_POINT_ROW]),
      seriesState: { status: 'idle' },
    });

    expect(screen.queryByTestId('changePointSummaryChartMock')).not.toBeInTheDocument();
    expect(document.querySelector('.euiLoadingChart')).not.toBeInTheDocument();
  });

  it('shows a loading indicator, not a chart, while the shared series is loading', () => {
    const table = makeTable([CHANGE_POINT_ROW]);
    renderCell({
      flattened: CHANGE_POINT_ROW,
      table,
      seriesState: {
        status: 'loading',
        cards: buildChangePointCards({ table, esql: ESQL_NO_BY }),
      },
    });

    expect(screen.queryByTestId('changePointSummaryChartMock')).not.toBeInTheDocument();
    expect(document.querySelector('.euiLoadingChart')).toBeInTheDocument();
  });

  it('renders a compact error icon when the shared series is in error', () => {
    const table = makeTable([CHANGE_POINT_ROW]);
    renderCell({
      flattened: CHANGE_POINT_ROW,
      table,
      seriesState: {
        status: 'error',
        error: new Error('esql failed'),
        entityColumnIds: [],
        cards: buildChangePointCards({ table, esql: ESQL_NO_BY }),
      },
    });

    expect(screen.getByTestId('changePointSummarySeriesError')).toBeInTheDocument();
    expect(screen.getByText('Unable to load change point sparkline')).toBeInTheDocument();
    expect(screen.queryByText('esql failed')).not.toBeInTheDocument();
    expect(screen.queryByTestId('changePointSummaryChartMock')).not.toBeInTheDocument();
    expect(document.querySelector('.euiLoadingChart')).not.toBeInTheDocument();
  });

  it('looks up the BY entity series for the row', () => {
    const row = { host: 'a', ...CHANGE_POINT_ROW };
    const table = makeTable(
      [row],
      [{ id: 'host', name: 'host', meta: { type: 'string' } }, ...COLUMNS_NO_BY]
    );
    renderCell({
      flattened: row,
      table,
      esql: ESQL_WITH_HOST_BY,
      seriesState: {
        status: 'ready',
        entityColumnIds: ['host'],
        timeColumn: 'bucket',
        valueColumn: 'avg_bytes',
        seriesByEntity: new Map([
          ['host=a', seriesPoints],
          ['host=b', [{ x: 1, y: 1 }]],
        ]),
        cards: buildChangePointCards({ table, esql: ESQL_WITH_HOST_BY }),
      },
    });

    expect(screen.getByTestId('changePointSummaryChartMock')).toHaveAttribute('data-points', '2');
  });

  it('annotates using a fallback date column when the ON timestamp is null', () => {
    const row = {
      bucket: null,
      other_date: '2023-11-16T00:00:00.000Z',
      avg_bytes: 14,
      type: 'mean_shift',
      pvalue: 0.001,
    };
    const table = makeTable(
      [row],
      [
        { id: 'bucket', name: 'bucket', meta: { type: 'date' } },
        { id: 'other_date', name: 'other_date', meta: { type: 'date' } },
        { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' } },
        { id: 'type', name: 'type', meta: { type: 'string' } },
        { id: 'pvalue', name: 'pvalue', meta: { type: 'number' } },
      ]
    );
    renderCell({
      flattened: row,
      table,
      seriesState: {
        status: 'ready',
        entityColumnIds: [],
        timeColumn: 'bucket',
        valueColumn: 'avg_bytes',
        seriesByEntity: new Map([['', seriesPoints]]),
        cards: buildChangePointCards({ table, esql: ESQL_NO_BY }),
      },
    });

    expect(screen.getByTestId('changePointSummaryChartMock')).toHaveAttribute(
      'data-annotation',
      String(Date.parse(row.other_date))
    );
  });

  it('does not subscribe when chart section props are not yet available', () => {
    const chartSectionProps$ = new BehaviorSubject<ChangePointChartSectionSnapshot | undefined>(
      undefined
    );

    render(
      <ChangePointSummaryCell
        {...gridProps(CHANGE_POINT_ROW)}
        context={cellContext(chartSectionProps$)}
        charts={charts}
      />
    );

    expect(mockUseChangePointSummarySeries).not.toHaveBeenCalled();
    expect(screen.queryByTestId('changePointSummaryChartMock')).not.toBeInTheDocument();
  });
});
