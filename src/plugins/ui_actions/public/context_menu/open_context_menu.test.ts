/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createInteractionPositionTracker } from './open_context_menu';
import { fireEvent } from '@testing-library/react';

let targetEl: Element;
const top = 100;
const left = 100;
const right = 200;
const bottom = 200;
beforeEach(() => {
  targetEl = document.createElement('div');
  jest.spyOn(targetEl, 'getBoundingClientRect').mockImplementation(() => ({
    top,
    left,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => {},
  }));
  document.body.append(targetEl);
});
afterEach(() => {
  targetEl.remove();
});

test('should use last clicked element position if mouse position is outside target element', () => {
  const { resolveLastPosition } = createInteractionPositionTracker();

  fireEvent.click(targetEl, { clientX: 0, clientY: 0 });
  const { x, y } = resolveLastPosition();

  expect(y).toBe(bottom);
  expect(x).toBe(left + (right - left) / 2);
});

test('should use mouse position if mouse inside clicked element', () => {
  const { resolveLastPosition } = createInteractionPositionTracker();

  const mouseX = 150;
  const mouseY = 150;
  fireEvent.click(targetEl, { clientX: mouseX, clientY: mouseY });

  const { x, y } = resolveLastPosition();

  expect(y).toBe(mouseX);
  expect(x).toBe(mouseY);
});

test('should use position of previous element, if latest element is no longer in DOM', () => {
  const { resolveLastPosition } = createInteractionPositionTracker();

  const detachedElement = document.createElement('div');
  const spy = jest.spyOn(detachedElement, 'getBoundingClientRect');

  fireEvent.click(targetEl);
  fireEvent.click(detachedElement);

  const { x, y } = resolveLastPosition();

  expect(y).toBe(bottom);
  expect(x).toBe(left + (right - left) / 2);
  expect(spy).not.toBeCalled();
});
