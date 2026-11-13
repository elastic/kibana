/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, screen, waitFor } from '@testing-library/react';

import {
  cleanupDataGridTestState,
  columnsWithAriaLabel,
  expectFocus,
  focusElement,
  renderGrid,
  resetDataGridTestState,
} from './data_grid.test.helpers';

describe('DataGrid accessibility', () => {
  beforeEach(resetDataGridTestState);
  afterEach(cleanupDataGridTestState);

  it('renders the logical grid semantics independently of the virtual window', () => {
    renderGrid();

    const grid = screen.getByRole('grid', { name: 'Example data' });
    expect(grid.getAttribute('aria-rowcount')).toBe('100');
    expect(grid.getAttribute('aria-colcount')).toBe('2');
    expect(screen.getAllByRole('rowgroup')).toHaveLength(2);

    const headers = screen.getAllByRole('columnheader');
    expect(headers[0].getAttribute('aria-label')).toBeNull();
    expect(headers[0].getAttribute('aria-colindex')).toBe('1');
    expect(headers[1].getAttribute('aria-label')).toBeNull();
    expect(headers[1].getAttribute('aria-colindex')).toBe('2');
    expect(headers[0].hasAttribute('tabindex')).toBe(false);

    const allRows = screen.getAllByRole('row');
    expect(allRows.map((row) => row.getAttribute('aria-rowindex'))).toEqual([null, '1', '2', '3']);
    expect(allRows.slice(1)).toHaveLength(3);
    expect(screen.getByRole('gridcell', { name: 'Name 0' }).getAttribute('aria-colindex')).toBe(
      '1'
    );
    expect(screen.getByRole('gridcell', { name: 'Value 0' }).getAttribute('aria-colindex')).toBe(
      '2'
    );
  });

  it('requires a non-empty grid accessible name', () => {
    expect(() => renderGrid({ ariaLabel: ' ' })).toThrow(
      'DataGrid requires a non-empty accessible name.'
    );
  });

  it('allows a column header to override its accessible name', () => {
    renderGrid({ gridColumns: columnsWithAriaLabel });

    const header = screen.getByRole('columnheader', { name: 'Full name' });
    expect(header.textContent).toContain('Name');
    expect(header.getAttribute('aria-label')).toBe('Full name');
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
    const restoredTabStop = container.querySelector<HTMLElement>('[tabindex="0"]');
    if (!restoredTabStop) {
      throw new Error('Expected the grid to retain a composite tab stop.');
    }
    focusElement(restoredTabStop);
    expect(document.activeElement).toBe(secondCell);
    outsideButton.remove();
  });

  it('supports the empty grid as the initial composite tab stop', () => {
    const { container } = renderGrid({ gridRows: [] });
    const grid = screen.getByRole('grid');
    expect(grid.getAttribute('tabindex')).toBe('0');
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    focusElement(grid);
    expect(document.activeElement).toBe(grid);
  });

  it('copies the accessible cell value when no text is selected', async () => {
    renderGrid();
    const cell = screen.getByRole('gridcell', { name: 'Value 0' });
    focusElement(cell);
    const setData = jest.fn();

    await act(async () => {
      expect(fireEvent.copy(cell, { clipboardData: { setData } })).toBe(false);
      await Promise.resolve();
    });

    expect(setData).toHaveBeenCalledWith('text/plain', 'Value 0');
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Cell value copied.')
    );
  });

  it('preserves native copy behavior when text is explicitly selected', () => {
    renderGrid();
    const cell = screen.getByRole('gridcell', { name: 'Name 0' });
    const cellText = cell.firstChild;
    if (!cellText) {
      throw new Error('Expected the cell to render text content.');
    }
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(cellText);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const setData = jest.fn();

    const browserHandled = fireEvent.copy(cell, { clipboardData: { setData } });

    expect(browserHandled).toBe(true);
    expect(setData).not.toHaveBeenCalled();
  });

  it('copies a multi-cell text selection as tabular text', () => {
    renderGrid();
    const cells = screen.getAllByRole('gridcell');
    const firstCellText = cells[0].firstChild;
    const lastCellText = cells[3].firstChild;
    if (!firstCellText?.textContent || !lastCellText?.textContent) {
      throw new Error('Expected the selected cells to render text content.');
    }

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(firstCellText, 0);
    range.setEnd(lastCellText, lastCellText.textContent.length);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const setData = jest.fn();

    expect(fireEvent.copy(cells[0], { clipboardData: { setData } })).toBe(false);
    expect(setData).toHaveBeenCalledWith('text/plain', 'Name 0\t0\nName 1\t1');
  });

  it('announces copy failure without moving focus', async () => {
    renderGrid();
    const cell = screen.getByRole('gridcell', { name: 'Name 0' });
    focusElement(cell);
    const setData = jest.fn(() => {
      throw new Error('Clipboard unavailable.');
    });

    expect(fireEvent.copy(cell, { clipboardData: { setData } })).toBe(true);

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Cell value could not be copied.')
    );
    expect(document.activeElement).toBe(cell);
  });
});
