/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createRef, useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  EuiDataGridCellPopoverElementProps,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridColumnCellActionProps,
  EuiDataGridControlColumn,
  EuiDataGridProps,
} from '@elastic/eui';
import { CELL_EXPANSION_POPOVER_TEST_SUBJ } from '../constants';
import type { EuiDataGridAdapterProps, EuiDataGridAdapterRef } from './eui_data_grid_adapter';
import { mockHeaderLayout } from '../test_utils/mock_header_layout';
import { EuiDataGridAdapter } from './eui_data_grid_adapter';

const values = [
  { name: 'alpha', count: 1 },
  { name: 'beta', count: 2 },
  { name: 'gamma', count: 3 },
];

// Like the cell renderers of consumers: a component that reads its row by index.
const CellValue = ({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) => {
  const value = values[rowIndex][columnId as 'name' | 'count'];
  useEffect(() => {
    setCellProps({ className: `cell-${rowIndex}` });
  }, [rowIndex, setCellProps]);
  return <span>{String(value)}</span>;
};

const columns: EuiDataGridColumn[] = [
  { id: 'name', displayAsText: 'Name', schema: 'string', isSortable: true },
  { id: 'count', displayAsText: 'Count', schema: 'numeric', isSortable: true, initialWidth: 120 },
];

const SelectHeader = () => <span>select all</span>;
const SelectCell = ({ rowIndex }: EuiDataGridCellValueElementProps) => (
  <button data-test-subj={`select-${rowIndex}`}>select</button>
);
const leadingControlColumns: EuiDataGridControlColumn[] = [
  { id: 'select', width: 24, headerCellRender: SelectHeader, rowCellRender: SelectCell },
];

const getProps = (overrides: Partial<EuiDataGridAdapterProps> = {}): EuiDataGridAdapterProps => ({
  'aria-label': 'Test table',
  'data-test-subj': 'adapter',
  columns,
  columnVisibility: { visibleColumns: ['name', 'count'], setVisibleColumns: jest.fn() },
  leadingControlColumns,
  rowCount: values.length,
  renderCellValue: CellValue,
  ...overrides,
});

describe('EuiDataGridAdapter', () => {
  // jsdom has no layout, give the scroll container a size so the virtualizer renders rows.
  beforeAll(() => {
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders the columns, control columns and the cells of the rows', () => {
    render(<EuiDataGridAdapter {...getProps()} />);

    expect(screen.getAllByRole('columnheader').map(({ textContent }) => textContent)).toEqual([
      'select all',
      'Name',
      'Count',
    ]);
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByTestId('select-1')).toBeInTheDocument();
    expect(screen.getByTestId('adapterGrid')).toHaveAttribute('aria-label', 'Test table');
    // The content of cells can set the attributes of its cell.
    expect(screen.getByText('beta').closest('[role="gridcell"]')).toHaveClass('cell-1');
  });

  it('only shows the visible columns, in their order', () => {
    render(
      <EuiDataGridAdapter
        {...getProps({
          columnVisibility: { visibleColumns: ['count'], setVisibleColumns: jest.fn() },
        })}
      />
    );
    expect(screen.getAllByRole('columnheader').map(({ textContent }) => textContent)).toEqual([
      'select all',
      'Count',
    ]);
  });

  it('uses the initial widths of the columns', () => {
    render(<EuiDataGridAdapter {...getProps({ gridStyle: { cellPadding: 's' } })} />);
    expect(screen.getByTestId('dataGridHeaderCell-count').style.width).toBe('120px');
    // Like in EuiDataGrid, the padding of the cells comes on top of the width of a control column.
    expect(screen.getByTestId('dataGridHeaderCell-select').style.width).toBe('32px');
  });

  it('sorts from the header menu and shows the sorting', async () => {
    const onSort = jest.fn();
    render(
      <EuiDataGridAdapter
        {...getProps({ sorting: { columns: [{ id: 'name', direction: 'asc' }], onSort } })}
      />
    );
    expect(screen.getByTestId('dataGridHeaderCell-name')).toHaveAttribute('aria-sort', 'ascending');

    await userEvent.hover(screen.getByTestId('dataGridHeaderCell-count'));
    await userEvent.click(await screen.findByTestId('dataGridHeaderCellActionButton-count'));
    const menu = await screen.findByTestId('dataGridHeaderCellActionGroup-count');
    await waitFor(() => expect(getComputedStyle(menu).pointerEvents).not.toBe('none'));
    // Numbers get their own wording.
    await userEvent.click(within(menu).getByText('Sort High-Low'));
    expect(onSort).toHaveBeenCalledWith([
      { id: 'name', direction: 'asc' },
      { id: 'count', direction: 'desc' },
    ]);
  });

  it('moves and hides columns by changing the visible columns', async () => {
    const setVisibleColumns = jest.fn();
    render(
      <EuiDataGridAdapter
        {...getProps({
          columnVisibility: { visibleColumns: ['name', 'count'], setVisibleColumns },
          columns: [
            { ...columns[0], actions: { showHide: true } },
            { ...columns[1], actions: { showHide: true } },
          ],
        })}
      />
    );
    const openMenu = async (columnId: string) => {
      await userEvent.hover(screen.getByTestId(`dataGridHeaderCell-${columnId}`));
      await userEvent.click(
        await screen.findByTestId(`dataGridHeaderCellActionButton-${columnId}`)
      );
      const menu = await screen.findByTestId(`dataGridHeaderCellActionGroup-${columnId}`);
      await waitFor(() => expect(getComputedStyle(menu).pointerEvents).not.toBe('none'));
      return menu;
    };

    await userEvent.click(within(await openMenu('name')).getByTestId('gridMoveColumnRight'));
    expect(setVisibleColumns).toHaveBeenLastCalledWith(['count', 'name']);

    await userEvent.click(within(await openMenu('count')).getByTestId('gridHideColumn'));
    expect(setVisibleColumns).toHaveBeenLastCalledWith(['name']);
  });

  describe('dragging headers', () => {
    // Headers laid out next to each other by their column id.
    const headerRects: Record<string, { left: number; width: number }> = {
      select: { left: 0, width: 40 },
      name: { left: 40, width: 200 },
      count: { left: 240, width: 120 },
    };
    let restoreLayout: () => void;
    beforeAll(() => {
      restoreLayout = mockHeaderLayout(headerRects);
    });
    afterAll(() => restoreLayout());

    const dragNameAfterCount = () => {
      fireEvent.pointerDown(screen.getByTestId('dataGridHeaderCell-name'), {
        clientX: 60,
        button: 0,
      });
      fireEvent.pointerMove(document, { clientX: 80 });
      fireEvent.pointerMove(document, { clientX: 350 });
      fireEvent.pointerUp(document, { clientX: 350 });
    };

    it('reorders the visible columns when canDragAndDropColumns is set, keeping unknown ids', () => {
      const setVisibleColumns = jest.fn();
      render(
        <EuiDataGridAdapter
          {...getProps({
            columnVisibility: {
              visibleColumns: ['name', 'missing', 'count'],
              setVisibleColumns,
              canDragAndDropColumns: true,
            },
          })}
        />
      );
      dragNameAfterCount();
      expect(setVisibleColumns).toHaveBeenCalledWith(['missing', 'count', 'name']);
    });

    it('does not reorder by dragging without canDragAndDropColumns, like EuiDataGrid', () => {
      const setVisibleColumns = jest.fn();
      render(
        <EuiDataGridAdapter
          {...getProps({
            columnVisibility: { visibleColumns: ['name', 'count'], setVisibleColumns },
          })}
        />
      );
      dragNameAfterCount();
      expect(setVisibleColumns).not.toHaveBeenCalled();
    });
  });

  it('adds the additional header actions of a column', async () => {
    const onClick = jest.fn();
    render(
      <EuiDataGridAdapter
        {...getProps({
          columns: [
            {
              ...columns[0],
              actions: { additional: [{ label: 'Copy name', onClick, 'data-test-subj': 'copy' }] },
            },
            columns[1],
          ],
        })}
      />
    );
    await userEvent.hover(screen.getByTestId('dataGridHeaderCell-name'));
    await userEvent.click(await screen.findByTestId('dataGridHeaderCellActionButton-name'));
    const menu = await screen.findByTestId('dataGridHeaderCellActionGroup-name');
    await waitFor(() => expect(getComputedStyle(menu).pointerEvents).not.toBe('none'));
    await userEvent.click(within(menu).getByTestId('copy'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows additional header actions whose label is a React element', async () => {
    render(
      <EuiDataGridAdapter
        {...getProps({
          columns: [
            {
              ...columns[0],
              actions: {
                // Like the copy actions of UnifiedDataTable, with a formatted message as label.
                additional: [
                  {
                    label: <span data-test-subj="elementLabel">Copy name</span>,
                    onClick: jest.fn(),
                  },
                ],
              },
            },
            columns[1],
          ],
        })}
      />
    );
    await userEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-name'));
    const menu = await screen.findByTestId('dataGridHeaderCellActionGroup-name');
    expect(within(menu).getByTestId('elementLabel')).toHaveTextContent('Copy name');
    expect(menu).not.toHaveTextContent('[object Object]');
  });

  describe('pagination', () => {
    it('shows the rows of the page, with their index in all rows', () => {
      const onChangePage = jest.fn();
      render(
        <EuiDataGridAdapter
          {...getProps({
            pagination: {
              pageIndex: 1,
              pageSize: 2,
              pageSizeOptions: [2, 4],
              onChangePage,
              onChangeItemsPerPage: jest.fn(),
            },
          })}
        />
      );
      expect(screen.queryByText('alpha')).not.toBeInTheDocument();
      expect(screen.getByText('gamma')).toBeInTheDocument();
      expect(screen.getByTestId('dataGridPagination')).toBeInTheDocument();
    });

    it('tells the cell actions the index of the row in all rows', async () => {
      const rowIndexes: number[] = [];
      const Action = ({ rowIndex, Component }: EuiDataGridColumnCellActionProps) => {
        rowIndexes.push(rowIndex);
        return (
          <Component
            iconType="plus"
            aria-label="Action"
            data-test-subj="action"
            onClick={() => {}}
          />
        );
      };
      render(
        <EuiDataGridAdapter
          {...getProps({
            columns: [{ ...columns[0], cellActions: [Action] }, columns[1]],
            pagination: {
              pageIndex: 1,
              pageSize: 2,
              pageSizeOptions: [2],
              onChangePage: jest.fn(),
              onChangeItemsPerPage: jest.fn(),
            },
          })}
        />
      );
      const cell = screen.getByText('gamma').closest<HTMLElement>('[role="gridcell"]')!;
      await userEvent.hover(cell);
      await within(cell).findByTestId('kbnDataGridCellActionsButton');
      await userEvent.hover(within(cell).getByTestId('kbnDataGridCellActionsButton'));
      await screen.findByTestId('action');
      expect(rowIndexes).toContain(2);
    });
  });

  describe('toolbar', () => {
    it('offers the controls and changes the density through the grid style', async () => {
      const onChange = jest.fn();
      render(
        <EuiDataGridAdapter
          {...getProps({
            gridStyle: { fontSize: 's', cellPadding: 's', onChange },
            sorting: { columns: [], onSort: jest.fn() },
          })}
        />
      );
      expect(screen.getByTestId('dataGridColumnSelectorButton')).toBeInTheDocument();
      expect(screen.getByTestId('dataGridColumnSortingButton')).toBeInTheDocument();
      expect(screen.getByTestId('dataGridKeyboardShortcutsButton')).toBeInTheDocument();
      expect(screen.getByTestId('dataGridFullScreenButton')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('dataGridDisplaySelectorButton'));
      await userEvent.click(await screen.findByText('Expanded'));
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 'l', cellPadding: 'l' })
      );
    });

    it('renders a custom toolbar with the controls, and the additional controls', () => {
      const renderCustomToolbar: EuiDataGridProps['renderCustomToolbar'] = jest.fn(
        ({ columnControl, displayControl }) => (
          <div data-test-subj="customToolbar">
            {columnControl}
            {displayControl}
          </div>
        )
      );
      render(
        <EuiDataGridAdapter
          {...getProps({
            renderCustomToolbar,
            toolbarVisibility: { showKeyboardShortcuts: false, additionalControls: <b>extra</b> },
          })}
        />
      );
      const toolbar = screen.getByTestId('customToolbar');
      expect(within(toolbar).getByTestId('dataGridColumnSelectorButton')).toBeInTheDocument();
      expect(within(toolbar).getByTestId('dataGridDisplaySelectorButton')).toBeInTheDocument();
      expect(renderCustomToolbar).toHaveBeenCalledWith(
        expect.objectContaining({ keyboardShortcutsControl: null, hasRoomForGridControls: true })
      );
    });

    it('has no toolbar when it is hidden', () => {
      render(<EuiDataGridAdapter {...getProps({ toolbarVisibility: false })} />);
      expect(screen.queryByTestId('dataGridColumnSelectorButton')).not.toBeInTheDocument();
    });

    it('goes full screen, and leaves it with Escape', async () => {
      const onFullScreenChange = jest.fn();
      render(<EuiDataGridAdapter {...getProps({ onFullScreenChange, id: 'grid' })} />);

      await userEvent.click(screen.getByTestId('dataGridFullScreenButton'));
      expect(document.getElementById('grid')).toHaveClass('euiDataGrid--fullScreen');
      expect(onFullScreenChange).toHaveBeenLastCalledWith(true);

      await userEvent.keyboard('{Escape}');
      expect(document.getElementById('grid')).not.toHaveClass('euiDataGrid--fullScreen');
      expect(onFullScreenChange).toHaveBeenLastCalledWith(false);
    });

    it('leaves full screen with Escape on a focused cell', async () => {
      render(<EuiDataGridAdapter {...getProps({ id: 'grid' })} />);
      await userEvent.click(screen.getByTestId('dataGridFullScreenButton'));

      const cell = screen.getByText('alpha').closest<HTMLElement>('[role="gridcell"]')!;
      act(() => cell.focus());
      await userEvent.keyboard('{Escape}');
      expect(document.getElementById('grid')).not.toHaveClass('euiDataGrid--fullScreen');
    });

    it('stays full screen when Escape is pressed outside of it, e.g. in a flyout', async () => {
      render(
        <>
          <EuiDataGridAdapter {...getProps({ id: 'grid' })} />
          <button data-test-subj="outside">outside</button>
        </>
      );
      await userEvent.click(screen.getByTestId('dataGridFullScreenButton'));

      act(() => screen.getByTestId('outside').focus());
      await userEvent.keyboard('{Escape}');
      expect(document.getElementById('grid')).toHaveClass('euiDataGrid--fullScreen');
    });
  });

  describe('cell popover', () => {
    it('uses the custom renderer of EuiDataGrid, with its props', async () => {
      const renderCellPopover = ({
        children,
        cellActions,
        columnId,
        rowIndex,
      }: EuiDataGridCellPopoverElementProps) => (
        <div>
          {`popover of ${columnId} ${rowIndex}`}
          {children}
          {cellActions}
        </div>
      );
      render(<EuiDataGridAdapter {...getProps({ renderCellPopover })} />);

      const cell = screen.getByText('beta').closest<HTMLElement>('[role="gridcell"]')!;
      await userEvent.hover(cell);
      await userEvent.click(await within(cell).findByTestId('kbnDataGridCellActionsButton'));
      const popover = await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);
      expect(within(popover).getByText(/popover of name 1/)).toBeInTheDocument();
    });
  });

  describe('cell popover that sets its props in an effect', () => {
    it('does not loop when the renderer calls setCellPopoverProps in an effect, like UnifiedDataTable', async () => {
      let renders = 0;
      // The renderer of UnifiedDataTable: sets props of the panel from an effect that depends on
      // `setCellPopoverProps`, with new objects each time.
      const Renderer = (props: EuiDataGridCellPopoverElementProps) => {
        const { columnId, setCellPopoverProps, DefaultCellPopover } = props;
        renders++;
        useEffect(() => {
          setCellPopoverProps({
            panelClassName: 'custom__panel',
            panelProps: { css: { maxInlineSize: 'min(75vw, 600px)' } },
          });
        }, [columnId, setCellPopoverProps]);
        return <DefaultCellPopover {...props} />;
      };
      const renderCellPopover = (props: EuiDataGridCellPopoverElementProps) => (
        <Renderer {...props} />
      );
      render(<EuiDataGridAdapter {...getProps({ renderCellPopover })} />);

      const cell = screen.getByText('beta').closest<HTMLElement>('[role="gridcell"]')!;
      await userEvent.hover(cell);
      await userEvent.click(await within(cell).findByTestId('kbnDataGridCellActionsButton'));
      const popover = await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);

      expect(popover).toHaveClass('custom__panel');
      // A few renders, not a loop.
      expect(renders).toBeLessThan(10);
    });
  });

  describe('ref', () => {
    it('opens a cell popover by its position and index in the page', async () => {
      const ref = createRef<EuiDataGridAdapterRef>();
      render(<EuiDataGridAdapter {...getProps()} ref={ref} />);

      // The control column counts: 0 is the selection column, 1 the first column.
      act(() => ref.current?.openCellPopover({ rowIndex: 2, colIndex: 1 }));
      const popover = await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);
      expect(within(popover).getByText('gamma')).toBeInTheDocument();

      act(() => ref.current?.closeCellPopover());
      await waitFor(() =>
        expect(screen.queryByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ)).not.toBeInTheDocument()
      );
    });
  });

  it('reports a resized column', () => {
    const onColumnResize = jest.fn();
    const { container } = render(<EuiDataGridAdapter {...getProps({ onColumnResize })} />);
    expect(container.querySelectorAll('[role="presentation"]').length).toBeGreaterThan(0);
  });

  it('reports a reset column, so a consumer that stores the width can drop it', async () => {
    const onColumnResize = jest.fn();
    render(<EuiDataGridAdapter {...getProps({ onColumnResize })} />);
    const resizeHandle = screen
      .getByTestId('dataGridHeaderCell-count')
      .querySelector<HTMLElement>('[role="presentation"]')!;

    await userEvent.dblClick(resizeHandle);
    expect(onColumnResize).toHaveBeenLastCalledWith({ columnId: 'count', width: undefined });
  });

  describe('like EuiDataGrid', () => {
    const openMenu = async (columnId: string) => {
      await userEvent.click(
        await screen.findByTestId(`dataGridHeaderCellActionButton-${columnId}`)
      );
      const menu = await screen.findByTestId(`dataGridHeaderCellActionGroup-${columnId}`);
      await waitFor(() => expect(getComputedStyle(menu).pointerEvents).not.toBe('none'));
      return menu;
    };

    it('renders a footer row with renderFooterCellValue and the footers of control columns', () => {
      const SelectFooter = () => <span>select footer</span>;
      const FooterValue = ({ columnId }: EuiDataGridCellValueElementProps) => (
        <span>{`sum of ${columnId}`}</span>
      );
      render(
        <EuiDataGridAdapter
          {...getProps({
            leadingControlColumns: [
              { ...leadingControlColumns[0], footerCellRender: SelectFooter },
            ],
            renderFooterCellValue: FooterValue,
            gridStyle: { footer: 'shade' },
          })}
        />
      );
      expect(screen.getByTestId('dataGridFooterCell-select')).toHaveTextContent('select footer');
      expect(screen.getByTestId('dataGridFooterCell-name')).toHaveTextContent('sum of name');
      expect(screen.getByTestId('dataGridFooterCell-count')).toHaveTextContent('sum of count');
      expect(screen.getByTestId('adapterGrid')).toHaveAttribute('data-footer', 'shade');
    });

    it('renders no footer row without renderFooterCellValue', () => {
      render(<EuiDataGridAdapter {...getProps()} />);
      expect(screen.queryByTestId('dataGridFooterCell-name')).not.toBeInTheDocument();
    });

    it('tells when it rendered its rows', async () => {
      const onRenderComplete = jest.fn();
      render(<EuiDataGridAdapter {...getProps({ onRenderComplete })} />);
      await waitFor(() => expect(onRenderComplete).toHaveBeenCalled());
    });

    it('names control column headers with the aria-label of their header props', () => {
      render(
        <EuiDataGridAdapter
          {...getProps({
            leadingControlColumns: [
              {
                ...leadingControlColumns[0],
                headerCellRender: () => null,
                headerCellProps: { 'aria-label': 'Select rows' },
              },
            ],
          })}
        />
      );
      expect(screen.getByRole('columnheader', { name: 'Select rows' })).toBeInTheDocument();
    });

    it('gives cells the index of their row in the page as visibleRowIndex', () => {
      // The types of EuiDataGrid leave `visibleRowIndex` out, but its cells get it.
      const RowNumber = ({
        visibleRowIndex,
      }: EuiDataGridCellValueElementProps & { visibleRowIndex?: number }) => (
        <span data-test-subj="rowNumber">{String(visibleRowIndex)}</span>
      );
      render(
        <EuiDataGridAdapter
          {...getProps({
            leadingControlColumns: [{ ...leadingControlColumns[0], rowCellRender: RowNumber }],
            pagination: {
              pageIndex: 1,
              pageSize: 2,
              pageSizeOptions: [2],
              onChangePage: jest.fn(),
              onChangeItemsPerPage: jest.fn(),
            },
          })}
        />
      );
      expect(screen.getByText('gamma')).toBeInTheDocument();
      expect(screen.getAllByTestId('rowNumber').map(({ textContent }) => textContent)).toEqual([
        '0',
      ]);
    });

    it('words the sort actions with the labels of the column actions', async () => {
      render(
        <EuiDataGridAdapter
          {...getProps({
            columns: [
              {
                ...columns[1],
                actions: {
                  showSortAsc: { label: 'Sort ascending' },
                  showSortDesc: { label: 'Sort descending' },
                },
              },
            ],
            columnVisibility: { visibleColumns: ['count'], setVisibleColumns: jest.fn() },
            sorting: { columns: [], onSort: jest.fn() },
          })}
        />
      );
      const menu = await openMenu('count');
      expect(within(menu).getByText('Sort ascending')).toBeInTheDocument();
      expect(within(menu).getByText('Sort descending')).toBeInTheDocument();
    });

    it('disables the additional header actions that are disabled', async () => {
      render(
        <EuiDataGridAdapter
          {...getProps({
            columns: [
              {
                ...columns[0],
                actions: {
                  additional: [
                    {
                      label: 'Reset',
                      onClick: jest.fn(),
                      isDisabled: true,
                      'data-test-subj': 'reset',
                    },
                  ],
                },
              },
              columns[1],
            ],
          })}
        />
      );
      const menu = await openMenu('name');
      expect(within(menu).getByTestId('reset')).toBeDisabled();
    });

    it('shows a single line per row without a default row height', () => {
      render(<EuiDataGridAdapter {...getProps()} />);
      expect(screen.getByTestId('adapterGrid')).toHaveAttribute('data-row-height', 'single');
      expect(
        screen.getByTestId('adapterGrid').style.getPropertyValue('--kbnDataGridRowLines')
      ).toBe('1');
    });

    it('uses the defaults of EuiDataGrid for what gridStyle leaves out', () => {
      render(<EuiDataGridAdapter {...getProps({ gridStyle: { cellPadding: 's' } })} />);
      const grid = screen.getByTestId('adapterGrid');
      expect(grid).toHaveAttribute('data-cell-padding', 's');
      expect(grid).toHaveAttribute('data-font-size', 'm');
      expect(grid).toHaveAttribute('data-border', 'all');
      expect(grid).toHaveAttribute('data-stripes', 'false');
      expect(grid).toHaveAttribute('data-row-hover', 'highlight');
      expect(grid).toHaveAttribute('data-header', 'shade');
      expect(grid).toHaveAttribute('data-footer', 'overline');
    });

    it('renders the content and actions given to the default popover', async () => {
      const renderCellPopover = ({
        DefaultCellPopover,
        ...popoverProps
      }: EuiDataGridCellPopoverElementProps) => (
        <DefaultCellPopover
          {...popoverProps}
          DefaultCellPopover={DefaultCellPopover}
          cellActions={<div data-test-subj="customActions">custom actions</div>}
        />
      );
      render(<EuiDataGridAdapter {...getProps({ renderCellPopover })} />);

      const cell = screen.getByText('beta').closest<HTMLElement>('[role="gridcell"]')!;
      await userEvent.hover(cell);
      await userEvent.click(await within(cell).findByTestId('kbnDataGridCellActionsButton'));
      const popover = await screen.findByTestId(CELL_EXPANSION_POPOVER_TEST_SUBJ);
      expect(within(popover).getByText('beta')).toBeInTheDocument();
      expect(within(popover).getByTestId('customActions')).toBeInTheDocument();
    });
  });
});
