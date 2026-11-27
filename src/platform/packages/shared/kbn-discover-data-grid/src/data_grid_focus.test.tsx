/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createRef } from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DataGridApi, DataGridCommandResult } from './data_grid_api';
import { createDataGridColumnHelper } from './data_grid_column';
import type { TestRow } from './data_grid.test.helpers';
import {
  cleanupDataGridTestState,
  columns,
  columnsWithLinks,
  expectFocus,
  focusVisibleTestHarness,
  focusElement,
  getCompositeTabStops,
  renderGrid,
  renderGridBetweenButtons,
  resetDataGridTestState,
  rows,
  runFocusCommand,
  TestDataGrid,
  type TestDataGridProps,
  virtualizerTestHarness,
} from './data_grid.test.helpers';

const columnHelper = createDataGridColumnHelper<TestRow>();
const createContentColumns = (renderContent: (rowId: string) => React.ReactNode) => [
  columns[0],
  columnHelper.accessor({
    id: 'content',
    header: 'Content',
    getValue: (row) => row.id,
    getTextValue: ({ value }) => value,
    renderCell: ({ value }) => renderContent(value),
  }),
];
const columnsWithTwoLinks = createContentColumns((rowId) => (
  <>
    <a href={`https://example.com/${rowId}/first`}>{`First ${rowId}`}</a>{' '}
    <a href={`https://example.com/${rowId}/second`}>{`Second ${rowId}`}</a>
  </>
));
const renderGridWithApi = (props: Omit<TestDataGridProps, 'apiRef'> = {}) => {
  const apiRef = createRef<DataGridApi>();
  const renderResult = renderGrid({ ...props, apiRef });
  const api = apiRef.current;
  if (!api) {
    throw new Error('Expected a data grid API.');
  }
  return { ...renderResult, api, apiRef };
};

