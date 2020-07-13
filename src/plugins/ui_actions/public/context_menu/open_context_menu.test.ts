/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createInteractionPositionTracker } from './open_context_menu';
import { fireEvent } from '@testing-library/dom';

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
