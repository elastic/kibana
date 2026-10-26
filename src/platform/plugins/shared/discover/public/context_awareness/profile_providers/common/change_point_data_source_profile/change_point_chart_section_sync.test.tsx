/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { EsqlSource } from '@kbn/data-source';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import type { UnifiedChangePointGridProps } from '@kbn/change-point-chart-viewer';
import { FetchStatus } from '../../../../application/types';
import type { DataDocumentsMsg } from '../../../../application/main/state_management/discover_data_state_container';
import type { ChangePointChartSectionProps$ } from './change_point_context';
import { ChangePointChartSectionSync } from './change_point_chart_section_sync';

const mockGrid = jest.fn((_props: Partial<UnifiedChangePointGridProps>) => null);
const mockDocuments$ = new BehaviorSubject<DataDocumentsMsg>({
  fetchStatus: FetchStatus.UNINITIALIZED,
});

jest.mock('@kbn/change-point-chart-viewer', () => ({
  LazyChangePointExperienceGrid: (props: Partial<UnifiedChangePointGridProps>) => mockGrid(props),
}));

jest.mock('../../../../application/main/state_management/redux', () => ({
  useCurrentTabDataStateContainer: () => ({
    data$: { documents$: mockDocuments$ },
  }),
}));

type FetchParams = UnifiedChangePointGridProps['fetchParams'];

const ESQL = 'FROM idx | STATS avg_bytes = AVG(bytes) BY bucket | CHANGE_POINT avg_bytes ON bucket';

const esqlSource = createMockEsqlSource(
  [],
  [{ id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' } }],
  '@timestamp',
  ESQL
);

const record = { raw: { avg_bytes: 12 } } as unknown as DataTableRecord;

const createFetchParams = (overrides: Partial<FetchParams> = {}): FetchParams =>
  ({ query: { esql: ESQL }, dataSource: esqlSource, ...overrides } as FetchParams);

const createDocuments = (
  overrides: Partial<DataDocumentsMsg> & Pick<DataDocumentsMsg, 'fetchStatus'>
): DataDocumentsMsg => ({
  query: { esql: ESQL },
  dataSource: esqlSource,
  result: [record],
  ...overrides,
});

const getGridProps = () => mockGrid.mock.lastCall?.[0];
const documentRows = expect.objectContaining({ rows: [{ avg_bytes: 12 }] });

const renderSync = ({
  fetchParams = createFetchParams(),
  isChartLoading = false,
}: {
  fetchParams?: FetchParams;
  isChartLoading?: boolean;
} = {}) => {
  const chartSectionProps$ = new BehaviorSubject(undefined) as ChangePointChartSectionProps$;
  const next = jest.spyOn(chartSectionProps$, 'next');
  const gridProps = {
    fetchParams,
    fetch$: new BehaviorSubject(undefined),
    services: {},
    isChartLoading,
  } as unknown as UnifiedChangePointGridProps;

  const view = render(
    <ChangePointChartSectionSync
      gridProps={gridProps}
      actions={{}}
      chartSectionProps$={chartSectionProps$}
    />
  );

  return { ...view, chartSectionProps$, next, gridProps };
};

describe('ChangePointChartSectionSync', () => {
  beforeEach(() => {
    mockGrid.mockClear();
    mockDocuments$.next({ fetchStatus: FetchStatus.UNINITIALIZED });
  });

  it('fills the missing table from completed documents for the same ES|QL source', () => {
    mockDocuments$.next(createDocuments({ fetchStatus: FetchStatus.COMPLETE }));
    const { next } = renderSync();

    const gridFetchParams = getGridProps()?.fetchParams;
    expect(gridFetchParams?.table).toEqual(documentRows);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.lastCall?.[0]?.fetchParams).toBe(gridFetchParams);
  });

  it('does not fill a table from documents for a different ES|QL source', () => {
    const otherSource = { ...esqlSource, id: 'other-esql-source' } as EsqlSource;
    mockDocuments$.next(
      createDocuments({ fetchStatus: FetchStatus.COMPLETE, dataSource: otherSource })
    );
    renderSync();

    expect(getGridProps()?.fetchParams?.table).toBeUndefined();
  });

  it('does not fill a table while documents are loading', () => {
    mockDocuments$.next(createDocuments({ fetchStatus: FetchStatus.LOADING, result: undefined }));
    renderSync({ isChartLoading: true });

    expect(getGridProps()?.fetchParams?.table).toBeUndefined();
    expect(getGridProps()?.isChartLoading).toBe(true);
  });

  it('fills the table from partial documents for the same ES|QL source', () => {
    mockDocuments$.next(createDocuments({ fetchStatus: FetchStatus.PARTIAL }));
    renderSync();

    expect(getGridProps()?.fetchParams?.table).toEqual(documentRows);
    expect(getGridProps()?.isChartLoading).toBe(false);
  });

  it('keeps the table when a later subscriber receives PARTIAL after COMPLETE', () => {
    const subscription = mockDocuments$.subscribe((message) => {
      if (message.fetchStatus === FetchStatus.PARTIAL) {
        mockDocuments$.next({ ...message, fetchStatus: FetchStatus.COMPLETE });
      }
    });
    try {
      renderSync();
      act(() => {
        mockDocuments$.next(createDocuments({ fetchStatus: FetchStatus.PARTIAL }));
      });
    } finally {
      subscription.unsubscribe();
    }

    expect(getGridProps()?.fetchParams?.table).toEqual(documentRows);
    expect(getGridProps()?.isChartLoading).toBe(false);
  });

  it('preserves a table already supplied by the histogram fetch', () => {
    const existingTable = {
      type: 'datatable' as const,
      rows: [{ avg_bytes: 1 }],
      columns: [...esqlSource.resultColumns],
      meta: { type: 'esql' },
    };
    mockDocuments$.next(createDocuments({ fetchStatus: FetchStatus.COMPLETE }));
    renderSync({ fetchParams: createFetchParams({ table: existingTable }) });

    expect(getGridProps()?.fetchParams?.table).toBe(existingTable);
  });

  it('keeps the table reference and does not republish on an unrelated re-render', () => {
    mockDocuments$.next(createDocuments({ fetchStatus: FetchStatus.COMPLETE }));
    const { next, rerender, gridProps, chartSectionProps$ } = renderSync();
    const table = getGridProps()?.fetchParams?.table;

    rerender(
      <ChangePointChartSectionSync
        gridProps={{ ...gridProps }}
        actions={{}}
        chartSectionProps$={chartSectionProps$}
      />
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(getGridProps()?.fetchParams?.table).toBe(table);
  });

  it('fills the table when documents complete after the first render', () => {
    const { next } = renderSync();
    expect(getGridProps()?.fetchParams?.table).toBeUndefined();

    act(() => {
      mockDocuments$.next(createDocuments({ fetchStatus: FetchStatus.COMPLETE }));
    });

    const gridFetchParams = getGridProps()?.fetchParams;
    expect(gridFetchParams?.table).toEqual(documentRows);
    expect(next).toHaveBeenCalledTimes(2);
    expect(next.mock.lastCall?.[0]?.fetchParams).toBe(gridFetchParams);
  });
});