describe('DataGrid keyboard and logical focus', () => {
  beforeEach(resetDataGridTestState);
  afterEach(cleanupDataGridTestState);

  it('supports Arrow, Home, End, and Ctrl/Cmd+Home/End navigation', async () => {
    const user = userEvent.setup();
    renderGrid();
    const firstCell = screen.getByRole('gridcell', { name: 'Name 0' });
    await user.click(firstCell);

    await user.keyboard('{ArrowRight}');
    await expectFocus('0');
    await user.keyboard('{ArrowDown}');
    await expectFocus('1');
    await user.keyboard('{Home}');
    await expectFocus('Name 1');
    await user.keyboard('{End}');
    await expectFocus('1');

    await user.keyboard('{Control>}{End}{/Control}');
    await expectFocus('99');
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(99, 'auto');

    await user.keyboard('{Meta>}{Home}{/Meta}');
    await expectFocus('Name 0');
  });

  it('does not wrap navigation at grid boundaries', async () => {
    const user = userEvent.setup();
    const { api } = renderGridWithApi();
    const firstCell = screen.getByRole('gridcell', { name: 'Name 0' });
    await user.click(firstCell);

    await user.keyboard('{ArrowUp}{ArrowLeft}');
    expect(document.activeElement).toBe(firstCell);

    expect(await runFocusCommand(api, 'row-99', 'value')).toEqual({
      status: 'completed',
    });
    const lastCell = await expectFocus('99');
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(document.activeElement).toBe(lastCell);
  });

  it('mounts and focuses an off-screen keyboard destination through virtualizer lifecycle', async () => {
    const user = userEvent.setup();
    renderGrid();
    const lastMountedCell = screen.getByRole('gridcell', { name: 'Name 2' });
    await user.click(lastMountedCell);

    await user.keyboard('{ArrowDown}');

    await expectFocus('Name 3');
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(3, 'auto');
  });

  it('does not let a delayed focus mount override a newer semantic scroll', async () => {
    virtualizerTestHarness.delayMounts();
    const { api, container } = renderGridWithApi();

    let pendingFocus: Promise<DataGridCommandResult> | undefined;
    act(() => {
      pendingFocus = api.focusCell({ rowId: 'row-50', columnId: 'name' });
    });
    expect(virtualizerTestHarness.pendingScrollCount).toBe(1);

    await expect(api.scrollToCell({ rowId: 'row-10', columnId: 'name' })).resolves.toEqual({
      status: 'completed',
    });
    await expect(pendingFocus).resolves.toEqual({ status: 'cancelled', reason: 'superseded' });
    expect(virtualizerTestHarness.pendingScrollCount).toBe(2);

    virtualizerTestHarness.flushScroll(1);
    expect(screen.getByRole('gridcell', { name: 'Name 10' })).not.toBeNull();
    virtualizerTestHarness.flushScroll(0);
    const staleCell = screen.getByRole('gridcell', { name: 'Name 50' });
    const grid = screen.getByRole('grid');
    expect(document.activeElement).not.toBe(staleCell);
    expect(staleCell.getAttribute('tabindex')).toBe('-1');
    expect(getCompositeTabStops(container)).toEqual([
      screen.getByRole('gridcell', { name: 'Name 0' }),
    ]);

    focusElement(grid);
    expect(virtualizerTestHarness.pendingScrollCount).toBe(3);
    virtualizerTestHarness.flushScroll(2);
    await expectFocus('Name 0');
  });

  it('re-resolves a delayed pending focus after row reordering', async () => {
    virtualizerTestHarness.delayMounts();
    const { api, apiRef, rerender } = renderGridWithApi();
    const outsideButton = document.createElement('button');
    document.body.append(outsideButton);
    focusElement(outsideButton);

    let pendingFocus: Promise<DataGridCommandResult> | undefined;
    act(() => {
      pendingFocus = api.focusCell({ rowId: 'row-50', columnId: 'name' });
    });
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(50, 'auto');

    const rowsWithoutTarget = rows.filter(({ id }) => id !== 'row-50');
    const reorderedRows = [
      ...rowsWithoutTarget.slice(0, 70),
      rows[50],
      ...rowsWithoutTarget.slice(70),
    ];
    rerender(<TestDataGrid gridRows={reorderedRows} apiRef={apiRef} />);

    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(70, 'auto');
    expect(virtualizerTestHarness.pendingScrollCount).toBe(2);
    virtualizerTestHarness.flushScroll(1);

    await expect(pendingFocus).resolves.toEqual({ status: 'completed' });
    const focusedCell = await expectFocus('Name 50');
    expect(focusedCell.parentElement?.getAttribute('aria-rowindex')).toBe('72');
    outsideButton.remove();
  });

  it('preserves pending focus when reordering moves the active row out of the rendered window', async () => {
    virtualizerTestHarness.delayMounts();
    const { api, apiRef, rerender } = renderGridWithApi();
    const activeCell = screen.getByRole('gridcell', { name: 'Name 0' });
    focusElement(activeCell);

    let pendingFocus: Promise<DataGridCommandResult> | undefined;
    act(() => {
      pendingFocus = api.focusCell({ rowId: 'row-50', columnId: 'name' });
    });
    expect(virtualizerTestHarness.pendingScrollCount).toBe(1);

    const rowsWithoutActive = rows.slice(1);
    const reorderedRows = [
      ...rowsWithoutActive.slice(0, 70),
      rows[0],
      ...rowsWithoutActive.slice(70),
    ];
    rerender(<TestDataGrid gridRows={reorderedRows} apiRef={apiRef} />);

    expect(activeCell).toHaveFocus();
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(49, 'auto');
    expect(virtualizerTestHarness.pendingScrollCount).toBe(2);
    virtualizerTestHarness.flushScroll(1);

    await expect(pendingFocus).resolves.toEqual({ status: 'completed' });
    await expectFocus('Name 50');
  });

  it('does not reclaim focus when a delayed destination mounts after Tab leaves the grid', async () => {
    const user = userEvent.setup();
    virtualizerTestHarness.delayMounts();
    const { api } = renderGridWithApi();
    const activeCell = screen.getByRole('gridcell', { name: 'Name 0' });
    const outsideButton = document.createElement('button');
    document.body.append(outsideButton);
    await user.click(activeCell);

    let pendingFocus: Promise<DataGridCommandResult> | undefined;
    act(() => {
      pendingFocus = api.focusCell({ rowId: 'row-50', columnId: 'name' });
    });
    await user.tab();
    expect(document.activeElement).toBe(outsideButton);

    await expect(pendingFocus).resolves.toEqual({ status: 'cancelled', reason: 'superseded' });
    virtualizerTestHarness.flushScroll(0);
    expect(document.activeElement).toBe(outsideButton);
    outsideButton.remove();
  });

  it('scrolls an already mounted navigation target into the visible viewport', async () => {
    const user = userEvent.setup();
    renderGrid();
    const middleCell = screen.getByRole('gridcell', { name: 'Name 1' });
    await user.click(middleCell);

    await user.keyboard('{ArrowDown}');

    await expectFocus('Name 2');
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(2, 'auto');
    expect(virtualizerTestHarness.scrollToOffset).toHaveBeenLastCalledWith(80);

    await user.keyboard('{ArrowUp}');
    await expectFocus('Name 1');
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(1, 'auto');
    expect(virtualizerTestHarness.scrollToOffset).toHaveBeenLastCalledWith(40);
  });

  it('focuses an off-screen semantic command target and fails missing targets explicitly', async () => {
    const { api } = renderGridWithApi();

    expect(await runFocusCommand(api, 'row-50', 'value')).toEqual({
      status: 'completed',
    });
    await expectFocus('50');

    expect(await runFocusCommand(api, 'missing', 'value')).toEqual({
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
      missingColumnResult = await api.scrollToCell({
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
    const { api } = renderGridWithApi();
    const activeCell = screen.getByRole('gridcell', { name: 'Name 0' });
    focusElement(activeCell);

    virtualizerTestHarness.failOffsetLookup();

    expect(await runFocusCommand(api, 'row-50', 'value')).toEqual({
      status: 'failed',
      reason: 'scroll_failed',
    });
    expect(document.activeElement).toBe(activeCell);
    expect(activeCell.getAttribute('tabindex')).toBe('0');
    expect(virtualizerTestHarness.scrollToOffset).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain(
        'Could not move to the requested grid cell.'
      )
    );

    let scrollResult: DataGridCommandResult | undefined;
    await act(async () => {
      scrollResult = await api.scrollToCell({ rowId: 'row-50', columnId: 'value' });
    });
    expect(scrollResult).toEqual({
      status: 'failed',
      reason: 'scroll_failed',
    });
    expect(document.activeElement).toBe(activeCell);

    virtualizerTestHarness.allowOffsetLookup();
    virtualizerTestHarness.throwOnNextScroll();
    await act(async () => {
      scrollResult = await api.scrollToCell({ rowId: 'row-50', columnId: 'value' });
    });
    expect(scrollResult).toEqual({
      status: 'failed',
      reason: 'scroll_failed',
    });
    expect(document.activeElement).toBe(activeCell);
  });

  it('keeps the focused active row rendered while it is scrolled out of the virtual window', async () => {
    const user = userEvent.setup();
    const { api, container } = renderGridWithApi();
    const activeCell = screen.getByRole('gridcell', { name: 'Name 1' });
    await user.click(activeCell);

    await act(async () => {
      await api.scrollToCell({ rowId: 'row-50', columnId: 'name' });
    });
    expect(screen.getAllByRole('row').map((row) => row.getAttribute('aria-rowindex'))).toEqual([
      '1',
      '3',
      '52',
      '53',
      '54',
    ]);
    expect(activeCell).toHaveFocus();
    expect(getCompositeTabStops(container)).toEqual([activeCell]);

    await user.keyboard('{ArrowDown}');

    await expectFocus('Name 2');
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(2, 'auto');
  });

  it('keeps focus on an off-screen active cell through a reorder without moving the viewport', async () => {
    const { api, apiRef, rerender } = renderGridWithApi();
    const activeCell = screen.getByRole('gridcell', { name: 'Name 1' });
    focusElement(activeCell);

    await act(async () => {
      await api.scrollToCell({ rowId: 'row-50', columnId: 'name' });
    });
    rerender(
      <TestDataGrid gridRows={[rows[2], rows[1], rows[0], ...rows.slice(3)]} apiRef={apiRef} />
    );

    expect(activeCell).toHaveFocus();
    expect(screen.queryByRole('gridcell', { name: 'Name 0' })).toBeNull();
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenCalledTimes(1);
  });

  it('scrolls back to an off-screen active cell only when the grid receives keyboard focus', async () => {
    const { api } = renderGridWithApi();
    const activeCell = screen.getByRole('gridcell', { name: 'Name 0' });
    focusElement(activeCell);

    await act(async () => {
      await api.scrollToCell({ rowId: 'row-50', columnId: 'name' });
    });
    const grid = screen.getByRole('grid');

    focusVisibleTestHarness.set(false);
    focusElement(grid);
    expect(document.activeElement).toBe(grid);
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenCalledTimes(1);

    const outsideButton = document.createElement('button');
    document.body.append(outsideButton);
    focusElement(outsideButton);
    focusVisibleTestHarness.set(true);
    focusElement(grid);

    await expectFocus('Name 0');
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(0, 'auto');
    outsideButton.remove();
  });

  it.each([
    { key: '{ArrowDown}', start: 'Name 1', destination: 'Name 2' },
    { key: '{ArrowUp}', start: 'Name 0', destination: 'Name 0' },
    { key: '{Home}', start: '1', destination: 'Name 1' },
    { key: '{End}', start: 'Name 1', destination: '1' },
    { key: '{Control>}{Home}{/Control}', start: '1', destination: 'Name 0' },
    { key: '{Meta>}{End}{/Meta}', start: 'Name 1', destination: '99' },
  ])(
    'resumes $key navigation when pointer focus remains on the grid',
    async ({ key, start, destination }) => {
      const user = userEvent.setup();
      renderGrid();
      await user.click(screen.getByRole('gridcell', { name: start }));

      const grid = screen.getByRole('grid');
      focusVisibleTestHarness.set(false);
      await user.click(grid);
      expect(document.activeElement).toBe(grid);

      await user.keyboard(key);

      await expectFocus(destination);
    }
  );

  it('preserves logical row and column identity through reordering', async () => {
    const { rerender } = renderGrid();
    const activeCell = screen.getByRole('gridcell', { name: 'Name 1' });
    focusElement(activeCell);
    const reorderedRows = [rows[2], rows[0], rows[1], ...rows.slice(3)];

    rerender(<TestDataGrid gridRows={reorderedRows} />);

    const movedCell = await expectFocus('Name 1');
    expect(movedCell.parentElement?.getAttribute('aria-rowindex')).toBe('4');

    const rowsWithActiveMovedOffScreen = [
      rows[0],
      ...rows.slice(2, 52),
      rows[1],
      ...rows.slice(52),
    ];
    rerender(<TestDataGrid gridRows={rowsWithActiveMovedOffScreen} />);
    const offScreenMovedCell = await expectFocus('Name 1');
    expect(offScreenMovedCell.parentElement?.getAttribute('aria-rowindex')).toBe('53');
    expect(virtualizerTestHarness.getOffsetForIndex).not.toHaveBeenCalled();

    rerender(
      <TestDataGrid
        gridRows={rowsWithActiveMovedOffScreen}
        gridColumns={[columns[1], columns[0]]}
      />
    );
    const movedColumnCell = await expectFocus('Name 1');
    expect(movedColumnCell.getAttribute('aria-colindex')).toBe('2');
  });

  it('moves focus to the nearest surviving identity when active data is removed', async () => {
    const { rerender } = renderGrid();
    const activeCell = screen.getByRole('gridcell', { name: '1' });
    focusElement(activeCell);
    const rowsWithoutActive = [rows[0], ...rows.slice(2)];

    rerender(<TestDataGrid gridRows={rowsWithoutActive} />);
    await expectFocus('2');

    rerender(<TestDataGrid gridRows={rowsWithoutActive} gridColumns={[columns[0]]} />);
    await expectFocus('Name 2');
  });

  it('uses a grid-owned tab stop and status when the focused grid becomes empty', async () => {
    const { rerender, container } = renderGrid();
    focusElement(screen.getByRole('gridcell', { name: 'Name 0' }));

    rerender(<TestDataGrid gridRows={[]} />);

    const grid = screen.getByRole('grid', { name: 'Example data' });
    await waitFor(() => expect(document.activeElement).toBe(grid));
    expect(grid.getAttribute('aria-rowcount')).toBe('1');
    expect(grid.getAttribute('tabindex')).toBe('0');
    expect(getCompositeTabStops(container)).toHaveLength(1);
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('No rows remain in the grid.')
    );
  });

  it('moves focus from a focused empty grid to the first cell when rows return', async () => {
    const { container, rerender } = renderGrid({ gridRows: [] });
    const grid = screen.getByRole('grid');
    focusElement(grid);

    rerender(<TestDataGrid />);

    await expectFocus('Name 0');
    expect(grid.getAttribute('tabindex')).toBe('-1');
    expect(getCompositeTabStops(container)).toHaveLength(1);
  });

  // JSDOM cannot prove native Tab order. user-event emulates sequential focus navigation, continuing
  // from whichever element holds focus after keydown, like browsers do. Real-browser coverage of the
  // guards lands with the DocViewer adapter's Scout tests.
  describe('Tab guards', () => {
    let focusedElements: Element[] = [];
    const recordFocusedElement = ({ target }: FocusEvent) => {
      if (target instanceof Element) {
        focusedElements.push(target);
      }
    };
    const getFocusedLinks = () =>
      focusedElements.filter((element) => element instanceof HTMLAnchorElement);

    beforeEach(() => {
      focusedElements = [];
      document.addEventListener('focusin', recordFocusedElement);
    });

    afterEach(() => {
      document.removeEventListener('focusin', recordFocusedElement);
    });

    it('redirects focus entering through either guard to the logical active cell', async () => {
      const user = userEvent.setup();
      const { before, after } = renderGridBetweenButtons();

      await user.tab();
      expect(before).toHaveFocus();
      await user.tab();
      await expectFocus('Name 0');

      await user.keyboard('{ArrowDown}');
      await expectFocus('Name 1');
      await user.click(after);
      await user.tab({ shift: true });
      await expectFocus('Name 1');
    });

    it('hands Tab and Shift+Tab to the guards, so focus leaves the grid past links in cells', async () => {
      const user = userEvent.setup();
      const { before, after } = renderGridBetweenButtons({ gridColumns: columnsWithLinks });
      expect(screen.getAllByRole('link')).toHaveLength(3);

      await user.tab();
      await user.tab();
      await expectFocus('Name 0');
      await user.tab();
      expect(after).toHaveFocus();

      await user.tab({ shift: true });
      await expectFocus('Name 0');
      await user.tab({ shift: true });
      expect(before).toHaveFocus();

      expect(getFocusedLinks()).toEqual([]);
    });

    it('never focuses a link rendered inside the active cell', async () => {
      const user = userEvent.setup();
      const { before, after } = renderGridBetweenButtons({ gridColumns: columnsWithLinks });
      const linkCellName = 'Open row-0';

      await user.tab();
      await user.tab();
      await user.keyboard('{End}');
      const linkCell = await expectFocus(linkCellName);
      expect(screen.getByRole('link', { name: linkCellName })).toBeVisible();
      expect(linkCell).toContainElement(screen.getByRole('link', { name: linkCellName }));

      await user.tab();
      expect(after).toHaveFocus();
      await user.tab({ shift: true });
      await expectFocus(linkCellName);
      await user.tab({ shift: true });
      expect(before).toHaveFocus();

      expect(getFocusedLinks()).toEqual([]);
    });

    it.each([
      { entry: 'Tab', startButtonName: 'Before grid', shift: false },
      { entry: 'Shift+Tab', startButtonName: 'After grid', shift: true },
    ])(
      'scrolls back to an off-screen active row on $entry entry',
      async ({ startButtonName, shift }) => {
        const user = userEvent.setup();
        const apiRef = createRef<DataGridApi>();
        renderGridBetweenButtons({ apiRef });

        await user.tab();
        await user.tab();
        await user.keyboard('{ArrowDown}');
        await expectFocus('Name 1');
        await user.click(screen.getByRole('button', { name: startButtonName }));
        await act(async () => {
          await apiRef.current?.scrollToCell({ rowId: 'row-50', columnId: 'name' });
        });
        expect(screen.queryByRole('gridcell', { name: 'Name 0' })).toBeNull();

        await user.tab({ shift });

        await expectFocus('Name 1');
        expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(1, 'auto');
      }
    );

    it.each([
      { key: 'Tab', shift: false, destination: 'After grid' },
      { key: 'Shift+Tab', shift: true, destination: 'Before grid' },
    ])(
      'hands $key to a guard after the focused row scrolls out of the rendered window',
      async ({ shift, destination }) => {
        const user = userEvent.setup();
        const apiRef = createRef<DataGridApi>();
        renderGridBetweenButtons({ gridColumns: columnsWithLinks, apiRef });

        await user.tab();
        await user.tab();
        const activeCell = await expectFocus('Name 0');
        await act(async () => {
          await apiRef.current?.scrollToCell({ rowId: 'row-50', columnId: 'name' });
        });
        expect(activeCell).toHaveFocus();

        await user.tab({ shift });

        expect(screen.getByRole('button', { name: destination })).toHaveFocus();
        expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(50, 'auto');
        expect(getFocusedLinks()).toEqual([]);
      }
    );

    it('uses the empty grid as the only tab stop between the guards', async () => {
      const user = userEvent.setup();
      const { before, after } = renderGridBetweenButtons({ gridRows: [] });
      const grid = screen.getByRole('grid', { name: 'Example data' });

      await user.tab();
      await user.tab();
      expect(grid).toHaveFocus();
      await user.tab();
      expect(after).toHaveFocus();

      await user.tab({ shift: true });
      expect(grid).toHaveFocus();
      await user.tab({ shift: true });
      expect(before).toHaveFocus();
    });
  });

  describe('cell content', () => {
    let openedLinks: string[] = [];
    // Records link activation and stops JSDOM from attempting navigation.
    const recordLinkClick = (event: MouseEvent) => {
      if (event.target instanceof HTMLAnchorElement) {
        openedLinks.push(event.target.href);
        event.preventDefault();
      }
    };

    beforeEach(() => {
      openedLinks = [];
      document.addEventListener('click', recordLinkClick);
    });

    afterEach(() => {
      document.removeEventListener('click', recordLinkClick);
    });

    it('moves focus to the link on Enter, so that a second Enter opens it', async () => {
      const user = userEvent.setup();
      renderGridBetweenButtons({ gridColumns: columnsWithLinks });

      await user.tab();
      await user.tab();
      await user.keyboard('{End}');
      await expectFocus('Open row-0');

      await user.keyboard('{Enter}');
      expect(screen.getByRole('link', { name: 'Open row-0' })).toHaveFocus();
      expect(openedLinks).toEqual([]);

      await user.keyboard('{Enter}');
      expect(openedLinks).toEqual(['https://example.com/row-0']);
    });

    it('keeps focus on a link inside the active cell while its row is scrolled out of view', async () => {
      const user = userEvent.setup();
      const apiRef = createRef<DataGridApi>();
      renderGridBetweenButtons({ gridColumns: columnsWithLinks, apiRef });

      await user.tab();
      await user.tab();
      await user.keyboard('{End}{Enter}');
      const link = screen.getByRole('link', { name: 'Open row-0' });
      expect(link).toHaveFocus();

      await act(async () => {
        await apiRef.current?.scrollToCell({ rowId: 'row-50', columnId: 'name' });
      });
      expect(link).toHaveFocus();

      await user.keyboard('{Escape}');
      await expectFocus('Open row-0');
    });

    it('keeps focus on a cell without focusable content on Enter', async () => {
      const user = userEvent.setup();
      renderGridBetweenButtons({ gridColumns: columnsWithLinks });

      await user.tab();
      await user.tab();
      await user.keyboard('{Enter}');

      await expectFocus('Name 0');
    });

    it('wraps Tab inside the cell content and returns to the cell on Escape', async () => {
      const user = userEvent.setup();
      const { after } = renderGridBetweenButtons({ gridColumns: columnsWithTwoLinks });
      const firstLink = screen.getByRole('link', { name: 'First row-0' });
      const secondLink = screen.getByRole('link', { name: 'Second row-0' });

      await user.tab();
      await user.tab();
      await user.keyboard('{ArrowRight}');
      await expectFocus('First row-0 Second row-0');
      await user.keyboard('{Enter}');
      expect(firstLink).toHaveFocus();

      await user.tab();
      expect(secondLink).toHaveFocus();
      await user.tab();
      expect(firstLink).toHaveFocus();
      await user.tab({ shift: true });
      expect(secondLink).toHaveFocus();

      await user.keyboard('{Escape}');
      await expectFocus('First row-0 Second row-0');
      await user.tab();
      expect(after).toHaveFocus();
    });

    it('wraps Tab through tab stops nested inside a focusable container', async () => {
      const user = userEvent.setup();
      renderGridBetweenButtons({
        gridColumns: createContentColumns((rowId) => (
          <div tabIndex={0} role="region" aria-label={`Actions ${rowId}`}>
            <button type="button">{`First ${rowId}`}</button>
            <button type="button">{`Second ${rowId}`}</button>
          </div>
        )),
      });
      const container = screen.getByRole('region', { name: 'Actions row-0' });
      const firstButton = screen.getByRole('button', { name: 'First row-0' });
      const secondButton = screen.getByRole('button', { name: 'Second row-0' });

      await user.tab();
      await user.tab();
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Enter}');
      expect(container).toHaveFocus();

      await user.tab();
      expect(firstButton).toHaveFocus();
      await user.tab();
      expect(secondButton).toHaveFocus();
      await user.tab();
      expect(container).toHaveFocus();
      await user.tab({ shift: true });
      expect(secondButton).toHaveFocus();
      await user.tab({ shift: true });
      expect(firstButton).toHaveFocus();
    });

    it('describes how to enter a cell with focusable content and announces how to leave', async () => {
      const user = userEvent.setup();
      renderGridBetweenButtons({ gridColumns: columnsWithLinks });

      await user.tab();
      await user.tab();
      expect(await expectFocus('Name 0')).not.toHaveAccessibleDescription();

      await user.keyboard('{End}');
      expect(await expectFocus('Open row-0')).toHaveAccessibleDescription(
        "Press the Enter key to interact with this cell's contents."
      );

      await user.keyboard('{Enter}');
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(
          'Press the Escape key to return to the cell.'
        )
      );
    });

    it('activates the cell that owns a clicked link', async () => {
      const user = userEvent.setup();
      const { after } = renderGridBetweenButtons({ gridColumns: columnsWithLinks });

      await user.click(screen.getByRole('link', { name: 'Open row-1' }));
      expect(openedLinks).toEqual(['https://example.com/row-1']);

      await user.click(after);
      await user.tab({ shift: true });
      await expectFocus('Open row-1');
    });

    it('moves focus to a details summary on Enter', async () => {
      const user = userEvent.setup();
      renderGridBetweenButtons({
        gridColumns: createContentColumns((rowId) => (
          <details>
            <summary>{`More about ${rowId}`}</summary>
            Details
          </details>
        )),
      });

      await user.tab();
      await user.tab();
      await user.keyboard('{End}{Enter}');

      expect(screen.getByText('More about row-0')).toHaveFocus();
    });

    it('skips content that opts out with a negative tabindex on Enter', async () => {
      const user = userEvent.setup();
      renderGridBetweenButtons({
        gridColumns: createContentColumns((rowId) => (
          <>
            <a href={`https://example.com/${rowId}`} tabIndex={-1}>{`Skipped ${rowId}`}</a>{' '}
            <button type="button">{`Inspect ${rowId}`}</button>
          </>
        )),
      });

      await user.tab();
      await user.tab();
      await user.keyboard('{End}{Enter}');

      expect(screen.getByRole('button', { name: 'Inspect row-0' })).toHaveFocus();
    });
  });
});
