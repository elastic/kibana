/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef } from 'react';
import { render } from '@testing-library/react';

import { focusFirstElement } from './focus_first_element';
import { getFocusableElements } from './get_focusable_elements';

jest.mock('./get_focusable_elements');

const mockGetFocusableElements = getFocusableElements as jest.MockedFunction<
  typeof getFocusableElements
>;

describe('focusFirstElement', () => {
  const Wrapper = forwardRef<HTMLDivElement>((_, ref) => (
    <div ref={ref}>
      <button>First</button>
      <button>Second</button>
    </div>
  ));

  const setup = () => {
    const ref: { current: HTMLDivElement | null } = { current: null };
    const { container } = render(<Wrapper ref={(el) => (ref.current = el)} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => (btn.focus = jest.fn()));

    return { ref, buttons };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing if ref.current is null', () => {
    const ref = { current: null };

    focusFirstElement(ref);

    expect(mockGetFocusableElements).not.toHaveBeenCalled();
  });

  it('calls getFocusableElements with the container', () => {
    const { ref } = setup();

    mockGetFocusableElements.mockReturnValue([]);
    focusFirstElement(ref);

    expect(mockGetFocusableElements).toHaveBeenCalledWith(ref.current);
  });

  it('focuses the first focusable element', () => {
    const { ref, buttons } = setup();

    mockGetFocusableElements.mockReturnValue(Array.from(buttons));
    focusFirstElement(ref);

    expect(buttons[0].focus).toHaveBeenCalledTimes(1);
  });

  it('does nothing if there are no focusable elements', () => {
    const { ref, buttons } = setup();

    mockGetFocusableElements.mockReturnValue([]);
    focusFirstElement(ref);

    buttons.forEach((btn) => expect(btn.focus).not.toHaveBeenCalled());
  });

  it('focuses the correct element even if the first is hidden', () => {
    const { ref, buttons } = setup();

    buttons[0].setAttribute('hidden', '');
    mockGetFocusableElements.mockReturnValue([buttons[1]]);
    focusFirstElement(ref);

    expect(buttons[1].focus).toHaveBeenCalled();
  });
});
