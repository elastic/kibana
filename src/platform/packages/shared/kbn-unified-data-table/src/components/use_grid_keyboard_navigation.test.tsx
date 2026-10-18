/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGridKeyboardNavigation } from './use_grid_keyboard_navigation';
import type { GridNavigationLayout } from './use_grid_keyboard_navigation';

interface TestGridProps {
  layout?: GridNavigationLayout;
  renderedBodyRows?: number[];
  scrollToBodyRow?: (row: number) => void;
  pageSize?: number;
}

// Header is row 1, body rows are 2-4 and the footer is row 5, with two columns.
const defaultLayout: GridNavigationLayout = {
  headerRow: 1,
  firstBodyRow: 2,
  lastBodyRow: 4,
  footerRow: 5,
};

const TestGrid = ({
  layout = defaultLayout,
  renderedBodyRows = [2, 3, 4],
  scrollToBodyRow = jest.fn(),
  pageSize,
}: TestGridProps) => {
  const gridRef = React.useRef<HTMLDivElement>(null);
  const { tabStop, onFocus, onKeyDown } = useGridKeyboardNavigation({
    gridRef,
    layout,
    colCount: 2,
    initialPosition: { row: 2, col: 1 },
    isBodyRowRendered: (row) => renderedBodyRows.includes(row),
    fallbackBodyRow: renderedBodyRows[0],
    scrollToBodyRow,
    pageSize,
  });
  const rows = [layout.headerRow, ...renderedBodyRows, layout.footerRow].filter(
    (row): row is number => row !== undefined
  );

  return (
    <div ref={gridRef} role="grid" tabIndex={-1} onFocus={onFocus} onKeyDown={onKeyDown}>
      <div data-test-subj="tabStop">{`${tabStop.row},${tabStop.col}`}</div>
      {rows.map((row) => (
        <div key={row} role="row" aria-rowindex={row}>
          {[1, 2].map((col) => (
            <div
              key={col}
              role="gridcell"
              aria-colindex={col}
              tabIndex={tabStop.row === row && tabStop.col === col ? 0 : -1}
              data-test-subj={`cell-${row}-${col}`}
            >
              {`${row}-${col}`}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

describe('useGridKeyboardNavigation', () => {
  const cell = (row: number, col: number) => screen.getByTestId(`cell-${row}-${col}`);

  it('starts with the initial position as the only tab stop', () => {
    render(<TestGrid />);
    expect(screen.getByTestId('tabStop')).toHaveTextContent('2,1');
    expect(cell(2, 1)).toHaveAttribute('tabindex', '0');
    expect(cell(3, 1)).toHaveAttribute('tabindex', '-1');
  });

  it('follows the focus', () => {
    render(<TestGrid />);
    act(() => cell(4, 2).focus());
    expect(screen.getByTestId('tabStop')).toHaveTextContent('4,2');
  });

  it('visits the header, the body and the footer in order', async () => {
    render(<TestGrid />);
    cell(2, 1).focus();

    await userEvent.keyboard('{ArrowUp}');
    expect(cell(1, 1)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(cell(5, 1)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(cell(5, 1)).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(cell(5, 2)).toHaveFocus();
    await userEvent.keyboard('{Control>}{Home}{/Control}');
    expect(cell(1, 1)).toHaveFocus();
    await userEvent.keyboard('{Control>}{End}{/Control}');
    expect(cell(5, 2)).toHaveFocus();
  });

  it('moves by pages', async () => {
    const layout = { headerRow: 1, firstBodyRow: 2, lastBodyRow: 4 };
    render(<TestGrid layout={layout} pageSize={2} />);
    cell(2, 1).focus();
    await userEvent.keyboard('{PageDown}');
    expect(cell(4, 1)).toHaveFocus();
    await userEvent.keyboard('{PageUp}{PageUp}');
    expect(cell(1, 1)).toHaveFocus();
  });

  it('supports a grid without header and footer, and one on a later page', async () => {
    const layout = { firstBodyRow: 12, lastBodyRow: 13 };
    render(<TestGrid layout={layout} renderedBodyRows={[12, 13]} />);
    cell(12, 1).focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(cell(12, 1)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(cell(13, 1)).toHaveFocus();
  });

  it('falls back to a rendered row when the tab stop row is virtualized out', () => {
    render(<TestGrid renderedBodyRows={[3, 4]} />);
    // The initial position, row 2, is not rendered.
    expect(screen.getByTestId('tabStop')).toHaveTextContent('3,1');
  });

  it('falls back when the tab stop row is outside of the body, e.g. on another page', () => {
    const layout = { headerRow: 1, firstBodyRow: 12, lastBodyRow: 13 };
    render(<TestGrid layout={layout} renderedBodyRows={[12, 13]} />);
    expect(screen.getByTestId('tabStop')).toHaveTextContent('12,1');
  });

  it('scrolls rows that are not rendered into view', async () => {
    const scrollToBodyRow = jest.fn();
    render(<TestGrid renderedBodyRows={[2, 3]} scrollToBodyRow={scrollToBodyRow} />);
    cell(3, 1).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(scrollToBodyRow).toHaveBeenCalledWith(4);
  });

  it('stops arrow keys and Escape from reaching the outside while a cell is focused', async () => {
    const onOutsideKeyDown = jest.fn();
    render(
      <div onKeyDown={onOutsideKeyDown}>
        <TestGrid />
      </div>
    );
    cell(2, 1).focus();
    await userEvent.keyboard('{ArrowDown}{Escape}');
    expect(onOutsideKeyDown).not.toHaveBeenCalled();
    await userEvent.keyboard('a');
    expect(onOutsideKeyDown).toHaveBeenCalledTimes(1);
  });
});
