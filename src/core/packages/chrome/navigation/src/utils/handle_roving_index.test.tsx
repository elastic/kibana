/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';

import { handleRovingIndex } from './handle_roving_index';

const RovingMenu = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} data-testid="root" onKeyDown={handleRovingIndex}>
      <button data-menu-item="true">First</button>
      <button data-menu-item="true">Second</button>
      <button data-menu-item="true">Third</button>
    </div>
  );
};

describe('handleRovingIndex', () => {
  const getButtons = () => {
    return screen.getAllByRole('button');
  };

  const focusButton = (idx: number) => {
    getButtons()[idx].focus();

    expect(document.activeElement).toBe(getButtons()[idx]);
  };

  it('moves focus to the next element on ArrowDown', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RovingMenu />);
    focusButton(0);

    await user.keyboard('{arrowdown}');

    expect(document.activeElement).toBe(getButtons()[1]);
  });

  it('moves focus to the previous element on ArrowUp', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RovingMenu />);
    focusButton(2);

    await user.keyboard('{arrowup}');

    expect(document.activeElement).toBe(getButtons()[1]);
  });

  it('jumps to first and last elements with Home/End keys', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RovingMenu />);
    focusButton(1);

    await user.keyboard('{home}');
    expect(document.activeElement).toBe(getButtons()[0]);

    await user.keyboard('{end}');
    expect(document.activeElement).toBe(getButtons()[2]);
  });

  it('ignores keys unrelated to navigation', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<RovingMenu />);
    focusButton(0);

    await user.keyboard('{enter}');

    expect(document.activeElement).toBe(getButtons()[0]);
  });
});
