/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen } from '@testing-library/react';

import {
  cleanupDataGridTestState,
  mockUseTable,
  mockUseVirtualizer,
  renderGrid,
  resetDataGridTestState,
  virtualizerTestHarness,
} from './data_grid.test.helpers';

describe('DataGrid rendering', () => {
  beforeEach(resetDataGridTestState);
  afterEach(cleanupDataGridTestState);

  it('renders only the virtual window and measures every mounted row', () => {
    renderGrid();

    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getAllByRole('gridcell')).toHaveLength(6);
    expect(screen.getAllByRole('row')[1].getAttribute('data-striped')).toBe('false');
    expect(screen.getAllByRole('row')[2].getAttribute('data-striped')).toBe('true');
    expect(virtualizerTestHarness.measureElement).toHaveBeenCalledTimes(3);
  });

  it('configures Table and virtualization from stable logical identities', () => {
    renderGrid();

    const tableOptions = mockUseTable.mock.calls[0][0];
    expect(tableOptions.columns).toEqual([
      expect.objectContaining({ accessorFn: expect.any(Function), meta: { ariaLabel: undefined } }),
      expect.objectContaining({ accessorFn: expect.any(Function), meta: { ariaLabel: undefined } }),
    ]);

    const virtualizerOptions = mockUseVirtualizer.mock.calls[0][0];
    expect(virtualizerOptions.count).toBe(100);
    expect(virtualizerOptions.estimateSize(42)).toBe(40);
    expect(virtualizerOptions.overscan).toBe(2);
    expect(virtualizerOptions.getItemKey?.(42)).toBe('row-42');
  });

  it('keeps the header fixed inside the contained scroll owner', () => {
    renderGrid();

    const grid = screen.getByRole('grid');
    const headerRow = screen.getAllByRole('columnheader')[0].parentElement;
    if (!headerRow) {
      throw new Error('Expected the column header to belong to a header row.');
    }

    const headerRowGroup = headerRow.parentElement;
    if (!headerRowGroup) {
      throw new Error('Expected the header row to belong to a header row group.');
    }

    expect(grid.getAttribute('style')).toContain('block-size: 160px');
    expect(getComputedStyle(grid).overflow).toBe('auto');
    expect(getComputedStyle(headerRowGroup).position).toBe('sticky');
  });
});
