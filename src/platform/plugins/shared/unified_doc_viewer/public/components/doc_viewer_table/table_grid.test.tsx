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
    columnsMeta: {},
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
    initialPageSize: 0,
  };

  it('renders the grid and displays field names and values', () => {
    render(<TableGrid {...defaultProps} />);
    expect(screen.getByText('fieldA')).toBeInTheDocument();
    expect(screen.getByText('valueA')).toBeInTheDocument();
    expect(screen.getByText('fieldB')).toBeInTheDocument();
    expect(screen.getByText('valueB')).toBeInTheDocument();
  });

  it('renders custom cell value renderer if provided', () => {
    const customRenderCellValue = jest.fn(() => <span>CustomCell</span>);
    render(<TableGrid {...defaultProps} customRenderCellValue={customRenderCellValue} />);
    expect(screen.getAllByText('CustomCell').length).toBeGreaterThan(0);
  });

  it('renders custom cell popover renderer if provided', async () => {
    const customRenderCellPopover = jest.fn(() => <span>CustomPopover</span>);
    render(<TableGrid {...defaultProps} customRenderCellPopover={customRenderCellPopover} />);
    const tableCell = screen.getByText('fieldA');
    await userEvent.hover(tableCell);
    const expandPopoverButton = screen.getByTestId('euiDataGridCellExpandButton');
    await userEvent.click(expandPopoverButton);

    expect(screen.getAllByText('CustomPopover').length).toBeGreaterThan(0);
  });

  it('applies custom gridStyle from props', () => {
    render(
      <TableGrid
        {...defaultProps}
        gridStyle={{ stripes: false, rowHover: 'none', border: 'none' }}
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
