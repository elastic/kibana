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
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { buildHitMock } from '../../__mocks__';
import { FieldRow } from './field_row';
import { GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE } from './table_grid';
import type { TanStackTableGridProps } from './tanstack_table_grid';
import { TanStackTableGrid } from './tanstack_table_grid';

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
    columnsMeta: {},
  });

const mockRows: FieldRow[] = [buildFieldRow('fieldA', 'valueA'), buildFieldRow('fieldB', 'valueB')];

describe('TanStackTableGrid', () => {
  // jsdom has no layout, give the scroll container a size so the virtualizer renders rows.
  beforeAll(() => {
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const defaultProps: TanStackTableGridProps = {
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
    onTogglePinned: jest.fn(),
  };

  it('renders field names and values', () => {
    render(<TanStackTableGrid {...defaultProps} />);
    expect(screen.getByTestId('UnifiedDocViewerTableGrid')).toHaveAttribute('role', 'grid');
    expect(screen.getByText('fieldA')).toBeInTheDocument();
    expect(screen.getByText('valueA')).toBeInTheDocument();
    expect(screen.getByText('fieldB')).toBeInTheDocument();
    expect(screen.getByText('valueB')).toBeInTheDocument();
  });

  it('renders the header unless hidden', () => {
    const { rerender } = render(<TanStackTableGrid {...defaultProps} />);
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(
      expect.arrayContaining(['Field', 'Value'])
    );

    rerender(<TanStackTableGrid {...defaultProps} headerVisibility={false} />);
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
  });

  it('renders pin controls and toggles pinning', async () => {
    render(<TanStackTableGrid {...defaultProps} />);
    await userEvent.click(screen.getByTestId('unifiedDocViewer_pinControlButton_fieldA'));
    expect(defaultProps.onTogglePinned).toHaveBeenCalledWith('fieldA');
  });

  it('does not render pin controls if hidePinColumn is true', () => {
    const { container } = render(<TanStackTableGrid {...defaultProps} hidePinColumn />);
    expect(
      container.querySelectorAll('[data-test-subj*="unifiedDocViewer_pinControl"]')
    ).toHaveLength(0);
  });

  it('only mounts cell actions for the hovered or focused cell', async () => {
    render(<TanStackTableGrid {...defaultProps} />);
    expect(screen.queryByTestId('copyValueButton-fieldA')).not.toBeInTheDocument();
    expect(screen.queryByTestId('euiDataGridCellExpandButton')).not.toBeInTheDocument();

    await userEvent.hover(screen.getByText('fieldA'));
    await userEvent.click(screen.getByTestId('toggleColumnButton-fieldA'));
    expect(defaultProps.onAddColumn).toHaveBeenCalledWith('fieldA');
    expect(screen.getAllByTestId('euiDataGridCellExpandButton')).toHaveLength(1);

    await userEvent.unhover(screen.getByText('fieldA'));
    expect(screen.queryByTestId('toggleColumnButton-fieldA')).not.toBeInTheDocument();

    screen.getByText('valueB').closest<HTMLElement>('[role="gridcell"]')?.focus();
    expect(await screen.findByTestId('copyValueButton-fieldB')).toBeInTheDocument();
    // Unmapped fields cannot be filtered.
    expect(screen.queryByTestId('addFilterForValueButton-fieldB')).not.toBeInTheDocument();
  });

  it('opens the cell popover with actions and warnings', async () => {
    render(<TanStackTableGrid {...defaultProps} rows={[mockRows[0]]} />);
    await userEvent.hover(screen.getByText('valueA'));
    await userEvent.click(screen.getByTestId('euiDataGridCellExpandButton'));

    const popover = await screen.findByTestId('euiDataGridExpansionPopover');
    expect(within(popover).getByText('valueA')).toBeInTheDocument();
    expect(within(popover).getByTestId('copyValueButton-fieldA')).toBeInTheDocument();
    expect(within(popover).getByText('Unindexed fields cannot be searched')).toBeInTheDocument();
  });

  it('only renders the rows within the viewport', () => {
    const manyRows = Array.from({ length: 1000 }, (_, i) => buildFieldRow(`field${i}`, `v${i}`));
    render(<TanStackTableGrid {...defaultProps} rows={manyRows} />);

    const renderedRows = screen.getAllByRole('row').filter((row) => row.hasAttribute('data-index'));
    expect(renderedRows.length).toBeGreaterThan(0);
    expect(renderedRows.length).toBeLessThan(50);
    expect(screen.getByTestId('UnifiedDocViewerTableGrid')).toHaveAttribute(
      'aria-rowcount',
      '1001'
    );
  });
});
