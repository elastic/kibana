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
import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import {
  CELL_ACTIONS_TRIGGER_TEST_SUBJ,
  CELL_EXPAND_BUTTON_TEST_SUBJ,
  CELL_EXPANSION_CLOSE_TEST_SUBJ,
  CELL_EXPANSION_POPOVER_TEST_SUBJ,
} from '../constants';
import type { DataGridColumn, DataGridControlColumn, DataGridProps } from '../types';
import { DataGrid } from './data_grid';

interface TestRow {
  id: string;
  name: string;
  value: string;
}

const buildRow = (id: string, value: string): TestRow => ({ id, name: `name ${id}`, value });

const mockRows: TestRow[] = [buildRow('rowA', 'valueA'), buildRow('rowB', 'valueB')];

const onCopy = jest.fn();

const CopyAction = ({ rowIndex, Component }: EuiDataGridColumnCellActionProps) => (
  <Component
    iconType="copyClipboard"
    aria-label="Copy value"
    data-test-subj={`copyButton-${rowIndex}`}
    onClick={() => onCopy(rowIndex)}
  >
    Copy value
  </Component>
);

const leadingControlColumns: Array<DataGridControlColumn<TestRow>> = [
  {
    id: 'control',
    header: 'Control',
    width: 32,
    renderCell: ({ row }) => (
      <button data-test-subj={`control-${row.id}`}>{`control ${row.id}`}</button>
    ),
  },
];

const columns: Array<DataGridColumn<TestRow>> = [
  {
    id: 'name',
    header: 'Name',
    initialWidth: () => 200,
    minWidth: 100,
    isResizable: true,
    renderCell: ({ row }) => row.name,
  },
  {
    id: 'value',
    header: 'Value',
    cellActions: [CopyAction],
    renderCell: ({ row, isDetails }) => (isDetails ? `details of ${row.value}` : row.value),
    renderCellExpansionFooter: (row) => <div>{`footer of ${row.id}`}</div>,
  },
];

const defaultProps: DataGridProps<TestRow> = {
  rows: mockRows,
  columns,
  leadingControlColumns,
  getRowId: (row) => row.id,
  ariaLabel: 'Test grid',
  'data-test-subj': 'testGrid',
};

const getCell = (text: string) => screen.getByText(text).closest<HTMLElement>('[role="gridcell"]')!;

/** Hover the collapsed trigger so the toolbar expands (click expands the cell popover instead). */
const openCellActionsBubble = async (gridCell: HTMLElement) => {
  await userEvent.hover(await within(gridCell).findByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ));
  // The open toolbar may portal into a fixed layer when the cell is too narrow.
  await screen.findByTestId(CELL_EXPAND_BUTTON_TEST_SUBJ);
};

