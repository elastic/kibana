/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createRef, useEffect } from 'react';
import {
  fireEvent,
  act,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import {
  CELL_ACTIONS_TRIGGER_TEST_SUBJ,
  CELL_EXPAND_BUTTON_TEST_SUBJ,
  CELL_EXPANSION_CLOSE_TEST_SUBJ,
  CELL_EXPANSION_POPOVER_TEST_SUBJ,
} from '../constants';
import type {
  DataGridCellPopoverProps,
  DataGridColumn,
  DataGridControlColumn,
  DataGridProps,
  DataGridRef,
} from '../types';
import { getLinesRowHeight } from '../utils/row_height';
import { mockHeaderLayout } from '../test_utils/mock_header_layout';
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

    it('keeps the actions of a hovered cell mounted when it loses focus', async () => {
      render(<DataGrid {...defaultProps} />);
      const valueCell = getCell('valueA');
      await userEvent.hover(valueCell);
      valueCell.focus();
      expect(
        await within(valueCell).findByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ)
      ).toBeInTheDocument();

      // E.g. the focus trap of another cell's popover takes the focus.
      valueCell.blur();
      expect(within(valueCell).getByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ)).toBeInTheDocument();

      await userEvent.unhover(valueCell);
      expect(
        within(valueCell).queryByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ)
      ).not.toBeInTheDocument();
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

    it('moves the popover to another cell when its expand button is clicked', async () => {
      render(<DataGrid {...defaultProps} />);
      const cellA = getCell('valueA');
      await userEvent.hover(cellA);
      await userEvent.click(await within(cellA).findByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ));
      expect(
        within(await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ)).getByText(
          'details of valueA'
        )
      ).toBeInTheDocument();

      const cellB = getCell('valueB');
      await userEvent.hover(cellB);
      await userEvent.click(await within(cellB).findByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ));

      const popovers = await screen.findAllByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);
      expect(popovers).toHaveLength(1);
      expect(within(popovers[0]).getByText('details of valueB')).toBeInTheDocument();
    });

    it('can leave out the close button of the popover, for cells that have their own', async () => {
      render(
        <DataGrid {...defaultProps} rows={[mockRows[0]]} showCellPopoverCloseButton={false} />
      );
      const valueCell = getCell('valueA');
      await userEvent.hover(valueCell);
      await userEvent.click(await within(valueCell).findByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ));

      const popover = await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);
      expect(within(popover).getByText('details of valueA')).toBeInTheDocument();
      expect(within(popover).queryByTestId(CELL_EXPANSION_CLOSE_TEST_SUBJ)).not.toBeInTheDocument();
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

  it('only renders the columns within the viewport, and keeps the control columns', () => {
    const manyColumns: Array<DataGridColumn<TestRow>> = Array.from({ length: 100 }, (_, index) => ({
      id: `column${index}`,
      header: `Column ${index}`,
      initialWidth: 200,
      renderCell: ({ row }) => `${row.id} ${index}`,
    }));
    render(
      <DataGrid
        {...defaultProps}
        columns={manyColumns}
        trailingControlColumns={[
          { id: 'trailing', header: 'Trailing', width: 40, renderCell: () => 'end' },
        ]}
      />
    );

    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBeLessThan(20);
    expect(headers[0]).toHaveAttribute('data-gridcell-column-id', 'control');
    expect(headers[headers.length - 1]).toHaveAttribute('data-gridcell-column-id', 'trailing');
    expect(screen.getByTestId('testGrid')).toHaveAttribute('aria-colcount', '102');
    // Control columns are sticky, the others scroll.
    expect(headers[0].style.left).toBe('0px');
    expect(headers[headers.length - 1].style.right).toBe('0px');
    expect(headers[1].style.left).toBe('');
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
    expect(screen.getByText('end rowA').closest('[role="gridcell"]')).toHaveAttribute(
      'aria-colindex',
      '4'
    );
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

  describe('many columns', () => {
    const manyColumns: Array<DataGridColumn<TestRow>> = Array.from(
      { length: 2000 },
      (_, index) => ({
        id: `column${index}`,
        header: `Column ${index}`,
        initialWidth: 200,
        renderCell: ({ row }) => `${row.id} c${index}`,
      })
    );

    it('renders a handful of cells per row, whatever the number of columns', () => {
      render(<DataGrid {...defaultProps} columns={manyColumns} />);
      const firstRow = screen.getAllByRole('row').find((row) => row.hasAttribute('data-index'))!;
      // 800px of columns of 200px, a few more as overscan, and the control column.
      expect(within(firstRow).getAllByRole('gridcell').length).toBeLessThan(15);
      expect(screen.getByTestId('testGrid')).toHaveAttribute('aria-colcount', '2001');
    });

    it('renders the columns that scroll into view, and drops the ones that leave it', () => {
      render(<DataGrid {...defaultProps} columns={manyColumns} />);
      expect(screen.queryByTestId('dataGridHeaderCell-column100')).not.toBeInTheDocument();

      const grid = screen.getByTestId('testGrid');
      Object.defineProperty(grid, 'scrollLeft', { value: 100 * 200, configurable: true });
      fireEvent.scroll(grid);

      expect(screen.getByTestId('dataGridHeaderCell-column101')).toBeInTheDocument();
      expect(screen.queryByTestId('dataGridHeaderCell-column0')).not.toBeInTheDocument();
      // The control column stays.
      expect(screen.getByTestId('dataGridHeaderCell-control')).toBeInTheDocument();
      expect(screen.getByText('rowA c101')).toBeInTheDocument();
    });

    it('keeps the first data columns in view while the others scroll, with their offsets', () => {
      render(<DataGrid {...defaultProps} columns={manyColumns} stickyColumnCount={2} />);
      const grid = screen.getByTestId('testGrid');
      Object.defineProperty(grid, 'scrollLeft', { value: 100 * 200, configurable: true });
      fireEvent.scroll(grid);

      // After the control column of 32px.
      expect(screen.getByTestId('dataGridHeaderCell-column0').style.left).toBe('32px');
      expect(screen.getByTestId('dataGridHeaderCell-column1').style.left).toBe('232px');
      expect(screen.getByText('rowA c0')).toBeInTheDocument();
      expect(screen.getByText('rowA c1')).toBeInTheDocument();
      expect(screen.getByTestId('dataGridHeaderCell-column101')).toBeInTheDocument();
      expect(screen.queryByTestId('dataGridHeaderCell-column2')).not.toBeInTheDocument();
      // Keyboard navigation still starts on the first data column.
      expect(screen.getByTestId('dataGridHeaderCell-column0')).toHaveAttribute('tabindex', '-1');
      expect(screen.getByText('rowA c0').closest('[role="gridcell"]')).toHaveAttribute(
        'tabindex',
        '0'
      );
    });

    it('moves keyboard focus to a column that is not rendered', async () => {
      const gridRef = createRef<DataGridRef>();
      render(<DataGrid {...defaultProps} columns={manyColumns} gridRef={gridRef} />);
      // jsdom does not scroll, do what a browser does when the grid is told to.
      const grid = screen.getByTestId('testGrid');
      grid.scrollTo = (...args: [ScrollToOptions?] | [number, number]) => {
        const [options] = args;
        if (typeof options !== 'object') {
          return;
        }
        if (options.left !== undefined) {
          Object.defineProperty(grid, 'scrollLeft', { value: options.left, configurable: true });
        }
        if (options.top !== undefined) {
          Object.defineProperty(grid, 'scrollTop', { value: options.top, configurable: true });
        }
        fireEvent.scroll(grid);
      };

      act(() => gridRef.current?.setFocusedCell({ rowIndex: 0, columnId: 'column500' }));
      await waitFor(() =>
        expect(screen.getByText('rowA c500').closest('[role="gridcell"]')).toHaveFocus()
      );
    });
  });

  describe('copying a selection', () => {
    // EUI renders the markers of tabular copy empty in jest, so the pasted text is not testable here.
    it('does not let the text of control columns be selected', () => {
      render(<DataGrid {...defaultProps} />);
      const row = screen.getAllByRole('row').find((r) => r.hasAttribute('data-index'))!;
      const [control, name] = within(row).getAllByRole('gridcell');
      expect(control).toHaveStyle({ userSelect: 'none' });
      expect(name).not.toHaveStyle({ userSelect: 'none' });
    });
    it('centers the content of control columns, at the top of the row', () => {
      render(<DataGrid {...defaultProps} />);
      const row = screen.getAllByRole('row').find((r) => r.hasAttribute('data-index'))!;
      const [control, name] = within(row).getAllByRole('gridcell');
      expect(control).toHaveStyle({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      });
      expect(name).not.toHaveStyle({ justifyContent: 'center' });

      // The header of a control column is centered the same way, its content only as wide as it is.
      const controlHeader = screen.getByTestId('dataGridHeaderCell-control');
      expect(controlHeader).toHaveStyle({ justifyContent: 'center' });
      expect(controlHeader.firstElementChild).toHaveStyle({ flex: '0 1 auto' });

      // No padding on the sides in the header or in the cells: their icons share one center line.
      [control, controlHeader].forEach((element) =>
        expect(element).toHaveStyle({ paddingLeft: '0px', paddingRight: '0px' })
      );
    });
  });

  describe('header style', () => {
    it('does not let the text of a header be selected', () => {
      render(<DataGrid {...defaultProps} />);
      expect(screen.getByTestId('dataGridHeaderCell-name')).toHaveStyle({ userSelect: 'none' });
    });

    it('starts the content of a header of several lines at the top', () => {
      const { rerender } = render(<DataGrid {...defaultProps} />);
      expect(screen.getByTestId('dataGridHeaderCell-name')).toHaveStyle({ alignItems: 'center' });

      rerender(<DataGrid {...defaultProps} headerRowHeight="auto" />);
      expect(screen.getByTestId('dataGridHeaderCell-name')).toHaveStyle({
        alignItems: 'flex-start',
      });
    });

    it('does not draw a line after the control columns', () => {
      render(<DataGrid {...defaultProps} />);
      const shadow = (testId: string) => getComputedStyle(screen.getByTestId(testId)).boxShadow;
      expect(shadow('dataGridHeaderCell-control')).toBe('');
      expect(shadow('dataGridHeaderCell-name')).toBe('');
    });

    it('marks the edge of the sticky columns with a shadow', () => {
      render(<DataGrid {...defaultProps} stickyColumnCount={1} />);
      expect(screen.getByTestId('dataGridHeaderCell-name').style.left).toBe('32px');
      const shadow = (testId: string) => getComputedStyle(screen.getByTestId(testId)).boxShadow;
      expect(shadow('dataGridHeaderCell-name')).toContain('1px 0 0');
      // Not the columns that scroll, nor the sticky column before the last one.
      expect(shadow('dataGridHeaderCell-value')).toBe('');
      expect(shadow('dataGridHeaderCell-control')).toBe('');
    });
  });

  describe('row hover with sticky columns', () => {
    it('hovers over an opaque row color, so sticky cells do not show what scrolls under them', () => {
      render(<DataGrid {...defaultProps} />);
      const sheetsText = Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .map((rule) => rule.cssText)
        .join('\n');
      const hoverRule = sheetsText
        .split('\n')
        .find(
          (rule) =>
            rule.includes('data-row-hover="highlight"') &&
            rule.includes(':hover') &&
            !rule.includes('data-stripes')
        )!;
      expect(hoverRule).toContain('background-color');
      expect(hoverRule).toContain('linear-gradient');
    });
  });

  describe('rendering', () => {
    it('does not render cell values again while a column is resized', async () => {
      const renders: Record<string, number> = {};
      const countedColumns: Array<DataGridColumn<TestRow>> = ['a', 'b', 'c'].map((id) => ({
        id,
        header: id,
        initialWidth: 150,
        isResizable: true,
        renderCell: ({ row }) => {
          renders[id] = (renders[id] ?? 0) + 1;
          return `${id} ${row.id}`;
        },
      }));
      const { container } = render(
        <DataGrid {...defaultProps} leadingControlColumns={undefined} columns={countedColumns} />
      );
      const before = { ...renders };

      fireEvent.mouseDown(container.querySelectorAll('[role="presentation"]')[1], { clientX: 100 });
      fireEvent.mouseMove(document, { clientX: 130 });
      await waitFor(() =>
        expect(screen.getByTestId('dataGridHeaderCell-b').style.width).toBe('180px')
      );

      // Only the cells of the resized column get the new width, no value depends on it.
      expect(screen.getAllByText(/^b row/)[0].closest('[role="gridcell"]')).toHaveStyle({
        width: '180px',
      });
      expect(renders.b).toBe(before.b);
      expect(renders.a).toBe(before.a);
      expect(renders.c).toBe(before.c);
      fireEvent.mouseUp(document);
    });

    it('does not render the value of a cell again when it is hovered or focused', async () => {
      const renderCell = jest.fn(({ row }: { row: TestRow }) => row.value);
      render(
        <DataGrid
          {...defaultProps}
          rows={[mockRows[0]]}
          columns={[columns[0], { ...columns[1], renderCell }]}
        />
      );
      const callsAfterFirstRender = renderCell.mock.calls.length;
      const valueCell = getCell('valueA');

      await userEvent.hover(valueCell);
      await openCellActionsBubble(valueCell);
      await userEvent.unhover(valueCell);
      act(() => valueCell.focus());
      act(() => valueCell.blur());

      expect(renderCell).toHaveBeenCalledTimes(callsAfterFirstRender);
    });

    it('estimates the height of rows with a number of lines from the line count', () => {
      const themeContext = renderHook(() => useEuiTheme()).result.current;
      const manyRows = Array.from({ length: 200 }, (_, index) => buildRow(`row${index}`, 'v'));
      // Without a viewport height only the overscan rows render, and they measure 0px: the total
      // height is the estimate of the other rows.
      const offsetHeight = jest
        .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
        .mockReturnValue(0);
      const getEstimatedRowHeight = (container: HTMLElement) => {
        const totalHeight = parseFloat(
          container.querySelector<HTMLElement>('[role="grid"] > div:nth-child(2)')!.style.height
        );
        const measuredCount = container.querySelectorAll('[role="row"][data-index]').length;
        return totalHeight / (manyRows.length - measuredCount);
      };
      const getExpected = (lineCount: number) =>
        getLinesRowHeight(themeContext, {
          lineCount,
          fontSize: 's',
          cellPadding: 'l',
          hasBorder: true,
        });

      try {
        const { container, rerender } = render(
          <DataGrid {...defaultProps} rows={manyRows} rowHeight={{ lineCount: 1 }} />
        );
        expect(getEstimatedRowHeight(container)).toBe(getExpected(1));

        rerender(<DataGrid {...defaultProps} rows={manyRows} rowHeight={{ lineCount: 3 }} />);
        expect(getEstimatedRowHeight(container)).toBe(getExpected(3));
        expect(getExpected(3)).toBeGreaterThan(getExpected(1));
      } finally {
        offsetHeight.mockReturnValue(600);
      }
    });

    it('does not render the cells again when the columns are built anew but did not change', () => {
      const renderCell = jest.fn(({ row }: { row: TestRow }) => row.value);
      const stableColumns: Array<DataGridColumn<TestRow>> = [{ ...columns[1], renderCell }];
      const { rerender } = render(<DataGrid {...defaultProps} columns={stableColumns} />);
      const callsAfterFirstRender = renderCell.mock.calls.length;
      expect(callsAfterFirstRender).toBeGreaterThan(0);

      rerender(<DataGrid {...defaultProps} columns={[...stableColumns]} />);
      expect(renderCell).toHaveBeenCalledTimes(callsAfterFirstRender);
    });
  });

  describe('cell appearance and behavior', () => {
    it('lets the content of a cell set attributes of the cell', () => {
      const ColoredCell = ({
        row,
        setCellProps,
      }: {
        row: TestRow;
        setCellProps: (props: { className: string }) => void;
      }) => {
        useEffect(() => setCellProps({ className: `colored-${row.id}` }), [row.id, setCellProps]);
        return <span>{row.value}</span>;
      };
      render(
        <DataGrid
          {...defaultProps}
          columns={[
            {
              ...columns[1],
              renderCell: ({ row, setCellProps }) => (
                <ColoredCell row={row} setCellProps={setCellProps} />
              ),
            },
          ]}
        />
      );
      expect(getCell('valueA')).toHaveClass('colored-rowA');
      expect(getCell('valueB')).toHaveClass('colored-rowB');
    });

    it('tells the cells their position and whether they can be expanded', () => {
      const renderCell = jest.fn(() => 'x');
      render(
        <DataGrid
          {...defaultProps}
          rows={[mockRows[0]]}
          columns={[
            { ...columns[0], renderCell },
            { ...columns[1], isExpandable: false, renderCell },
          ]}
        />
      );
      expect(renderCell).toHaveBeenCalledWith(
        expect.objectContaining({ columnId: 'name', colIndex: 1, isExpandable: true })
      );
      expect(renderCell).toHaveBeenCalledWith(
        expect.objectContaining({ columnId: 'value', colIndex: 2, isExpandable: false })
      );
    });

    it('tells the cell actions the 0-based position of their column, like renderCell', async () => {
      const actionColIndexes: number[] = [];
      const PositionAction = ({ colIndex, Component }: EuiDataGridColumnCellActionProps) => {
        actionColIndexes.push(colIndex);
        return <Component iconType="number" aria-label="Position" />;
      };
      const renderCell = jest.fn(({ row }: { row: TestRow }) => row.value);
      render(
        <DataGrid
          {...defaultProps}
          rows={[mockRows[0]]}
          columns={[columns[0], { ...columns[1], cellActions: [PositionAction], renderCell }]}
        />
      );
      const valueCell = getCell('valueA');
      await userEvent.hover(valueCell);
      await openCellActionsBubble(valueCell);

      expect(renderCell).toHaveBeenCalledWith(expect.objectContaining({ colIndex: 2 }));
      expect(actionColIndexes.length).toBeGreaterThan(0);
      expect(new Set(actionColIndexes)).toEqual(new Set([2]));
    });

    it('does not offer to expand cells of a column that is not expandable', async () => {
      render(
        <DataGrid
          {...defaultProps}
          columns={[columns[0], { ...columns[1], isExpandable: false }]}
        />
      );
      const valueCell = getCell('valueA');
      await userEvent.hover(valueCell);
      await userEvent.hover(await within(valueCell).findByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ));
      await screen.findByTestId('copyButton-0');
      expect(screen.queryByTestId(CELL_EXPAND_BUTTON_TEST_SUBJ)).not.toBeInTheDocument();
    });

    it('only shows the first visibleCellActions in the bubble', async () => {
      render(
        <DataGrid
          {...defaultProps}
          columns={[columns[0], { ...columns[1], visibleCellActions: 0 }]}
        />
      );
      const valueCell = getCell('valueA');
      await userEvent.hover(valueCell);
      await userEvent.hover(await within(valueCell).findByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ));
      await screen.findByTestId(CELL_EXPAND_BUTTON_TEST_SUBJ);
      expect(screen.queryByTestId('copyButton-0')).not.toBeInTheDocument();
    });

    it('describes the look of the grid with attributes', () => {
      render(
        <DataGrid
          {...defaultProps}
          gridStyle={{ cellPadding: 'm', fontSize: 'l', border: 'all', stripes: false }}
          rowHeight={{ lineCount: 3 }}
        />
      );
      expect(screen.getByTestId('testGrid')).toHaveAttribute('data-cell-padding', 'm');
      expect(screen.getByTestId('testGrid')).toHaveAttribute('data-font-size', 'l');
      expect(screen.getByTestId('testGrid')).toHaveAttribute('data-border', 'all');
      expect(screen.getByTestId('testGrid')).toHaveAttribute('data-stripes', 'false');
      // The rest of the style keeps its default.
      expect(screen.getByTestId('testGrid')).toHaveAttribute('data-header', 'underline');
      expect(screen.getByTestId('testGrid')).toHaveAttribute('data-row-height', 'lines');
    });
  });

  it('keeps the text of a single-line row on one line, unlike rows of several lines', () => {
    const { rerender } = render(<DataGrid {...defaultProps} rowHeight={{ lineCount: 1 }} />);
    expect(screen.getByTestId('testGrid')).toHaveAttribute('data-row-height', 'single');
    expect(getCell('valueA').querySelector('.kbnDataGrid__cellContent')).toHaveStyle({
      whiteSpace: 'nowrap',
    });

    rerender(<DataGrid {...defaultProps} rowHeight={{ lineCount: 2 }} />);
    expect(screen.getByTestId('testGrid')).toHaveAttribute('data-row-height', 'lines');
    expect(getCell('valueA').querySelector('.kbnDataGrid__cellContent')).toHaveStyle({
      whiteSpace: 'pre-wrap',
    });
  });

  describe('custom cell popover', () => {
    // Like a consumer would, changing the panel from an effect.
    const CustomPopover = ({
      DefaultPopoverContent,
      setPopoverProps,
      columnId,
    }: DataGridCellPopoverProps<TestRow>) => {
      useEffect(
        () => setPopoverProps({ panelClassName: `popover-${columnId}` }),
        [setPopoverProps, columnId]
      );
      return (
        <>
          <div>custom header</div>
          <DefaultPopoverContent />
        </>
      );
    };

    it('lets the consumer extend the default popover and change its panel', async () => {
      render(
        <DataGrid
          {...defaultProps}
          rows={[mockRows[0]]}
          renderCellPopover={(props) => <CustomPopover {...props} />}
        />
      );
      const valueCell = getCell('valueA');
      await userEvent.hover(valueCell);
      await userEvent.click(await within(valueCell).findByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ));

      const popover = await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);
      expect(within(popover).getByText('custom header')).toBeInTheDocument();
      expect(within(popover).getByText('details of valueA')).toBeInTheDocument();
      expect(popover).toHaveClass('popover-value');
    });
  });

  describe('grid ref', () => {
    it('opens and closes the cell popover, and focuses cells', async () => {
      const gridRef = createRef<DataGridRef>();
      render(<DataGrid {...defaultProps} gridRef={gridRef} />);

      act(() => gridRef.current?.openCellPopover({ rowIndex: 1, columnId: 'value' }));
      const popover = await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);
      expect(within(popover).getByText('details of valueB')).toBeInTheDocument();

      act(() => gridRef.current?.closeCellPopover());
      await waitFor(() =>
        expect(screen.queryByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ)).not.toBeInTheDocument()
      );

      act(() => gridRef.current?.setFocusedCell({ rowIndex: 0, columnId: 'name' }));
      expect(screen.getByText('name rowA').closest('[role="gridcell"]')).toHaveFocus();
    });

    it('reports the scroll position and size of the grid once per frame', async () => {
      const onScroll = jest.fn();
      const onScrollOffsetChange = jest.fn();
      render(
        <DataGrid
          {...defaultProps}
          onScroll={onScroll}
          onScrollOffsetChange={onScrollOffsetChange}
        />
      );
      const grid = screen.getByTestId('testGrid');
      fireEvent.scroll(grid, { target: { scrollTop: 20 } });
      fireEvent.scroll(grid, { target: { scrollTop: 40 } });
      // Read at the start of the next frame, not in the scroll event.
      expect(onScrollOffsetChange).not.toHaveBeenCalled();

      await waitFor(() => expect(onScrollOffsetChange).toHaveBeenCalledWith(40));
      expect(onScrollOffsetChange).toHaveBeenCalledTimes(1);
      expect(onScroll).toHaveBeenCalledTimes(1);
      expect(onScroll).toHaveBeenCalledWith(expect.objectContaining({ scrollTop: 40 }));
    });

    it('reports the last scroll position when it unmounts before the next frame', () => {
      const onScrollOffsetChange = jest.fn();
      const { unmount } = render(
        <DataGrid {...defaultProps} onScrollOffsetChange={onScrollOffsetChange} />
      );
      fireEvent.scroll(screen.getByTestId('testGrid'), { target: { scrollTop: 60 } });
      unmount();
      expect(onScrollOffsetChange).toHaveBeenCalledWith(60);
    });
  });

  describe('column header actions', () => {
    // name: text values, value: numbers
    const sortableColumns: Array<DataGridColumn<TestRow>> = [
      { ...columns[0], isSortable: true, actions: { showHide: { iconType: 'cross' } } },
      { ...columns[1], isSortable: true, schema: 'numeric' },
    ];
    const getActionsButton = async (columnId: string) =>
      screen.findByTestId(`dataGridHeaderCellActionButton-${columnId}`);
    // The popover panel ignores the pointer while it opens.
    const openMenu = async (columnId: string) => {
      await userEvent.click(await getActionsButton(columnId));
      const menu = await screen.findByTestId(`dataGridHeaderCellActionGroup-${columnId}`);
      await waitFor(() => expect(getComputedStyle(menu).pointerEvents).not.toBe('none'));
      return menu;
    };

    it('only mounts the menu of a header once it is opened, by clicking the header', async () => {
      render(
        <DataGrid
          {...defaultProps}
          columns={sortableColumns}
          sorting={{ columns: [], onSort: jest.fn() }}
        />
      );
      expect(screen.queryByTestId('dataGridHeaderCellActionGroup-name')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-name'));
      expect(await screen.findByTestId('dataGridHeaderCellActionGroup-name')).toBeInTheDocument();
      expect(screen.queryByTestId('dataGridHeaderCellActionGroup-value')).not.toBeInTheDocument();
    });

    it('separates the actions of the menu in groups, ending with removing the column', async () => {
      render(
        <DataGrid
          {...defaultProps}
          columns={[
            {
              ...sortableColumns[0],
              actions: {
                showHide: { iconType: 'cross' },
                additional: [{ id: 'copy', label: 'Copy name', onClick: jest.fn() }],
              },
            },
            sortableColumns[1],
          ]}
          sorting={{ columns: [], onSort: jest.fn() }}
          onMoveColumn={jest.fn()}
          onHideColumn={jest.fn()}
        />
      );
      await userEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-name'));
      const menu = await screen.findByTestId('dataGridHeaderCellActionGroup-name');

      // copy, sort, move and remove, with a divider between each.
      expect(menu.querySelectorAll('.euiHorizontalRule')).toHaveLength(3);
      const labels = within(menu)
        .getAllByRole('button')
        .map((button) => button.textContent);
      expect(labels).toEqual([
        'Copy name',
        'Sort A → Z',
        'Sort Z → A',
        'Move left',
        'Move right',
        'Hide column',
      ]);
    });

    it('shows the sort indicator of the sorted columns', () => {
      render(
        <DataGrid
          {...defaultProps}
          columns={sortableColumns}
          sorting={{ columns: [{ id: 'name', direction: 'desc' }], onSort: jest.fn() }}
        />
      );
      expect(screen.getByTestId('dataGridHeaderCell-name')).toHaveAttribute(
        'aria-sort',
        'descending'
      );
      expect(screen.getByTestId('dataGridHeaderCellSortIndicator-name')).toBeInTheDocument();
      expect(screen.getByTestId('dataGridHeaderCell-value')).not.toHaveAttribute('aria-sort');
    });

    it('sorts from the menu, wording the actions by the kind of values, and unsorts', async () => {
      const onSort = jest.fn();
      const { rerender } = render(
        <DataGrid
          {...defaultProps}
          columns={sortableColumns}
          sorting={{ columns: [{ id: 'value', direction: 'asc' }], onSort }}
        />
      );

      const menu = await openMenu('name');
      expect(within(menu).getByText('Sort A → Z')).toBeInTheDocument();
      await userEvent.click(within(menu).getByTestId('gridSortDescendingButton'));
      expect(onSort).toHaveBeenLastCalledWith([
        { id: 'value', direction: 'asc' },
        { id: 'name', direction: 'desc' },
      ]);

      rerender(
        <DataGrid
          {...defaultProps}
          columns={sortableColumns}
          sorting={{ columns: [{ id: 'value', direction: 'asc' }], onSort }}
        />
      );
      const valueMenu = await openMenu('value');
      expect(within(valueMenu).getByText('Unsort ascending')).toBeInTheDocument();
      await userEvent.click(within(valueMenu).getByTestId('gridSortAscendingButton'));
      expect(onSort).toHaveBeenLastCalledWith([]);
    });

    it('words the sort actions with the labels of the column', async () => {
      render(
        <DataGrid
          {...defaultProps}
          columns={[
            {
              ...sortableColumns[1],
              actions: { sortLabels: { asc: 'Sort ascending', desc: 'Sort descending' } },
            },
          ]}
          sorting={{ columns: [], onSort: jest.fn() }}
        />
      );
      const menu = await openMenu('value');
      expect(within(menu).getByText('Sort ascending')).toBeInTheDocument();
      expect(within(menu).getByText('Sort descending')).toBeInTheDocument();
      expect(within(menu).queryByText('Sort Low-High')).not.toBeInTheDocument();
    });

    it('moves and hides columns from the menu', async () => {
      const onMoveColumn = jest.fn();
      const onHideColumn = jest.fn();
      render(
        <DataGrid
          {...defaultProps}
          columns={sortableColumns}
          onMoveColumn={onMoveColumn}
          onHideColumn={onHideColumn}
        />
      );
      await userEvent.click(within(await openMenu('name')).getByTestId('gridMoveColumnRight'));
      expect(onMoveColumn).toHaveBeenCalledWith({ columnId: 'name', direction: 'right' });

      await userEvent.click(within(await openMenu('name')).getByTestId('gridHideColumn'));
      expect(onHideColumn).toHaveBeenCalledWith('name');
    });

    it('only disables moving past the first and last data column, not the control columns', async () => {
      const trailingControlColumns: Array<DataGridControlColumn<TestRow>> = [
        { id: 'trailing', header: 'Trailing', width: 32, renderCell: () => 'trailing' },
      ];
      render(
        <DataGrid
          {...defaultProps}
          columns={sortableColumns}
          trailingControlColumns={trailingControlColumns}
          onMoveColumn={jest.fn()}
        />
      );

      const nameMenu = await openMenu('name');
      expect(within(nameMenu).getByTestId('gridMoveColumnLeft')).toBeDisabled();
      expect(within(nameMenu).getByTestId('gridMoveColumnRight')).toBeEnabled();
      await userEvent.keyboard('{Escape}');

      const valueMenu = await openMenu('value');
      expect(within(valueMenu).getByTestId('gridMoveColumnLeft')).toBeEnabled();
      expect(within(valueMenu).getByTestId('gridMoveColumnRight')).toBeDisabled();
    });

    it('offers additional actions, and opens the menu with Enter on the header', async () => {
      const onClick = jest.fn();
      render(
        <DataGrid
          {...defaultProps}
          columns={[
            {
              ...columns[0],
              actions: { additional: [{ id: 'copy', label: 'Copy name', onClick }] },
            },
            { ...columns[1], actions: false },
          ]}
        />
      );
      act(() => screen.getByTestId('dataGridHeaderCell-name').focus());
      await userEvent.keyboard('{Enter}');
      const menu = await screen.findByTestId('dataGridHeaderCellActionGroup-name');
      await waitFor(() => expect(getComputedStyle(menu).pointerEvents).not.toBe('none'));
      await userEvent.click(within(menu).getByText('Copy name'));
      expect(onClick).toHaveBeenCalled();
      // Columns without any action have no menu.
      expect(screen.queryByTestId('dataGridHeaderCellActionButton-value')).not.toBeInTheDocument();
    });
  });

  describe('reordering columns by dragging their headers', () => {
    // Headers laid out next to each other by their column id.
    const headerRects: Record<string, { left: number; width: number }> = {
      control: { left: 0, width: 32 },
      name: { left: 32, width: 200 },
      value: { left: 232, width: 200 },
    };
    const sortableColumns: Array<DataGridColumn<TestRow>> = [
      { ...columns[0], isSortable: true },
      { ...columns[1], isSortable: true },
    ];
    let restoreLayout: () => void;
    beforeAll(() => {
      restoreLayout = mockHeaderLayout(headerRects);
    });
    afterAll(() => restoreLayout());

    const getHeader = (columnId: string) => screen.getByTestId(`dataGridHeaderCell-${columnId}`);
    const drag = (columnId: string, toX: number) => {
      const fromX = headerRects[columnId].left + 20;
      fireEvent.pointerDown(getHeader(columnId), { clientX: fromX, button: 0 });
      fireEvent.pointerMove(document, { clientX: fromX + 10 });
      fireEvent.pointerMove(document, { clientX: toX });
    };

    it('moves a column to where its header is dropped, without opening its menu', () => {
      const onReorderColumn = jest.fn();
      render(
        <DataGrid
          {...defaultProps}
          columns={sortableColumns}
          sorting={{ columns: [], onSort: jest.fn() }}
          onReorderColumn={onReorderColumn}
        />
      );

      drag('name', 400);
      expect(getHeader('name')).toHaveAttribute('data-drag-state', 'dragging');
      expect(getHeader('value')).toHaveAttribute('data-drag-state', 'dropAfter');

      fireEvent.pointerUp(document, { clientX: 400 });
      fireEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-name'));
      expect(onReorderColumn).toHaveBeenCalledWith({ columnId: 'name', toIndex: 1 });
      expect(screen.queryByTestId('dataGridHeaderCellActionGroup-name')).not.toBeInTheDocument();
      expect(getHeader('name')).not.toHaveAttribute('data-drag-state');
    });

    it('moves a column before the one it is dropped on the left half of', () => {
      const onReorderColumn = jest.fn();
      render(
        <DataGrid {...defaultProps} columns={sortableColumns} onReorderColumn={onReorderColumn} />
      );
      drag('value', 50);
      expect(getHeader('name')).toHaveAttribute('data-drag-state', 'dropBefore');
      fireEvent.pointerUp(document, { clientX: 50 });
      expect(onReorderColumn).toHaveBeenCalledWith({ columnId: 'value', toIndex: 0 });
    });

    it('does not move a column dropped where it already is, nor control columns', () => {
      const onReorderColumn = jest.fn();
      render(
        <DataGrid {...defaultProps} columns={sortableColumns} onReorderColumn={onReorderColumn} />
      );
      drag('name', 100);
      fireEvent.pointerUp(document, { clientX: 100 });

      fireEvent.pointerDown(getHeader('control'), { clientX: 10, button: 0 });
      fireEvent.pointerMove(document, { clientX: 400 });
      fireEvent.pointerUp(document, { clientX: 400 });
      expect(onReorderColumn).not.toHaveBeenCalled();
    });

    it('treats a press without movement as a click, and cancels a drag with Escape', () => {
      const onReorderColumn = jest.fn();
      render(
        <DataGrid {...defaultProps} columns={sortableColumns} onReorderColumn={onReorderColumn} />
      );
      fireEvent.pointerDown(getHeader('name'), { clientX: 50, button: 0 });
      fireEvent.pointerMove(document, { clientX: 52 });
      fireEvent.pointerUp(document, { clientX: 52 });
      expect(getHeader('value')).not.toHaveAttribute('data-drag-state');

      drag('name', 400);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(getHeader('name')).not.toHaveAttribute('data-drag-state');
      fireEvent.pointerUp(document, { clientX: 400 });
      expect(onReorderColumn).not.toHaveBeenCalled();
    });

    it('does not drag with touch or without onReorderColumn', () => {
      const onReorderColumn = jest.fn();
      const { rerender } = render(<DataGrid {...defaultProps} columns={sortableColumns} />);
      drag('name', 400);
      expect(getHeader('name')).not.toHaveAttribute('data-drag-state');
      fireEvent.pointerUp(document, { clientX: 400 });

      rerender(
        <DataGrid {...defaultProps} columns={sortableColumns} onReorderColumn={onReorderColumn} />
      );
      fireEvent.pointerDown(getHeader('name'), { clientX: 50, button: 0, pointerType: 'touch' });
      fireEvent.pointerMove(document, { clientX: 400 });
      fireEvent.pointerUp(document, { clientX: 400 });
      expect(onReorderColumn).not.toHaveBeenCalled();
    });
  });

  describe('column widths', () => {
    const getWidth = (columnId: string) =>
      screen
        .getAllByRole('columnheader')
        .find((header) => header.getAttribute('data-gridcell-column-id') === columnId)!.style.width;

    it('uses the initial width, and columnWidths over it', () => {
      const { rerender } = render(<DataGrid {...defaultProps} />);
      expect(getWidth('control')).toBe('32px');
      expect(getWidth('name')).toBe('200px');

      rerender(<DataGrid {...defaultProps} columnWidths={{ name: 300 }} />);
      expect(getWidth('name')).toBe('300px');
    });

    it('does not let control columns be resized', () => {
      render(<DataGrid {...defaultProps} columnWidths={{ control: 300 }} />);
      expect(getWidth('control')).toBe('32px');
    });

    it('reports a reset by double clicking the resize handle', async () => {
      const onColumnResize = jest.fn();
      const { container } = render(
        <DataGrid {...defaultProps} columnWidths={{ name: 300 }} onColumnResize={onColumnResize} />
      );
      await userEvent.dblClick(container.querySelector('[role="presentation"]')!);
      expect(onColumnResize).toHaveBeenCalledWith({ columnId: 'name', width: undefined });
    });

    it('resizes a column by dragging its handle and reports the final width', async () => {
      const onColumnResize = jest.fn();
      const { container } = render(<DataGrid {...defaultProps} onColumnResize={onColumnResize} />);
      const handle = container.querySelector('[role="presentation"]')!;

      fireEvent.mouseDown(handle, { clientX: 100 });
      fireEvent.mouseMove(document, { clientX: 150 });
      // The rows render once per frame while dragging.
      await waitFor(() => expect(getWidth('name')).toBe('250px'));
      // Not above the maximum or below the minimum of the column.
      fireEvent.mouseMove(document, { clientX: 0 });
      await waitFor(() => expect(getWidth('name')).toBe('100px'));
      expect(onColumnResize).not.toHaveBeenCalled();

      fireEvent.mouseMove(document, { clientX: 130 });
      fireEvent.mouseUp(document);
      expect(onColumnResize).toHaveBeenCalledTimes(1);
      expect(onColumnResize).toHaveBeenCalledWith({ columnId: 'name', width: 230 });
      expect(getWidth('name')).toBe('230px');
    });

    it('lets a controlled grid decide the width after a resize', async () => {
      const { container } = render(<DataGrid {...defaultProps} columnWidths={{ name: 300 }} />);
      const handle = container.querySelector('[role="presentation"]')!;

      fireEvent.mouseDown(handle, { clientX: 100 });
      fireEvent.mouseMove(document, { clientX: 150 });
      await waitFor(() => expect(getWidth('name')).toBe('350px'));
      fireEvent.mouseUp(document);
      expect(getWidth('name')).toBe('300px');
    });

    it('resizes a column without an initial width from its current width', () => {
      const onColumnResize = jest.fn();
      const { container } = render(
        <DataGrid
          {...defaultProps}
          onColumnResize={onColumnResize}
          columns={[{ ...columns[1], isResizable: true }]}
        />
      );
      const handle = container.querySelector('[role="presentation"]')!;
      fireEvent.mouseDown(handle, { clientX: 100 });
      fireEvent.mouseMove(document, { clientX: 150 });
      fireEvent.mouseUp(document);
      // The fill width of the column is the minimum in jsdom, which has no layout.
      expect(onColumnResize).toHaveBeenCalledWith({ columnId: 'value', width: 150 });
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

    it('keeps the content of cells out of the tab order until the cell is entered', async () => {
      render(<DataGrid {...defaultProps} />);
      const controlButton = screen.getByTestId('control-rowA');
      const controlCell = controlButton.closest<HTMLElement>('[role="gridcell"]')!;
      await waitFor(() => expect(controlButton).toHaveAttribute('tabindex', '-1'));
      expect(screen.getByTestId('control-rowB')).toHaveAttribute('tabindex', '-1');

      act(() => controlCell.focus());
      await userEvent.keyboard('{Enter}');
      expect(controlButton).toHaveFocus();
      expect(controlButton).not.toHaveAttribute('tabindex');

      await userEvent.keyboard('{Escape}');
      expect(controlCell).toHaveFocus();
      await waitFor(() => expect(controlButton).toHaveAttribute('tabindex', '-1'));
    });

    it('keeps the cell actions trigger of the focused cell tabbable', async () => {
      render(<DataGrid {...defaultProps} />);
      act(() => getCell('valueA').focus());
      const trigger = await within(getCell('valueA')).findByTestId(CELL_ACTIONS_TRIGGER_TEST_SUBJ);
      expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    it('keeps arrow keys and Escape pressed inside a cell from reaching parents', async () => {
      const onParentKeyDown = jest.fn();
      render(
        <div role="presentation" onKeyDown={onParentKeyDown}>
          <DataGrid {...defaultProps} />
        </div>
      );
      act(() => screen.getByTestId('control-rowA').focus());
      await userEvent.keyboard('{ArrowLeft}{Escape}');
      expect(onParentKeyDown).not.toHaveBeenCalled();
    });

    it('does not move focus into the cell actions toolbar when it opens on hover', async () => {
      render(<DataGrid {...defaultProps} />);
      await userEvent.hover(getCell('valueA'));
      await openCellActionsBubble(getCell('valueA'));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(screen.getByTestId(CELL_EXPAND_BUTTON_TEST_SUBJ)).not.toHaveFocus();
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

  describe('footer row', () => {
    const renderFooterCell = ({ columnId, isControl }: { columnId: string; isControl: boolean }) =>
      isControl ? null : `total of ${columnId}`;

    it('renders a row after the data rows with a cell for every column', () => {
      render(<DataGrid {...defaultProps} renderFooterCell={renderFooterCell} />);
      const grid = screen.getByTestId('testGrid');
      expect(grid).toHaveAttribute('aria-rowcount', '4');
      expect(grid).toHaveAttribute('data-footer', 'overline');
      const footerRow = screen.getByTestId('dataGridFooterCell-name').closest('[role="row"]');
      expect(footerRow).toHaveAttribute('aria-rowindex', '4');
      expect(
        within(footerRow as HTMLElement)
          .getAllByRole('gridcell')
          .map((cell) => cell.textContent)
      ).toEqual(['', 'total of name', 'total of value']);
      expect(screen.getByTestId('dataGridFooterCell-control')).toHaveAttribute(
        'aria-colindex',
        '1'
      );
    });

    it('does not render a footer row without renderFooterCell', () => {
      render(<DataGrid {...defaultProps} />);
      expect(screen.queryByTestId('dataGridFooterCell-name')).not.toBeInTheDocument();
      expect(screen.getByTestId('testGrid')).toHaveAttribute('aria-rowcount', '3');
    });

    it('takes the look of the footer from gridStyle', () => {
      render(
        <DataGrid
          {...defaultProps}
          renderFooterCell={renderFooterCell}
          gridStyle={{ footer: 'shade' }}
        />
      );
      expect(screen.getByTestId('testGrid')).toHaveAttribute('data-footer', 'shade');
    });

    it('can be reached with the arrow keys', async () => {
      render(<DataGrid {...defaultProps} renderFooterCell={renderFooterCell} />);
      getCell('valueB').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByTestId('dataGridFooterCell-value')).toHaveFocus();
      expect(screen.getByTestId('dataGridFooterCell-value')).toHaveAttribute('tabindex', '0');
      // It is the last row.
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByTestId('dataGridFooterCell-value')).toHaveFocus();
      await userEvent.keyboard('{ArrowUp}');
      expect(getCell('valueB')).toHaveFocus();
    });
  });

  describe('render complete', () => {
    it('tells when the grid rendered its rows, and again when they change', async () => {
      const onRenderComplete = jest.fn();
      const { rerender } = render(
        <DataGrid {...defaultProps} onRenderComplete={onRenderComplete} />
      );
      await waitFor(() => expect(onRenderComplete).toHaveBeenCalledTimes(1));
      expect(screen.getByText('valueA')).toBeInTheDocument();

      rerender(
        <DataGrid
          {...defaultProps}
          rows={[buildRow('rowC', 'valueC')]}
          onRenderComplete={onRenderComplete}
        />
      );
      await waitFor(() => expect(onRenderComplete).toHaveBeenCalledTimes(2));
    });

    it('does not tell again when it renders the same rows and columns', async () => {
      const onRenderComplete = jest.fn();
      const { rerender } = render(
        <DataGrid {...defaultProps} onRenderComplete={onRenderComplete} />
      );
      await waitFor(() => expect(onRenderComplete).toHaveBeenCalledTimes(1));
      rerender(<DataGrid {...defaultProps} onRenderComplete={jest.fn()} />);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(onRenderComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('control column headers', () => {
    it('names a header that renders no text', () => {
      render(
        <DataGrid
          {...defaultProps}
          leadingControlColumns={[
            { ...leadingControlColumns[0], header: null, headerAriaLabel: 'Row controls' },
          ]}
        />
      );
      expect(screen.getByRole('columnheader', { name: 'Row controls' })).toBeInTheDocument();
    });
  });
});
