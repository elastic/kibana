/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { copyToClipboard } from '@elastic/eui';
import { useTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { DataGridApi, DataGridCommandResult } from './data_grid_api';
import { useDataGridCellInteraction } from './data_grid_cell_interaction';
import { DataGrid } from './data_grid';
import type { DataGridColumn } from './data_grid_column';
import { createDataGridColumnHelper } from './data_grid_column';

const mockMeasureElement = jest.fn();
const mockGetOffsetForIndex = jest.fn();
const mockScrollToOffset = jest.fn();
const mockCopyToClipboard = jest.mocked(copyToClipboard);
let mockScrollOffsetAvailable = true;

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));

jest.mock('@tanstack/react-table', () => {
  const actual =
    jest.requireActual<typeof import('@tanstack/react-table')>('@tanstack/react-table');
  return {
    ...actual,
    useTable: jest.fn(actual.useTable),
  };
});

jest.mock('@tanstack/react-virtual', () => {
  const actual =
    jest.requireActual<typeof import('@tanstack/react-virtual')>('@tanstack/react-virtual');
  const react = jest.requireActual<typeof import('react')>('react');
  type VirtualizerOptions = Parameters<typeof actual.useVirtualizer>[0];

  return {
    ...actual,
    useVirtualizer: jest.fn((options: VirtualizerOptions) => {
      const [requestedStart, setRequestedStart] = react.useState(0);
      const visibleCount = 3;
      const maximumStart = Math.max(options.count - visibleCount, 0);
      const start = Math.min(requestedStart, maximumStart);
      const virtualItems = Array.from(
        { length: Math.min(visibleCount, options.count) },
        (_, offset) => {
          const index = start + offset;
          return {
            index,
            key: options.getItemKey?.(index) ?? index,
            start: index * 40,
            end: (index + 1) * 40,
            size: 40,
            lane: 0,
          };
        }
      );

      return {
        getTotalSize: () => options.count * 40,
        getVirtualItems: () => virtualItems,
        measureElement: mockMeasureElement,
        getOffsetForIndex: (index: number, align: string) => {
          mockGetOffsetForIndex(index, align);
          return mockScrollOffsetAvailable ? ([index * 40, align] as const) : undefined;
        },
        scrollToOffset: (offset: number) => {
          mockScrollToOffset(offset);
          const index = Math.floor(offset / 40);
          setRequestedStart(Math.min(Math.max(index, 0), maximumStart));
        },
      };
    }),
  };
});

interface TestRow {
  id: string;
  name: string;
  value: number;
}

const columnHelper = createDataGridColumnHelper<TestRow>();
const columns = [
  columnHelper.accessor({
    id: 'name',
    header: 'Visual name header',
    accessibilityLabel: 'Name',
    getValue: (row) => row.name,
    getAccessibilityValue: ({ value }) => value,
    renderCell: ({ value }) => value,
  }),
  columnHelper.accessor({
    id: 'value',
    header: 'Visual value header',
    accessibilityLabel: 'Value',
    getValue: (row) => row.value,
    getAccessibilityValue: ({ value }) => `Value ${value}`,
    renderCell: ({ value }) => value.toLocaleString(),
  }),
];
const rows = Array.from({ length: 100 }, (_, index) => ({
  id: `row-${index}`,
  name: `Name ${index}`,
  value: index,
}));
const getRowId = (row: TestRow) => row.id;

interface RenderGridOptions {
  readonly gridRows?: readonly TestRow[];
  readonly gridColumns?: ReadonlyArray<DataGridColumn<TestRow>>;
  readonly apiRef?: React.RefObject<DataGridApi | null>;
  readonly ariaLabel?: string;
}

const renderGrid = ({
  gridRows = rows,
  gridColumns = columns,
  apiRef,
  ariaLabel = 'Example data',
}: RenderGridOptions = {}) =>
  render(
    <DataGrid
      ariaLabel={ariaLabel}
      columns={gridColumns}
      rows={gridRows}
      getRowId={getRowId}
      height={160}
      apiRef={apiRef}
      virtualization={{
        rows: {
          estimatedHeight: 40,
          overscan: 2,
        },
      }}
    />
  );

const expectFocus = async (accessibleName: string): Promise<HTMLElement> => {
  const cell = await screen.findByRole('gridcell', { name: accessibleName });
  await waitFor(() => expect(document.activeElement).toBe(cell));
  return cell;
};

