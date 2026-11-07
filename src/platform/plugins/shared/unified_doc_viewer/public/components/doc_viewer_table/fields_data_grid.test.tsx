/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { coreMock } from '@kbn/core/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { buildHitMock } from '../../__mocks__';
import { FieldRow } from './field_row';
import type { FieldsDataGridProps } from './fields_data_grid';
import { FieldsDataGrid } from './fields_data_grid';
import { GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE } from './table_grid_constants';

jest.mock('../../plugin', () => ({
  getUnifiedDocViewerServices: () => ({
    toasts: { addInfo: jest.fn(), addWarning: jest.fn() },
  }),
}));

const mockDataView = buildDataViewMock({
  name: 'data-view-mock',
  fields: deepMockedFields,
});

const mockHit = buildHitMock({}, 'index', mockDataView);

const buildFieldRow = (name: string, value: string, isPinned = false) =>
  new FieldRow({
    name,
    displayNameOverride: name,
    flattenedValue: value,
    hit: mockHit,
    dataView: buildDataViewMock({
      name: 'apm-span-data-view',
      fields: undefined,
    }),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    isPinned,
    dataSource: undefined,
  });

const mockRows: FieldRow[] = [buildFieldRow('fieldA', 'valueA'), buildFieldRow('fieldB', 'valueB')];

/** Hover the collapsed trigger so the toolbar expands (click expands the cell popover instead). */
const openCellActionsBubble = async (gridCell: HTMLElement) => {
  await userEvent.hover(await within(gridCell).findByTestId('kbnDataGridCellActionsButton'));
  // The open toolbar may portal into a fixed layer when the cell is too narrow.
  await screen.findByTestId('euiDataGridCellExpandButton');
};

describe('FieldsDataGrid', () => {
  // jsdom has no layout, give the scroll container a size so the virtualizer renders rows.
  beforeAll(() => {
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const defaultProps: FieldsDataGridProps = {
    rows: mockRows,
    isEsqlMode: false,
    toasts: coreMock.createStart().notifications.toasts,
    filter: jest.fn(),
    onAddColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
    columns: [GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE],
    onFindSearchTermMatch: jest.fn(),
    searchTerm: '',
    onTogglePinned: jest.fn(),
  };

  it('renders field names and values', () => {
    render(<FieldsDataGrid {...defaultProps} />);
    expect(screen.getByTestId('UnifiedDocViewerTableGrid')).toHaveAttribute('role', 'grid');
    expect(screen.getByText('fieldA')).toBeInTheDocument();
    expect(screen.getByText('valueA')).toBeInTheDocument();
    expect(screen.getByText('fieldB')).toBeInTheDocument();
    expect(screen.getByText('valueB')).toBeInTheDocument();
  });

  it('renders the header unless hidden', () => {
    const { rerender } = render(<FieldsDataGrid {...defaultProps} />);
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(
      expect.arrayContaining(['Field', 'Value'])
    );

    rerender(<FieldsDataGrid {...defaultProps} headerVisibility={false} />);
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
  });

  it('renders pin controls and toggles pinning', async () => {
    render(<FieldsDataGrid {...defaultProps} />);
    await userEvent.click(screen.getByTestId('unifiedDocViewer_pinControlButton_fieldA'));
    expect(defaultProps.onTogglePinned).toHaveBeenCalledWith('fieldA');
  });

  it('renders pinned fields in the sticky pinned section and unpins them', async () => {
    const onTogglePinned = jest.fn();
    const rows = [buildFieldRow('pinnedField', 'pinnedValue', true), ...mockRows];
    render(<FieldsDataGrid {...defaultProps} rows={rows} onTogglePinned={onTogglePinned} />);

    const pinnedSection = screen.getByTestId('UnifiedDocViewerTableGrid-pinnedRows');
    expect(within(pinnedSection).getByText('pinnedField')).toBeInTheDocument();
    expect(within(pinnedSection).queryByText('fieldA')).not.toBeInTheDocument();

    await userEvent.click(
      within(pinnedSection).getByTestId('unifiedDocViewer_pinControlButton_pinnedField')
    );
    expect(onTogglePinned).toHaveBeenCalledTimes(1);
    expect(onTogglePinned).toHaveBeenCalledWith('pinnedField');
  });

  it('does not render pin controls if hidePinColumn is true', () => {
    const { container } = render(<FieldsDataGrid {...defaultProps} hidePinColumn />);
    expect(
      container.querySelectorAll('[data-test-subj*="unifiedDocViewer_pinControl"]')
    ).toHaveLength(0);
  });

  it('offers the field cell actions', async () => {
    render(<FieldsDataGrid {...defaultProps} />);
    const fieldNameCell = screen.getByText('fieldA').closest<HTMLElement>('[role="gridcell"]')!;
    await userEvent.hover(fieldNameCell);
    await openCellActionsBubble(fieldNameCell);
    await userEvent.click(screen.getByTestId('toggleColumnButton-fieldA'));
    expect(defaultProps.onAddColumn).toHaveBeenCalledWith('fieldA');
  });

  it('offers the value cell actions, without filters for unmapped fields', async () => {
    render(<FieldsDataGrid {...defaultProps} />);
    const valueCell = screen.getByText('valueB').closest<HTMLElement>('[role="gridcell"]')!;
    valueCell.focus();
    await openCellActionsBubble(valueCell);
    expect(screen.getByTestId('copyValueButton-fieldB')).toBeInTheDocument();
    expect(screen.queryByTestId('addFilterForValueButton-fieldB')).not.toBeInTheDocument();
  });

  it('opens the cell popover with actions and warnings', async () => {
    render(<FieldsDataGrid {...defaultProps} rows={[mockRows[0]]} />);
    const valueCell = screen.getByText('valueA').closest<HTMLElement>('[role="gridcell"]')!;
    await userEvent.hover(valueCell);
    await openCellActionsBubble(valueCell);
    await userEvent.click(screen.getByTestId('euiDataGridCellExpandButton'));

    const popover = await screen.findByTestId('euiDataGridExpansionPopover');
    expect(within(popover).getByText('valueA')).toBeInTheDocument();
    expect(within(popover).getByTestId('copyValueButton-fieldA')).toBeInTheDocument();
    expect(within(popover).getByText('Unindexed fields cannot be searched')).toBeInTheDocument();

    await userEvent.click(within(popover).getByTestId('docTableClosePopover'));
    expect(screen.queryByTestId('euiDataGridExpansionPopover')).not.toBeInTheDocument();
  });
});
