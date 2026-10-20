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
import { GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE } from './table_grid_constants';
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
    dataSource: undefined,
  });

const mockRows: FieldRow[] = [buildFieldRow('fieldA', 'valueA'), buildFieldRow('fieldB', 'valueB')];

/** Hover the collapsed trigger so the toolbar expands (click expands the cell popover instead). */
const openCellActionsBubble = async (gridCell: HTMLElement) => {
  await userEvent.hover(await within(gridCell).findByTestId('tanStackCellActionsButton'));
  // The open toolbar may portal into a fixed layer when the cell is too narrow.
  await screen.findByTestId('euiDataGridCellExpandButton');
};

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
    containerWidth: 800,
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

  it('renders pinned fields in the sticky pinned section and unpins them', async () => {
    const onTogglePinned = jest.fn();
    const rows = [buildFieldRow('pinnedField', 'pinnedValue', true), ...mockRows];
    render(<TanStackTableGrid {...defaultProps} rows={rows} onTogglePinned={onTogglePinned} />);

    const pinnedSection = screen.getByTestId('unifiedDocViewerPinnedFields');
    expect(within(pinnedSection).getByText('pinnedField')).toBeInTheDocument();
    expect(within(pinnedSection).queryByText('fieldA')).not.toBeInTheDocument();
    // Pinned rows are not part of the virtualized rows.
    expect(
      screen
        .getAllByRole('row')
        .filter((row) => row.hasAttribute('data-index'))
        .map((row) => row.textContent)
    ).toEqual([expect.stringContaining('fieldA'), expect.stringContaining('fieldB')]);

    await userEvent.click(
      within(pinnedSection).getByTestId('unifiedDocViewer_pinControlButton_pinnedField')
    );
    expect(onTogglePinned).toHaveBeenCalledTimes(1);
    expect(onTogglePinned).toHaveBeenCalledWith('pinnedField');
  });

  it('does not render the pinned section without pinned fields', () => {
    render(<TanStackTableGrid {...defaultProps} />);
    expect(screen.queryByTestId('unifiedDocViewerPinnedFields')).not.toBeInTheDocument();
  });

  it('does not render pin controls if hidePinColumn is true', () => {
    const { container } = render(<TanStackTableGrid {...defaultProps} hidePinColumn />);
    expect(
      container.querySelectorAll('[data-test-subj*="unifiedDocViewer_pinControl"]')
    ).toHaveLength(0);
  });

  it('only mounts cell actions for the hovered or focused cell', async () => {
    render(<TanStackTableGrid {...defaultProps} />);
    expect(screen.queryAllByTestId('tanStackCellActionsButton')).toHaveLength(0);

    const fieldNameCell = screen.getByText('fieldA').closest<HTMLElement>('[role="gridcell"]')!;
    await userEvent.hover(fieldNameCell);
    await openCellActionsBubble(fieldNameCell);
    await userEvent.click(screen.getByTestId('toggleColumnButton-fieldA'));
    expect(defaultProps.onAddColumn).toHaveBeenCalledWith('fieldA');

    await userEvent.unhover(fieldNameCell);
    fieldNameCell.blur();
    expect(
      within(fieldNameCell).queryByTestId('tanStackCellActionsButton')
    ).not.toBeInTheDocument();

    const valueCell = screen.getByText('valueB').closest<HTMLElement>('[role="gridcell"]')!;
    valueCell.focus();
    await openCellActionsBubble(valueCell);
    expect(screen.getByTestId('copyValueButton-fieldB')).toBeInTheDocument();
    // Unmapped fields cannot be filtered.
    expect(screen.queryByTestId('addFilterForValueButton-fieldB')).not.toBeInTheDocument();
  });

  it('opens the cell popover with actions and warnings', async () => {
    render(<TanStackTableGrid {...defaultProps} rows={[mockRows[0]]} />);
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

  it('expands the cell when the collapsed actions trigger is clicked', async () => {
    render(<TanStackTableGrid {...defaultProps} rows={[mockRows[0]]} />);
    const valueCell = screen.getByText('valueA').closest<HTMLElement>('[role="gridcell"]')!;
    await userEvent.hover(valueCell);
    await userEvent.click(await within(valueCell).findByTestId('tanStackCellActionsButton'));

    const popover = await screen.findByTestId('euiDataGridExpansionPopover');
    expect(within(popover).getByText('valueA')).toBeInTheDocument();
  });

  describe('keyboard accessibility', () => {
    const getCell = (text: string) =>
      screen.getByText(text).closest<HTMLElement>('[role="gridcell"]')!;

    it('exposes column indexes and a single tab stop', () => {
      render(<TanStackTableGrid {...defaultProps} />);
      expect(getCell('fieldA')).toHaveAttribute('aria-colindex', '2');
      expect(getCell('valueA')).toHaveAttribute('aria-colindex', '3');
      const tabStops = screen
        .getAllByRole('gridcell')
        .concat(screen.getAllByRole('columnheader'))
        .filter((cell) => cell.getAttribute('tabindex') === '0');
      expect(tabStops).toEqual([getCell('fieldA')]);
    });

    it('moves focus and the tab stop with the arrow keys', async () => {
      render(<TanStackTableGrid {...defaultProps} />);
      getCell('fieldA').focus();

      await userEvent.keyboard('{ArrowRight}');
      expect(getCell('valueA')).toHaveFocus();
      expect(getCell('valueA')).toHaveAttribute('tabindex', '0');
      expect(getCell('fieldA')).toHaveAttribute('tabindex', '-1');

      await userEvent.keyboard('{ArrowDown}');
      expect(getCell('valueB')).toHaveFocus();

      await userEvent.keyboard('{Home}');
      expect(
        screen.getByTestId('unifiedDocViewer_pinControlButton_fieldB').closest('[role="gridcell"]')
      ).toHaveFocus();
    });

    it('opens the cell popover with Enter as a focus-trapped dialog', async () => {
      render(<TanStackTableGrid {...defaultProps} />);
      const valueCell = getCell('valueA');
      valueCell.focus();
      await userEvent.keyboard('{Enter}');

      const popover = await screen.findByTestId('euiDataGridExpansionPopover');
      expect(within(popover).getByText('valueA')).toBeInTheDocument();
      // jsdom does not move focus into the focus trap, so assert that the popover owns focus.
      expect(popover).toHaveAttribute('aria-modal', 'true');
      // Anchored to the cell actions trigger (expand icon corner), not the full cell.
      expect(within(valueCell).getByTestId('tanStackCellActionsButton')).toBeInTheDocument();
    });
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