const focusElement = (element: HTMLElement): void => {
  act(() => element.focus());
};

const runFocusCommand = async (
  api: DataGridApi,
  rowId: string,
  columnId: string
): Promise<DataGridCommandResult> => {
  let command: Promise<DataGridCommandResult> | undefined;
  act(() => {
    command = api.focusCell({ rowId, columnId });
  });
  if (!command) {
    throw new Error('Expected the focus command to start.');
  }
  return command;
};

describe('DataGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScrollOffsetAvailable = true;
    mockCopyToClipboard.mockReturnValue(true);
  });

  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    jest.restoreAllMocks();
  });

  it('renders the logical grid semantics independently of the virtual window', () => {
    renderGrid();

    const grid = screen.getByRole('grid', { name: 'Example data' });
    expect(grid.getAttribute('aria-rowcount')).toBe('100');
    expect(grid.getAttribute('aria-colcount')).toBe('2');
    expect(screen.getAllByRole('rowgroup')).toHaveLength(2);

    const headers = screen.getAllByRole('columnheader');
    expect(headers[0].getAttribute('aria-label')).toBe('Name');
    expect(headers[0].getAttribute('aria-colindex')).toBe('1');
    expect(headers[1].getAttribute('aria-label')).toBe('Value');
    expect(headers[1].getAttribute('aria-colindex')).toBe('2');
    expect(headers[0].hasAttribute('tabindex')).toBe(false);

    const renderedRows = screen.getAllByRole('row').slice(1);
    expect(renderedRows).toHaveLength(3);
    expect(renderedRows.map((row) => row.getAttribute('aria-rowindex'))).toEqual(['1', '2', '3']);
    expect(screen.getByRole('gridcell', { name: 'Name 0' }).getAttribute('aria-colindex')).toBe(
      '1'
    );
    expect(screen.getByRole('gridcell', { name: 'Value 0' }).getAttribute('aria-colindex')).toBe(
      '2'
    );
  });

  it('requires non-empty grid and column accessibility labels', () => {
    expect(() => renderGrid({ ariaLabel: ' ' })).toThrow(
      'DataGrid requires a non-empty accessible name.'
    );

    const invalidColumns = [
      columnHelper.accessor({
        id: 'invalid',
        header: 'Invalid',
        accessibilityLabel: '',
        getValue: (row) => row.name,
        getAccessibilityValue: ({ value }) => value,
        renderCell: ({ value }) => value,
      }),
    ];
    expect(() => renderGrid({ gridColumns: invalidColumns })).toThrow(
      'Data grid column "invalid" requires a non-empty accessibility label.'
    );
  });

  it('keeps exactly one composite tab stop and restores it on re-entry', async () => {
    const { container } = renderGrid();

    const firstCell = screen.getByRole('gridcell', { name: 'Name 0' });
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(firstCell.getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('grid').getAttribute('tabindex')).toBe('-1');

    focusElement(firstCell);
    fireEvent.keyDown(firstCell, { key: 'ArrowRight' });
    const secondCell = await expectFocus('Value 0');
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(secondCell.getAttribute('tabindex')).toBe('0');

    const outsideButton = document.createElement('button');
    document.body.append(outsideButton);
    focusElement(outsideButton);
    expect(document.activeElement).toBe(outsideButton);
    const restoredTabStop = container.querySelector<HTMLElement>('[tabindex="0"]');
    if (!restoredTabStop) {
      throw new Error('Expected the grid to retain a composite tab stop.');
    }
    focusElement(restoredTabStop);
    expect(document.activeElement).toBe(secondCell);
    outsideButton.remove();
  });

  it('supports Arrow, Home, End, and Ctrl/Cmd+Home/End navigation', async () => {
    renderGrid();
    const firstCell = screen.getByRole('gridcell', { name: 'Name 0' });
    focusElement(firstCell);

    fireEvent.keyDown(firstCell, { key: 'ArrowRight' });
    const valueZero = await expectFocus('Value 0');
    fireEvent.keyDown(valueZero, { key: 'ArrowDown' });
    const valueOne = await expectFocus('Value 1');
    fireEvent.keyDown(valueOne, { key: 'Home' });
    const nameOne = await expectFocus('Name 1');
    fireEvent.keyDown(nameOne, { key: 'End' });
    const valueOneAgain = await expectFocus('Value 1');

    fireEvent.keyDown(valueOneAgain, { key: 'End', ctrlKey: true });
    const lastCell = await expectFocus('Value 99');
    expect(mockGetOffsetForIndex).toHaveBeenLastCalledWith(99, 'auto');

    fireEvent.keyDown(lastCell, { key: 'Home', metaKey: true });
    await expectFocus('Name 0');
  });

  it('does not wrap navigation at grid boundaries', async () => {
    const apiRef = createRef<DataGridApi>();
    renderGrid({ apiRef });
    const firstCell = screen.getByRole('gridcell', { name: 'Name 0' });
    focusElement(firstCell);

    fireEvent.keyDown(firstCell, { key: 'ArrowUp' });
    fireEvent.keyDown(firstCell, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(firstCell);

    if (!apiRef.current) {
      throw new Error('Expected a data grid API.');
    }
    expect(await runFocusCommand(apiRef.current, 'row-99', 'value')).toEqual({
      status: 'completed',
    });
    const lastCell = await expectFocus('Value 99');
    fireEvent.keyDown(lastCell, { key: 'ArrowDown' });
    fireEvent.keyDown(lastCell, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(lastCell);
  });

  it('mounts and focuses an off-screen keyboard destination through virtualizer lifecycle', async () => {
    renderGrid();
    const lastMountedCell = screen.getByRole('gridcell', { name: 'Name 2' });
    focusElement(lastMountedCell);

    fireEvent.keyDown(lastMountedCell, { key: 'ArrowDown' });

    await expectFocus('Name 3');
    expect(mockGetOffsetForIndex).toHaveBeenLastCalledWith(3, 'auto');
  });

  it('scrolls an already mounted navigation target into the visible viewport', async () => {
    renderGrid();
    const middleCell = screen.getByRole('gridcell', { name: 'Name 1' });
    focusElement(middleCell);

    fireEvent.keyDown(middleCell, { key: 'ArrowDown' });

    const nextCell = await expectFocus('Name 2');
    expect(mockGetOffsetForIndex).toHaveBeenLastCalledWith(2, 'auto');
    expect(mockScrollToOffset).toHaveBeenLastCalledWith(80);

    fireEvent.keyDown(nextCell, { key: 'ArrowUp' });
    await expectFocus('Name 1');
    expect(mockGetOffsetForIndex).toHaveBeenLastCalledWith(1, 'auto');
    expect(mockScrollToOffset).toHaveBeenLastCalledWith(40);
  });

  it('focuses an off-screen semantic command target and fails missing targets explicitly', async () => {
    const apiRef = createRef<DataGridApi>();
    renderGrid({ apiRef });
    if (!apiRef.current) {
      throw new Error('Expected a data grid API.');
    }

    expect(await runFocusCommand(apiRef.current, 'row-50', 'value')).toEqual({
      status: 'completed',
    });
    await expectFocus('Value 50');

    expect(await runFocusCommand(apiRef.current, 'missing', 'value')).toEqual({
      status: 'failed',
      reason: 'row_not_found',
    });
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain(
        'Could not find the requested grid row.'
      )
    );

    let missingColumnResult: DataGridCommandResult | undefined;
    await act(async () => {
      missingColumnResult = await apiRef.current?.scrollToCell({
        rowId: 'row-1',
        columnId: 'missing',
      });
    });
    expect(missingColumnResult).toEqual({ status: 'failed', reason: 'column_not_found' });
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain(
        'Could not find the requested grid column.'
      )
    );
  });

  it('contains failed scroll commands without changing the active cell or DOM focus', async () => {
    const apiRef = createRef<DataGridApi>();
    renderGrid({ apiRef });
    const activeCell = screen.getByRole('gridcell', { name: 'Name 0' });
    focusElement(activeCell);
    if (!apiRef.current) {
      throw new Error('Expected a data grid API.');
    }

    mockScrollOffsetAvailable = false;

    expect(await runFocusCommand(apiRef.current, 'row-50', 'value')).toEqual({
      status: 'failed',
      reason: 'scroll_failed',
    });
    expect(document.activeElement).toBe(activeCell);
    expect(activeCell.getAttribute('tabindex')).toBe('0');
    expect(mockScrollToOffset).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain(
        'Could not move to the requested grid cell.'
      )
    );

    expect(await apiRef.current.scrollToCell({ rowId: 'row-50', columnId: 'value' })).toEqual({
      status: 'failed',
      reason: 'scroll_failed',
    });
    expect(document.activeElement).toBe(activeCell);

    mockScrollOffsetAvailable = true;
    mockScrollToOffset.mockImplementationOnce(() => {
      throw new Error('virtualizer unavailable');
    });
    expect(await apiRef.current.scrollToCell({ rowId: 'row-50', columnId: 'value' })).toEqual({
      status: 'failed',
      reason: 'scroll_failed',
    });
    expect(document.activeElement).toBe(activeCell);
  });

  it('restores DOM focus when the active logical cell is virtually unmounted and remounted', async () => {
    const apiRef = createRef<DataGridApi>();
    const { container } = renderGrid({ apiRef });
    const activeCell = screen.getByRole('gridcell', { name: 'Name 1' });
    focusElement(activeCell);
    if (!apiRef.current) {
      throw new Error('Expected a data grid API.');
    }

    await act(async () => {
      await apiRef.current?.scrollToCell({ rowId: 'row-50', columnId: 'name' });
    });
    expect(screen.queryByRole('gridcell', { name: 'Name 1' })).toBeNull();
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(screen.getByRole('grid').getAttribute('tabindex')).toBe('0');

    await act(async () => {
      await apiRef.current?.scrollToCell({ rowId: 'row-1', columnId: 'name' });
    });
    await expectFocus('Name 1');
  });

  it('preserves logical row and column identity through reordering', async () => {
    const { rerender } = renderGrid();
    const activeCell = screen.getByRole('gridcell', { name: 'Name 1' });
    focusElement(activeCell);
    const reorderedRows = [rows[2], rows[0], rows[1], ...rows.slice(3)];

    rerender(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={reorderedRows}
        getRowId={getRowId}
        height={160}
      />
    );

    const movedCell = await expectFocus('Name 1');
    expect(movedCell.parentElement?.getAttribute('aria-rowindex')).toBe('3');

    const rowsWithActiveMovedOffScreen = [
      rows[0],
      ...rows.slice(2, 52),
      rows[1],
      ...rows.slice(52),
    ];
    rerender(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={rowsWithActiveMovedOffScreen}
        getRowId={getRowId}
        height={160}
      />
    );
    const offScreenMovedCell = await expectFocus('Name 1');
    expect(offScreenMovedCell.parentElement?.getAttribute('aria-rowindex')).toBe('52');
    expect(mockGetOffsetForIndex).toHaveBeenLastCalledWith(51, 'auto');

    rerender(
      <DataGrid
        ariaLabel="Example data"
        columns={[columns[1], columns[0]]}
        rows={rowsWithActiveMovedOffScreen}
        getRowId={getRowId}
        height={160}
      />
    );
    const movedColumnCell = await expectFocus('Name 1');
    expect(movedColumnCell.getAttribute('aria-colindex')).toBe('2');
  });

  it('moves focus to the nearest surviving identity when active data is removed', async () => {
    const { rerender } = renderGrid();
    const activeCell = screen.getByRole('gridcell', { name: 'Value 1' });
    focusElement(activeCell);
    const rowsWithoutActive = [rows[0], ...rows.slice(2)];

    rerender(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={rowsWithoutActive}
        getRowId={getRowId}
        height={160}
      />
    );
    await expectFocus('Value 2');

    rerender(
      <DataGrid
        ariaLabel="Example data"
        columns={[columns[0]]}
        rows={rowsWithoutActive}
        getRowId={getRowId}
        height={160}
      />
    );
    await expectFocus('Name 2');
  });

  it('uses a grid-owned tab stop and status when the focused grid becomes empty', async () => {
    const { rerender, container } = renderGrid();
    focusElement(screen.getByRole('gridcell', { name: 'Name 0' }));

    rerender(
      <DataGrid
        ariaLabel="Example data"
        columns={columns}
        rows={[]}
        getRowId={getRowId}
        height={160}
      />
    );

    const grid = screen.getByRole('grid', { name: 'Example data' });
    await waitFor(() => expect(document.activeElement).toBe(grid));
    expect(grid.getAttribute('aria-rowcount')).toBe('0');
    expect(grid.getAttribute('tabindex')).toBe('0');
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('No rows remain in the grid.')
    );
  });

  it('supports the empty grid as the initial composite tab stop', () => {
    const { container } = renderGrid({ gridRows: [] });
    const grid = screen.getByRole('grid');
    expect(grid.getAttribute('tabindex')).toBe('0');
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    focusElement(grid);
    expect(document.activeElement).toBe(grid);
  });

  it('copies the accessible cell value with the platform shortcut', async () => {
    const platform = jest.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Linux');
    renderGrid();
    const cell = screen.getByRole('gridcell', { name: 'Value 0' });
    focusElement(cell);

    await act(async () => {
      fireEvent.keyDown(cell, { key: 'c', ctrlKey: true });
      await Promise.resolve();
    });

    expect(mockCopyToClipboard).toHaveBeenCalledWith('Value 0');
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Cell value copied.')
    );
    platform.mockReturnValue('MacIntel');
    fireEvent.keyDown(cell, { key: 'c', ctrlKey: true });
    expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.keyDown(cell, { key: 'c', metaKey: true });
      await Promise.resolve();
    });
    expect(mockCopyToClipboard).toHaveBeenCalledTimes(2);
  });

  it('preserves native copy behavior when text is explicitly selected', () => {
    jest.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Linux');
    renderGrid();
    const cell = screen.getByRole('gridcell', { name: 'Name 0' });
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(cell);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const browserHandled = fireEvent.keyDown(cell, { key: 'c', ctrlKey: true });

    expect(browserHandled).toBe(true);
    expect(mockCopyToClipboard).not.toHaveBeenCalled();
  });

  it('announces copy failure without moving focus', async () => {
    jest.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Linux');
    mockCopyToClipboard.mockReturnValueOnce(false);
    renderGrid();
    const cell = screen.getByRole('gridcell', { name: 'Name 0' });
    focusElement(cell);

    fireEvent.keyDown(cell, { key: 'c', ctrlKey: true });

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Cell value could not be copied.')
    );
    expect(document.activeElement).toBe(cell);
  });

  it('separates grid navigation mode from registered cell interaction mode', async () => {
    const InteractionButton = () => {
      const interactionProps = useDataGridCellInteraction<HTMLButtonElement>();
      return <button {...interactionProps}>Interact</button>;
    };
    const interactionColumns = [
      columnHelper.accessor({
        id: 'interaction',
        header: 'Interaction',
        accessibilityLabel: 'Interaction',
        getValue: (row) => row.name,
        getAccessibilityValue: ({ value }) => value,
        renderCell: () => <InteractionButton />,
      }),
    ];
    const { container } = renderGrid({ gridColumns: interactionColumns });
    const cell = screen.getByRole('gridcell', { name: 'Name 0' });
    const button = cell.querySelector('button');
    if (!button) {
      throw new Error('Expected an interaction button in the active cell.');
    }
    expect(cell.getAttribute('tabindex')).toBe('0');
    expect(button.getAttribute('tabindex')).toBe('-1');

    focusElement(cell);
    fireEvent.keyDown(cell, { key: 'Enter' });
    await waitFor(() => expect(document.activeElement).toBe(button));
    expect(cell.getAttribute('tabindex')).toBe('-1');
    expect(button.getAttribute('tabindex')).toBe('0');
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);

    expect(button.closest('[data-eui="EuiFocusTrap"]')).not.toBeNull();
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(button);
    fireEvent.keyDown(button, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(cell));
    expect(cell.getAttribute('tabindex')).toBe('0');
    expect(button.getAttribute('tabindex')).toBe('-1');
  });

  it('renders only the virtual window and measures every mounted row', () => {
    renderGrid();

    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getAllByRole('gridcell')).toHaveLength(6);
    expect(screen.getAllByRole('row')[1].getAttribute('data-striped')).toBe('false');
    expect(screen.getAllByRole('row')[2].getAttribute('data-striped')).toBe('true');
    expect(mockMeasureElement).toHaveBeenCalledTimes(3);
  });

  it('configures Table and virtualization from stable logical identities', () => {
    renderGrid();

    const tableOptions = jest.mocked(useTable).mock.calls[0][0];
    expect(tableOptions.columns).toEqual([
      expect.objectContaining({ accessorFn: expect.any(Function) }),
      expect.objectContaining({ accessorFn: expect.any(Function) }),
    ]);

    const virtualizerOptions = jest.mocked(useVirtualizer).mock.calls[0][0];
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
