/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockUnifiedDataTable = jest.fn<void, [Record<string, unknown>]>();

jest.mock('@kbn/unified-data-table', () => ({
  DEFAULT_PAGINATION_MODE: 'multiPage',
  renderCustomToolbar: jest.fn(),
  UnifiedDataTable: (props: Record<string, unknown>) => {
    mockUnifiedDataTable(props);
    return null;
  },
}));

jest.mock('../../context_awareness', () => ({
  useProfileAccessor: jest.fn((key: string) => {
    if (key === 'getRowIndicatorProvider') return () => () => () => undefined;
    if (key === 'getRowAdditionalLeadingControls') return () => (controls: unknown) => controls;
    if (key === 'getPaginationConfig') return () => () => ({ paginationMode: 'multiPage' });
    if (key === 'getColumnsConfiguration') return () => () => ({});
    return () => () => undefined;
  }),
}));

jest.mock('../../application/main/components/layout/cascaded_documents', () => ({
  useGetGroupBySelectorRenderer: () => () => null,
  LazyCascadedDocumentsLayout: () => null,
  CascadedDocumentsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import React from 'react';
import { render } from '@testing-library/react';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { DiscoverGrid, type DiscoverGridProps } from './discover_grid';

const baseProps = {
  dataView: dataViewMock,
  rows: [],
  columns: [],
  sort: [],
  isPlainRecord: false,
  isSortEnabled: true,
  isPaginationEnabled: true,
  onFilter: jest.fn(),
  useNewFieldsApi: true,
  maxDocFieldsDisplayed: 50,
  renderDocumentView: jest.fn(),
  services: {} as UnifiedDataTableProps['services'],
  totalHits: 0,
  onFetchMoreRecords: undefined,
  dataGridDensityState: undefined,
  rowHeightState: undefined,
  onUpdateDataGridDensity: jest.fn(),
  onUpdateRowHeight: jest.fn(),
  sampleSizeState: 500,
  onUpdateSampleSize: jest.fn(),
};

describe('DiscoverGrid renderMode', () => {
  beforeEach(() => {
    mockUnifiedDataTable.mockClear();
  });

  // UnifiedDataTable is responsible for gating its own interactive controls off of the single
  // `renderMode` prop (see data_table.test.tsx); DiscoverGrid just needs to forward it
  // untouched and keep requesting its usual feature set regardless of the value.
  it("forwards renderMode='interactive' to UnifiedDataTable", () => {
    render(
      <DiscoverGrid {...(baseProps as unknown as DiscoverGridProps)} renderMode="interactive" />
    );
    const lastProps = mockUnifiedDataTable.mock.calls.at(-1)?.[0];
    expect(lastProps?.renderMode).toBe('interactive');
    expect(lastProps?.canDragAndDropColumns).toBe(true);
    expect(lastProps?.enableComparisonMode).toBe(true);
    expect(lastProps?.enableInTableSearch).toBe(true);
    expect(lastProps?.showSummaryColumnToggle).toBe(true);
    expect(lastProps?.visibleCellActions).toBe(3);
  });

  it("forwards renderMode='print' to UnifiedDataTable", () => {
    render(<DiscoverGrid {...(baseProps as unknown as DiscoverGridProps)} renderMode="print" />);
    const lastProps = mockUnifiedDataTable.mock.calls.at(-1)?.[0];
    expect(lastProps?.renderMode).toBe('print');
    expect(lastProps?.canDragAndDropColumns).toBe(true);
    expect(lastProps?.enableComparisonMode).toBe(true);
    expect(lastProps?.enableInTableSearch).toBe(true);
    expect(lastProps?.showSummaryColumnToggle).toBe(true);
    expect(lastProps?.visibleCellActions).toBe(3);
  });

  it('leaves renderMode undefined (UnifiedDataTable defaults to interactive) when not set', () => {
    render(<DiscoverGrid {...(baseProps as unknown as DiscoverGridProps)} />);
    const lastProps = mockUnifiedDataTable.mock.calls.at(-1)?.[0];
    expect(lastProps?.renderMode).toBeUndefined();
  });
});
