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
import userEvent from '@testing-library/user-event';

import { DataGrid } from './data_grid';
import { createDataGridColumnHelper } from './data_grid_column';
import { mockDataGridLayout } from './data_grid_layout_mock';

// Unlike the other package tests, this suite uses the real virtualizer and focus libraries, so that
// a dependency upgrade that changes which measurements they read fails here instead of in consumers.

interface LinkRow {
  readonly id: string;
}

const VIEWPORT_HEIGHT = 340;
const ROW_HEIGHT = 34;
const OVERSCAN = 2;

const rows: LinkRow[] = Array.from({ length: 1000 }, (_, index) => ({ id: `row-${index}` }));
const columnHelper = createDataGridColumnHelper<LinkRow>();
const columns = [
  columnHelper.accessor({
    id: 'id',
    header: 'ID',
    getValue: (row) => row.id,
    getTextValue: ({ value }) => value,
    renderCell: ({ value }) => value,
  }),
  columnHelper.accessor({
    id: 'link',
    header: 'Link',
    getValue: (row) => `https://example.com/${row.id}`,
    getTextValue: ({ value }) => value,
    renderCell: ({ value, rowId }) => <a href={value}>{`Open ${rowId}`}</a>,
  }),
];

const renderGrid = () =>
  render(
    <>
      <button type="button">Outside the grid</button>
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        virtualization={{ rows: { overscan: OVERSCAN } }}
      />
    </>
  );

describe('mockDataGridLayout', () => {
  let restoreLayout: () => void;

  beforeEach(() => {
    restoreLayout = mockDataGridLayout({ viewportHeight: VIEWPORT_HEIGHT, rowHeight: ROW_HEIGHT });
  });

  afterEach(() => {
    restoreLayout();
  });

  it('virtualizes the rows of a grid to the mocked viewport and row heights', () => {
    renderGrid();

    const visibleRowCount = VIEWPORT_HEIGHT / ROW_HEIGHT;
    const mountedBodyRowCount = screen.getAllByRole('row').length - 1;
    expect(mountedBodyRowCount).toBeGreaterThanOrEqual(visibleRowCount - 1);
    expect(mountedBodyRowCount).toBeLessThanOrEqual(visibleRowCount + OVERSCAN);
    expect(screen.queryByRole('link', { name: 'Open row-999' })).toBeNull();
  });

  it('lets Enter move focus to focusable content inside the active cell', async () => {
    const user = userEvent.setup();
    renderGrid();

    await user.click(screen.getByRole('gridcell', { name: 'Open row-0' }));
    await user.keyboard('{Enter}');

    expect(screen.getByRole('link', { name: 'Open row-0' })).toHaveFocus();
  });

  it('leaves elements outside a grid without layout, and restores JSDOM layout inside it', () => {
    renderGrid();
    const outsideButton = screen.getByRole('button', { name: 'Outside the grid' });
    const grid = screen.getByRole('grid');
    const link = screen.getByRole('link', { name: 'Open row-0' });

    expect(outsideButton.getClientRects()).toHaveLength(0);
    expect(outsideButton.offsetHeight).toBe(0);
    expect(grid.clientHeight).toBe(VIEWPORT_HEIGHT);
    expect(link.getClientRects()).toHaveLength(1);

    restoreLayout();

    expect(grid.clientHeight).toBe(0);
    expect(link.getClientRects()).toHaveLength(0);
  });
});
