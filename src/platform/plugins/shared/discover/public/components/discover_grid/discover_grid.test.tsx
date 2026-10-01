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

describe('DiscoverGrid isInteractive', () => {
  beforeEach(() => {
    mockUnifiedDataTable.mockClear();
  });

  it('passes interactive props to UnifiedDataTable when isInteractive is true', () => {
    render(<DiscoverGrid {...(baseProps as unknown as DiscoverGridProps)} isInteractive={true} />);
    const lastProps = mockUnifiedDataTable.mock.calls.at(-1)?.[0];
    expect(lastProps?.canDragAndDropColumns).toBe(true);
    expect(lastProps?.visibleCellActions).toBe(3);
    expect(lastProps?.enableInTableSearch).toBe(true);
    expect(lastProps?.isSortEnabled).not.toBe(false);
    expect(lastProps?.disableCellActions).not.toBe(true);
  });

  it('passes disabled props to UnifiedDataTable when isInteractive is false', () => {
    render(<DiscoverGrid {...(baseProps as unknown as DiscoverGridProps)} isInteractive={false} />);
    const lastProps = mockUnifiedDataTable.mock.calls.at(-1)?.[0];
    expect(lastProps?.isSortEnabled).toBe(false);
    expect(lastProps?.disableCellActions).toBe(true);
    expect(lastProps?.disableColumnActions).toBe(true);
    expect(lastProps?.isColumnSelectorEnabled).toBe(false);
    expect(lastProps?.showKeyboardShortcuts).toBe(false);
    expect(lastProps?.showDisplaySelector).toBe(false);
    expect(lastProps?.rowsPerPageOptions).toEqual([]);
    expect(lastProps?.actions).toBe(false);
    expect(lastProps?.isResizable).toBe(false);
    expect(lastProps?.canDragAndDropColumns).toBeUndefined();
  });

  it('defaults to interactive mode when isInteractive is not set', () => {
    render(<DiscoverGrid {...(baseProps as unknown as DiscoverGridProps)} />);
    const lastProps = mockUnifiedDataTable.mock.calls.at(-1)?.[0];
    expect(lastProps?.canDragAndDropColumns).toBe(true);
    expect(lastProps?.isSortEnabled).not.toBe(false);
  });
});
