/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createRef } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';

import type { DataGridApi, DataGridCommandResult } from './data_grid_api';
import {
  cleanupDataGridTestState,
  columns,
  expectFocus,
  focusVisibleTestHarness,
  focusElement,
  renderGrid,
  resetDataGridTestState,
  rows,
  runFocusCommand,
  TestDataGrid,
  virtualizerTestHarness,
} from './data_grid.test.helpers';

describe('DataGrid keyboard and logical focus', () => {
  beforeEach(resetDataGridTestState);
  afterEach(cleanupDataGridTestState);

  it('supports Arrow, Home, End, and Ctrl/Cmd+Home/End navigation', async () => {
    renderGrid();
    const firstCell = screen.getByRole('gridcell', { name: 'Name 0' });
    focusElement(firstCell);

    fireEvent.keyDown(firstCell, { key: 'ArrowRight' });
    const valueZero = await expectFocus('0');
    fireEvent.keyDown(valueZero, { key: 'ArrowDown' });
    const valueOne = await expectFocus('1');
    fireEvent.keyDown(valueOne, { key: 'Home' });
    const nameOne = await expectFocus('Name 1');
    fireEvent.keyDown(nameOne, { key: 'End' });
    const valueOneAgain = await expectFocus('1');

    fireEvent.keyDown(valueOneAgain, { key: 'End', ctrlKey: true });
    const lastCell = await expectFocus('99');
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(99, 'auto');

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
    const lastCell = await expectFocus('99');
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
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(3, 'auto');
  });

  it('does not let a delayed focus mount override a newer semantic scroll', async () => {
    virtualizerTestHarness.delayMounts();
    const apiRef = createRef<DataGridApi>();
    renderGrid({ apiRef });
    if (!apiRef.current) {
      throw new Error('Expected a data grid API.');
    }

    let pendingFocus: Promise<DataGridCommandResult> | undefined;
    act(() => {
      pendingFocus = apiRef.current?.focusCell({ rowId: 'row-50', columnId: 'name' });
    });
    expect(virtualizerTestHarness.pendingScrollCount).toBe(1);

    await expect(
      apiRef.current.scrollToCell({ rowId: 'row-10', columnId: 'name' })
    ).resolves.toEqual({ status: 'completed' });
    await expect(pendingFocus).resolves.toEqual({ status: 'cancelled', reason: 'superseded' });
    expect(virtualizerTestHarness.pendingScrollCount).toBe(2);

    virtualizerTestHarness.flushScroll(1);
    expect(screen.getByRole('gridcell', { name: 'Name 10' })).not.toBeNull();
    virtualizerTestHarness.flushScroll(0);
    const staleCell = screen.getByRole('gridcell', { name: 'Name 50' });
    const grid = screen.getByRole('grid');
    expect(document.activeElement).not.toBe(staleCell);
    expect(staleCell.getAttribute('tabindex')).toBe('-1');
    expect(grid.getAttribute('tabindex')).toBe('0');

    focusElement(grid);
    expect(virtualizerTestHarness.pendingScrollCount).toBe(3);
    virtualizerTestHarness.flushScroll(2);
    await expectFocus('Name 0');
  });

  it('re-resolves a delayed pending focus after row reordering', async () => {
    virtualizerTestHarness.delayMounts();
    const apiRef = createRef<DataGridApi>();
    const { rerender } = renderGrid({ apiRef });
    const outsideButton = document.createElement('button');
    document.body.append(outsideButton);
    focusElement(outsideButton);
    if (!apiRef.current) {
      throw new Error('Expected a data grid API.');
    }

    let pendingFocus: Promise<DataGridCommandResult> | undefined;
    act(() => {
      pendingFocus = apiRef.current?.focusCell({ rowId: 'row-50', columnId: 'name' });
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
    expect(focusedCell.parentElement?.getAttribute('aria-rowindex')).toBe('71');
    outsideButton.remove();
  });

  it('does not reclaim focus when a delayed destination mounts after Tab leaves the grid', async () => {
    virtualizerTestHarness.delayMounts();
    const apiRef = createRef<DataGridApi>();
    renderGrid({ apiRef });
    const activeCell = screen.getByRole('gridcell', { name: 'Name 0' });
    const outsideButton = document.createElement('button');
    document.body.append(outsideButton);
    focusElement(activeCell);
    if (!apiRef.current) {
      throw new Error('Expected a data grid API.');
    }

    let pendingFocus: Promise<DataGridCommandResult> | undefined;
    act(() => {
      pendingFocus = apiRef.current?.focusCell({ rowId: 'row-50', columnId: 'name' });
    });
    fireEvent.keyDown(activeCell, { key: 'Tab' });
    focusElement(outsideButton);

    await expect(pendingFocus).resolves.toEqual({ status: 'cancelled', reason: 'superseded' });
    virtualizerTestHarness.flushScroll(0);
    expect(document.activeElement).toBe(outsideButton);
    outsideButton.remove();
  });

  it('scrolls an already mounted navigation target into the visible viewport', async () => {
    renderGrid();
    const middleCell = screen.getByRole('gridcell', { name: 'Name 1' });
    focusElement(middleCell);

    fireEvent.keyDown(middleCell, { key: 'ArrowDown' });

    const nextCell = await expectFocus('Name 2');
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(2, 'auto');
    expect(virtualizerTestHarness.scrollToOffset).toHaveBeenLastCalledWith(80);

    fireEvent.keyDown(nextCell, { key: 'ArrowUp' });
    await expectFocus('Name 1');
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(1, 'auto');
    expect(virtualizerTestHarness.scrollToOffset).toHaveBeenLastCalledWith(40);
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
    await expectFocus('50');

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

    virtualizerTestHarness.failOffsetLookup();

    expect(await runFocusCommand(apiRef.current, 'row-50', 'value')).toEqual({
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

    expect(await apiRef.current.scrollToCell({ rowId: 'row-50', columnId: 'value' })).toEqual({
      status: 'failed',
      reason: 'scroll_failed',
    });
    expect(document.activeElement).toBe(activeCell);

    virtualizerTestHarness.allowOffsetLookup();
    virtualizerTestHarness.throwOnNextScroll();
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

  it('restores an off-screen active cell only when the grid receives keyboard focus', async () => {
    const apiRef = createRef<DataGridApi>();
    renderGrid({ apiRef });
    const activeCell = screen.getByRole('gridcell', { name: 'Name 0' });
    focusElement(activeCell);
    if (!apiRef.current) {
      throw new Error('Expected a data grid API.');
    }

    await act(async () => {
      await apiRef.current?.scrollToCell({ rowId: 'row-50', columnId: 'name' });
    });
    const grid = screen.getByRole('grid');
    expect(grid.getAttribute('tabindex')).toBe('0');
    expect(screen.queryByRole('gridcell', { name: 'Name 0' })).toBeNull();

    focusVisibleTestHarness.set(false);
    focusElement(grid);
    expect(document.activeElement).toBe(grid);
    expect(screen.queryByRole('gridcell', { name: 'Name 0' })).toBeNull();
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

  it('preserves logical row and column identity through reordering', async () => {
    const { rerender } = renderGrid();
    const activeCell = screen.getByRole('gridcell', { name: 'Name 1' });
    focusElement(activeCell);
    const reorderedRows = [rows[2], rows[0], rows[1], ...rows.slice(3)];

    rerender(<TestDataGrid gridRows={reorderedRows} />);

    const movedCell = await expectFocus('Name 1');
    expect(movedCell.parentElement?.getAttribute('aria-rowindex')).toBe('3');

    const rowsWithActiveMovedOffScreen = [
      rows[0],
      ...rows.slice(2, 52),
      rows[1],
      ...rows.slice(52),
    ];
    rerender(<TestDataGrid gridRows={rowsWithActiveMovedOffScreen} />);
    const offScreenMovedCell = await expectFocus('Name 1');
    expect(offScreenMovedCell.parentElement?.getAttribute('aria-rowindex')).toBe('52');
    expect(virtualizerTestHarness.getOffsetForIndex).toHaveBeenLastCalledWith(51, 'auto');

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
    expect(grid.getAttribute('aria-rowcount')).toBe('0');
    expect(grid.getAttribute('tabindex')).toBe('0');
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
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
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  });
});