describe('DataGrid', () => {
  // jsdom has no layout, give the scroll container a size so the virtualizer renders rows.
  beforeAll(() => {
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    onCopy.mockClear();
  });

  it('renders an accessible grid with the cells of every row', () => {
    render(<DataGrid {...defaultProps} />);
    const grid = screen.getByTestId('testGrid');
    expect(grid).toHaveAttribute('role', 'grid');
    expect(grid).toHaveAttribute('aria-label', 'Test grid');
    expect(grid).toHaveAttribute('aria-rowcount', '3');
    expect(grid).toHaveAttribute('aria-colcount', '3');
    expect(screen.getByText('name rowA')).toBeInTheDocument();
    expect(screen.getByText('valueA')).toBeInTheDocument();
    expect(screen.getByText('name rowB')).toBeInTheDocument();
    expect(screen.getByText('valueB')).toBeInTheDocument();
  });

  it('renders the header unless hidden', () => {
    const { rerender } = render(<DataGrid {...defaultProps} />);
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Control',
      'Name',
      'Value',
    ]);

    rerender(<DataGrid {...defaultProps} showHeader={false} />);
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
  });

  it('only makes the columns with a width and resizing enabled resizable', () => {
    const { container } = render(<DataGrid {...defaultProps} />);
    expect(container.querySelectorAll('[role="presentation"]')).toHaveLength(1);
  });

  it('renders pinned rows in the sticky section, outside of the virtualized rows', () => {
    render(<DataGrid {...defaultProps} pinnedRowIds={['rowB']} />);
    const pinnedSection = screen.getByTestId('testGrid-pinnedRows');
    expect(within(pinnedSection).getByText('name rowB')).toBeInTheDocument();
    expect(within(pinnedSection).queryByText('name rowA')).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole('row')
        .filter((row) => row.hasAttribute('data-index'))
        .map((row) => row.textContent)
    ).toEqual([expect.stringContaining('name rowA')]);
  });

  it('does not render the pinned section without pinned rows', () => {
    render(<DataGrid {...defaultProps} />);
    expect(screen.queryByTestId('testGrid-pinnedRows')).not.toBeInTheDocument();
  });

  it('only renders the rows within the viewport', () => {
    const manyRows = Array.from({ length: 1000 }, (_, i) => buildRow(`row${i}`, `v${i}`));
    render(<DataGrid {...defaultProps} rows={manyRows} />);

    const renderedRows = screen.getAllByRole('row').filter((row) => row.hasAttribute('data-index'));
    expect(renderedRows.length).toBeGreaterThan(0);
    expect(renderedRows.length).toBeLessThan(50);
    expect(screen.getByTestId('testGrid')).toHaveAttribute('aria-rowcount', '1001');
  });

  describe('cell actions and expansion', () => {
    it('only mounts cell actions for the hovered or focused cell', async () => {
      render(<DataGrid {...defaultProps} />);
      expect(screen.queryAllByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ)).toHaveLength(0);

      const valueCell = getCell('valueA');
      await userEvent.hover(valueCell);
      await openCellActionsBubble(valueCell);
      await userEvent.click(screen.getByTestId('copyButton-0'));
      expect(onCopy).toHaveBeenCalledWith(0);

      await userEvent.unhover(valueCell);
      valueCell.blur();
      expect(
        within(valueCell).queryByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ)
      ).not.toBeInTheDocument();

      const otherCell = getCell('valueB');
      otherCell.focus();
      await openCellActionsBubble(otherCell);
      expect(screen.getByTestId('copyButton-1')).toBeInTheDocument();
    });

    it('does not mount cell actions for control columns', async () => {
      render(<DataGrid {...defaultProps} />);
      const controlCell = screen
        .getByTestId('control-rowA')
        .closest<HTMLElement>('[role="gridcell"]')!;
      await userEvent.hover(controlCell);
      expect(
        within(controlCell).queryByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ)
      ).not.toBeInTheDocument();
    });

    it('opens the cell popover with the details, actions and footer', async () => {
      render(<DataGrid {...defaultProps} rows={[mockRows[0]]} />);
      const valueCell = getCell('valueA');
      await userEvent.hover(valueCell);
      await openCellActionsBubble(valueCell);
      await userEvent.click(screen.getByTestId(CELL_EXPAND_BUTTON_TEST_SUBJ));

      const popover = await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);
      expect(within(popover).getByText('details of valueA')).toBeInTheDocument();
      expect(within(popover).getByTestId('copyButton-0')).toBeInTheDocument();
      expect(within(popover).getByText('footer of rowA')).toBeInTheDocument();

      await userEvent.click(within(popover).getByTestId(CELL_EXPANSION_CLOSE_TEST_SUBJ));
      expect(screen.queryByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ)).not.toBeInTheDocument();
    });

    it('expands the cell when the collapsed actions trigger is clicked', async () => {
      render(<DataGrid {...defaultProps} rows={[mockRows[0]]} />);
      const valueCell = getCell('valueA');
      await userEvent.hover(valueCell);
      await userEvent.click(await within(valueCell).findByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ));

      const popover = await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);
      expect(within(popover).getByText('details of valueA')).toBeInTheDocument();
    });
  });

  it('renders trailing control columns after the data columns', () => {
    render(
      <DataGrid
        {...defaultProps}
        trailingControlColumns={[
          {
            id: 'trailing',
            header: 'Trailing',
            width: 40,
            renderCell: ({ row }) => `end ${row.id}`,
          },
        ]}
      />
    );
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Control',
      'Name',
      'Value',
      'Trailing',
    ]);
    expect(screen.getByText('end rowA')).toHaveAttribute('aria-colindex', '4');
  });

  it('applies the props of getCellProps and getRowProps', () => {
    render(
      <DataGrid
        {...defaultProps}
        getCellProps={({ row, columnId }) =>
          columnId === 'value'
            ? { 'data-test-subj': `valueCell-${row.id}`, className: 'custom' }
            : undefined
        }
        getRowProps={({ row }) => ({ 'data-test-subj': `row-${row.id}`, className: 'customRow' })}
      />
    );
    expect(screen.getByTestId('valueCell-rowA')).toHaveClass('custom');
    expect(screen.getByTestId('valueCell-rowA')).toHaveTextContent('valueA');
    expect(screen.queryByTestId('valueCell-undefined')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-rowB')).toHaveClass('kbnDataGrid__row', 'customRow');
  });

  describe('column widths', () => {
    const getWidthVar = (columnIndex: number) =>
      screen
        .getByTestId('testGrid')
        .style.getPropertyValue(`--kbnDataGridColumnWidth-${columnIndex}`);

    it('uses the initial width, and columnWidths over it', () => {
      const { rerender } = render(<DataGrid {...defaultProps} />);
      expect(getWidthVar(0)).toBe('32px');
      expect(getWidthVar(1)).toBe('200px');

      rerender(<DataGrid {...defaultProps} columnWidths={{ name: 300 }} />);
      expect(getWidthVar(1)).toBe('300px');
    });

    it('does not let control columns be resized', () => {
      render(<DataGrid {...defaultProps} columnWidths={{ control: 300 }} />);
      expect(getWidthVar(0)).toBe('32px');
    });

    it('reports a reset by double clicking the resize handle', async () => {
      const onColumnResize = jest.fn();
      const { container } = render(
        <DataGrid {...defaultProps} columnWidths={{ name: 300 }} onColumnResize={onColumnResize} />
      );
      await userEvent.dblClick(container.querySelector('[role="presentation"]')!);
      expect(onColumnResize).toHaveBeenCalledWith({ columnId: 'name', width: 200 });
    });
  });

  describe('keyboard accessibility', () => {
    it('exposes column indexes and a single tab stop on the first non-control column', () => {
      render(<DataGrid {...defaultProps} />);
      expect(screen.getByText('name rowA').closest('[role="gridcell"]')).toHaveAttribute(
        'aria-colindex',
        '2'
      );
      expect(getCell('valueA')).toHaveAttribute('aria-colindex', '3');
      const tabStops = screen
        .getAllByRole('gridcell')
        .concat(screen.getAllByRole('columnheader'))
        .filter((cell) => cell.getAttribute('tabindex') === '0');
      expect(tabStops).toHaveLength(1);
      expect(tabStops[0]).toHaveAttribute('aria-colindex', '2');
      expect(tabStops[0]).toHaveAttribute('data-gridcell-column-id', 'name');
    });

    it('moves focus and the tab stop with the arrow keys', async () => {
      render(<DataGrid {...defaultProps} />);
      const nameCell = screen
        .getAllByRole('gridcell')
        .find((cell) => cell.getAttribute('data-gridcell-column-id') === 'name')!;
      nameCell.focus();

      await userEvent.keyboard('{ArrowRight}');
      expect(getCell('valueA')).toHaveFocus();
      expect(getCell('valueA')).toHaveAttribute('tabindex', '0');
      expect(nameCell).toHaveAttribute('tabindex', '-1');

      await userEvent.keyboard('{ArrowDown}');
      expect(getCell('valueB')).toHaveFocus();

      await userEvent.keyboard('{Home}');
      expect(screen.getByTestId('control-rowB').closest('[role="gridcell"]')).toHaveFocus();

      await userEvent.keyboard('{ArrowUp}{ArrowUp}');
      expect(screen.getAllByRole('columnheader')[0]).toHaveFocus();
    });

    it('keeps arrow keys and Escape from reaching parents of the grid', async () => {
      const onParentKeyDown = jest.fn();
      render(
        <div role="presentation" onKeyDown={onParentKeyDown}>
          <DataGrid {...defaultProps} />
        </div>
      );
      getCell('valueA').focus();
      await userEvent.keyboard('{ArrowDown}{Escape}');
      expect(onParentKeyDown).not.toHaveBeenCalled();
    });

    it('opens the cell popover with Enter as a focus-trapped dialog', async () => {
      render(<DataGrid {...defaultProps} />);
      const valueCell = getCell('valueA');
      valueCell.focus();
      await userEvent.keyboard('{Enter}');

      const popover = await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);
      expect(within(popover).getByText('details of valueA')).toBeInTheDocument();
      // jsdom does not move focus into the focus trap, so assert that the popover owns focus.
      expect(popover).toHaveAttribute('aria-modal', 'true');
      // Anchored to the cell actions trigger (expand icon corner), not the full cell.
      expect(within(valueCell).getByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ)).toBeInTheDocument();
    });
  });
});
