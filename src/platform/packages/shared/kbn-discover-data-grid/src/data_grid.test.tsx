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
import { useTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import { DataGrid } from './data_grid';
import { createDataGridColumnHelper } from './data_grid_column';

const measureElement = jest.fn();

jest.mock('@tanstack/react-table', () => {
  const actual =
    jest.requireActual<typeof import('@tanstack/react-table')>('@tanstack/react-table');
  return {
    ...actual,
    useTable: jest.fn(actual.useTable),
  };
});

jest.mock('@tanstack/react-virtual', () => ({
  ...jest.requireActual('@tanstack/react-virtual'),
  useVirtualizer: jest.fn(() => ({
    getTotalSize: () => 4_000,
    getVirtualItems: () => [
      { index: 0, key: 'row-0', start: 0, end: 40, size: 40, lane: 0 },
      { index: 1, key: 'row-1', start: 40, end: 80, size: 40, lane: 0 },
      { index: 2, key: 'row-2', start: 80, end: 120, size: 40, lane: 0 },
    ],
    measureElement,
  })),
}));

interface TestRow {
  id: string;
  name: string;
  value: number;
}

const columnHelper = createDataGridColumnHelper<TestRow>();
const columns = [
  columnHelper.accessor({
    id: 'name',
    header: 'Name',
    accessibilityLabel: 'Name',
    getValue: (row) => row.name,
    renderCell: ({ value }) => value,
  }),
  columnHelper.accessor({
    id: 'value',
    header: 'Value',
    accessibilityLabel: 'Value',
    getValue: (row) => row.value,
    renderCell: ({ value }) => value.toLocaleString(),
  }),
];
const rows = Array.from({ length: 100 }, (_, index) => ({
  id: `row-${index}`,
  name: `Name ${index}`,
  value: index,
}));

describe('DataGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders typed column content from stable rows', () => {
    render(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        height={160}
      />
    );

    expect(screen.getByRole('grid', { name: 'Example data' })).not.toBeNull();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByText('Name 1')).not.toBeNull();
    expect(screen.getByText('1')).not.toBeNull();
  });

  it('registers data-backed columns as TanStack accessor columns', () => {
    render(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        height={160}
      />
    );

    const tableOptions = jest.mocked(useTable).mock.calls[0][0];
    expect(tableOptions.columns).toHaveLength(2);
    expect(tableOptions.columns).toEqual([
      expect.objectContaining({ accessorFn: expect.any(Function) }),
      expect.objectContaining({ accessorFn: expect.any(Function) }),
    ]);
  });

  it('renders only the virtual window and measures every mounted row', () => {
    render(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        height={160}
        virtualization={{
          rows: {
            estimatedHeight: 40,
            overscan: 2,
          },
        }}
      />
    );

    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getAllByRole('gridcell')).toHaveLength(6);
    expect(screen.getAllByRole('row')[1].getAttribute('data-striped')).toBe('false');
    expect(screen.getAllByRole('row')[2].getAttribute('data-striped')).toBe('true');
    expect(measureElement).toHaveBeenCalledTimes(3);
  });

  it('exposes the total row count and absolute indexes for virtualized rows', () => {
    render(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        height={160}
      />
    );

    expect(screen.getByRole('grid').getAttribute('aria-rowcount')).toBe('101');
    expect(screen.getAllByRole('row').map((row) => row.getAttribute('aria-rowindex'))).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
  });

  it('configures virtualization from the final table model using stable row IDs', () => {
    render(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        height={160}
        virtualization={{
          rows: {
            estimatedHeight: 48,
            overscan: 3,
          },
        }}
      />
    );

    const virtualizerOptions = jest.mocked(useVirtualizer).mock.calls[0][0];
    expect(virtualizerOptions.count).toBe(100);
    expect(virtualizerOptions.estimateSize(42)).toBe(48);
    expect(virtualizerOptions.overscan).toBe(3);
    expect(virtualizerOptions.getItemKey?.(42)).toBe('row-42');
  });

  it('keeps the header fixed inside the contained scroll owner', () => {
    render(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        height={160}
      />
    );

    const grid = screen.getByRole('grid');
    const headerRow = screen.getAllByRole('columnheader')[0].parentElement;
    if (!headerRow) {
      throw new Error('Expected the column header to belong to a header row.');
    }

    expect(grid.getAttribute('style')).toContain('block-size: 160px');
    expect(getComputedStyle(grid).overflow).toBe('auto');
    expect(getComputedStyle(headerRow).position).toBe('sticky');
  });

  it('makes the scroll owner keyboard focusable', () => {
    render(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        height={160}
      />
    );

    expect(screen.getByRole('grid').tabIndex).toBe(0);
  });
});
