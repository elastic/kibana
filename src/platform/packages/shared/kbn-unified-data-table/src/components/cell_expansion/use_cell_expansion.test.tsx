/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { useCellExpansion } from './use_cell_expansion';
import { CellExpansionPopover } from './cell_expansion_popover';

const rect = (top: number) => ({ top, left: 10, width: 20, height: 30 } as DOMRect);

describe('useCellExpansion', () => {
  const setup = () => {
    const cell = document.createElement('div');
    cell.tabIndex = 0;
    document.body.appendChild(cell);
    jest.spyOn(cell, 'getBoundingClientRect').mockReturnValue(rect(1));
    const trigger = document.createElement('button');
    cell.appendChild(trigger);
    jest.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(2));
    const { result } = renderHook(() => useCellExpansion({ current: cell }));
    return { cell, trigger, result };
  };

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens below the trigger and focuses the cell', () => {
    const { cell, trigger, result } = setup();
    expect(result.current.anchorRect).toBeUndefined();
    act(() => result.current.open(trigger));
    expect(result.current.anchorRect).toEqual(rect(2));
    expect(cell).toHaveFocus();
  });

  it('opens below the cell when no trigger is given, and closes', () => {
    const { result } = setup();
    act(() => result.current.open());
    expect(result.current.anchorRect).toEqual(rect(1));
    act(() => result.current.close());
    expect(result.current.anchorRect).toBeUndefined();
  });

  it('closes when the page scrolls the cell, but not for unrelated scrolling', () => {
    const { result } = setup();
    act(() => result.current.open());

    const unrelated = document.createElement('div');
    document.body.appendChild(unrelated);
    act(() => {
      unrelated.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.anchorRect).toBeDefined();

    act(() => {
      document.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.anchorRect).toBeUndefined();
  });
});

describe('CellExpansionPopover', () => {
  it('renders its content as a labelled dialog', () => {
    render(
      <CellExpansionPopover anchorRect={rect(5)} onClose={jest.fn()} aria-label="Cell details">
        <span>content</span>
      </CellExpansionPopover>
    );
    expect(screen.getByRole('dialog', { name: 'Cell details' })).toHaveTextContent('content');
    expect(screen.getByTestId('euiDataGridExpansionPopover')).toBeInTheDocument();
  });
});
