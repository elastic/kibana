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

import { focusAdjacentTrigger } from './focus_adjacent_trigger';

describe('focusAdjacentTrigger', () => {
  const TestComponent = forwardRef<HTMLButtonElement>((_, ref) => (
    <div id="navigation-root">
      <button data-menu-item>First</button>
      <button ref={ref} data-menu-item>
        Second
      </button>
      <button data-menu-item>Third</button>
    </div>
  ));

  const setup = () => {
    const ref: { current: HTMLButtonElement | null } = { current: null };

    const { container, unmount } = render(<TestComponent ref={(el) => (ref.current = el)} />);

    const triggers = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-menu-item]'));
    triggers.forEach((trigger) => {
      jest.spyOn(trigger, 'focus');
    });

    return { ref, triggers, container, unmount };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does nothing when `ref.current` is `null`', () => {
    const { triggers } = setup();
    const ref: { current: HTMLButtonElement | null } = { current: null };

    focusAdjacentTrigger(ref, 1);

    triggers.forEach((t) => expect(t.focus).not.toHaveBeenCalled());
  });

  it('focuses the next trigger when direction is 1', () => {
    const { ref, triggers } = setup();

    ref.current = triggers[1];
    focusAdjacentTrigger(ref, 1);

    expect(triggers[2].focus).toHaveBeenCalled();
  });

  it('focuses the previous trigger when direction is -1', () => {
    const { ref, triggers } = setup();

    ref.current = triggers[1];
    focusAdjacentTrigger(ref, -1);

    expect(triggers[0].focus).toHaveBeenCalled();
  });

  it('clamps focus at the first trigger when moving backward from start', () => {
    const { ref, triggers } = setup();

    ref.current = triggers[0];
    focusAdjacentTrigger(ref, -1);

    expect(triggers[0].focus).toHaveBeenCalled();
  });

  it('clamps focus at the last trigger when moving forward from end', () => {
    const { ref, triggers } = setup();

    ref.current = triggers[2];
    focusAdjacentTrigger(ref, 1);

    expect(triggers[2].focus).toHaveBeenCalled();
  });

  it('skips disabled triggers', () => {
    const { ref, triggers } = setup();

    triggers[1].setAttribute('disabled', '');
    ref.current = triggers[0];
    focusAdjacentTrigger(ref, 1);

    expect(triggers[2].focus).toHaveBeenCalled();
  });

  it('skips `aria-hidden` triggers', () => {
    const { ref, triggers } = setup();

    triggers[1].setAttribute('aria-hidden', 'true');
    ref.current = triggers[0];
    focusAdjacentTrigger(ref, 1);

    expect(triggers[2].focus).toHaveBeenCalled();
  });

  it('skips `display: none;` or `visibility: hidden;` triggers', () => {
    const { ref, triggers } = setup();

    jest.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
      if (el === triggers[1]) {
        return { display: 'none', visibility: 'visible' } as CSSStyleDeclaration;
      }
      return { display: 'block', visibility: 'visible' } as CSSStyleDeclaration;
    });

    ref.current = triggers[0];
    focusAdjacentTrigger(ref, 1);

    expect(triggers[2].focus).toHaveBeenCalled();
  });

  it('does nothing if current trigger is not part of the list', () => {
    const { triggers } = setup();

    const ref: { current: HTMLButtonElement | null } = {
      current: document.createElement('button'),
    };
    focusAdjacentTrigger(ref, 1);

    triggers.forEach((t) => expect(t.focus).not.toHaveBeenCalled());
  });

  it('handles missing `#navigation-root` gracefully', () => {
    const { ref, triggers, unmount } = setup();

    const querySpy = jest
      .spyOn(document, 'querySelector')
      .mockImplementation((selector: string) => {
        if (selector === '#navigation-root') {
          return null;
        }
        return HTMLElement.prototype.querySelector.call(document, selector);
      });

    ref.current = triggers[0];
    focusAdjacentTrigger(ref, 1);

    triggers.forEach((t) => expect(t.focus).not.toHaveBeenCalled());

    querySpy.mockRestore();
    unmount();
  });
});
