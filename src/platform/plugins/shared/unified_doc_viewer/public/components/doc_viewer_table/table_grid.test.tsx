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
import type { TableGridProps } from './table_grid';
import { TableGrid, GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE } from './table_grid';
import { FieldRow } from './field_row';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { buildHitMock } from '../../__mocks__';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import userEvent from '@testing-library/user-event';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  euiFontSize: () => ({ fontSize: '12px' }),
}));

jest.mock('../../plugin', () => ({
  getUnifiedDocViewerServices: () => ({
    toasts: {},
  }),
}));

jest.mock('./table_cell_actions', () => ({
  getFieldCellActions: () => [],
  getFieldValueCellActions: () => [],
  getFilterExistsDisabledWarning: () => undefined,
  getFilterInOutPairDisabledWarning: () => undefined,
}));

jest.mock('./get_pin_control', () => ({
  getPinColumnControl: jest.fn(() => ({ id: 'pin_field', width: 40 })),
}));

const mockDataView = buildDataViewMock({
  name: 'data-view-mock',
  fields: deepMockedFields,
});

const mockHit = buildHitMock({}, 'index', mockDataView);

const buildFieldRow = (name: string, value: string) => {
  return new FieldRow({
    name,
    displayNameOverride: name,
    flattenedValue: value,
    hit: mockHit,
    dataView: buildDataViewMock({
      name: 'apm-span-data-view',
      fields: undefined,
    }),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    isPinned: false,
    dataSource: undefined,
  });
};

const mockRows: FieldRow[] = [buildFieldRow('fieldA', 'valueA'), buildFieldRow('fieldB', 'valueB')];

describe('TableGrid', () => {
  const defaultProps: TableGridProps = {
    id: 'test-table',
    containerWidth: 800,
    rows: mockRows,
    isEsqlMode: false,
    filter: jest.fn(),
    onAddColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
    columns: [GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE],
    onFindSearchTermMatch: jest.fn(),
    searchTerm: '',
  };

  it('renders the grid and displays field names and values', () => {
    render(<TableGrid {...defaultProps} />);
    expect(screen.getByText('fieldA')).toBeInTheDocument();
    expect(screen.getByText('valueA')).toBeInTheDocument();
    expect(screen.getByText('fieldB')).toBeInTheDocument();
    expect(screen.getByText('valueB')).toBeInTheDocument();
  });

  it('renders custom cell value renderer if provided', () => {
    const renderCell = jest.fn(() => <span>CustomCell</span>);
    render(<TableGrid {...defaultProps} renderCell={renderCell} />);
    expect(screen.getAllByText('CustomCell').length).toBeGreaterThan(0);
    expect(renderCell).toHaveBeenCalledWith(
      expect.objectContaining({ row: mockRows[0], rowId: 'fieldA', columnId: 'name' })
    );
  });

  it('renders custom cell popover renderer if provided', async () => {
    const renderCellDetails = jest.fn(() => <span>CustomPopover</span>);
    render(<TableGrid {...defaultProps} renderCellDetails={renderCellDetails} />);
    const tableCell = screen.getByRole('gridcell', { name: 'Unknown field fieldA' });
    tableCell.focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getAllByText('CustomPopover').length).toBeGreaterThan(0);
    expect(renderCellDetails).toHaveBeenCalledWith(
      expect.objectContaining({ row: mockRows[0], rowId: 'fieldA', columnId: 'name' })
    );
  });

  it('applies custom appearance from props', () => {
    render(
      <TableGrid
        {...defaultProps}
        appearance={{ stripes: false, rowHover: 'none', border: 'none' }}
      />
    );
    const grid = screen.getByTestId('UnifiedDocViewerTableGrid');
    expect(grid.className).toContain('euiDataGrid--bordersNone');
    expect(grid.className).not.toContain('euiDataGrid--stripes');
    expect(grid.className).not.toContain('euiDataGrid--rowHoverHighlight');
  });

  it('does not render pin column control if hidePinColumn is true', () => {
    const { container } = render(<TableGrid {...defaultProps} hidePinColumn={true} />);
    const pinControls = container.querySelectorAll(
      '[data-test-subj*="unifiedDocViewer_pinControl"]'
    );
    expect(pinControls.length).toBe(0);
  });
});
