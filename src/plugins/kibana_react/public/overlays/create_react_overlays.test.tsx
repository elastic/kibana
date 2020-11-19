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

import * as React from 'react';
import { createReactOverlays } from './create_react_overlays';
import { overlayServiceMock } from '../../../../core/public/mocks';

test('throws if no overlays service provided', () => {
  const overlays = createReactOverlays({});
  expect(() => overlays.openFlyout(null)).toThrowErrorMatchingInlineSnapshot(
    `"Could not show overlay as overlays service is not available."`
  );
});

test('creates wrapped overlays service', () => {
  const overlays = createReactOverlays({
    overlays: overlayServiceMock.createStartContract(),
  });

  expect(typeof overlays.openFlyout).toBe('function');
  expect(typeof overlays.openModal).toBe('function');
});

test('can open flyout with React element', () => {
  const coreOverlays = overlayServiceMock.createStartContract();
  const overlays = createReactOverlays({
    overlays: coreOverlays,
  });

  expect(coreOverlays.openFlyout).toHaveBeenCalledTimes(0);

  overlays.openFlyout(<div>foo</div>);

  expect(coreOverlays.openFlyout).toHaveBeenCalledTimes(1);

  const container = document.createElement('div');
  const mount = coreOverlays.openFlyout.mock.calls[0][0];
  mount(container);
  expect(container.innerHTML).toMatchInlineSnapshot(`"<div>foo</div>"`);
});

test('can open modal with React element', () => {
  const coreOverlays = overlayServiceMock.createStartContract();
  const overlays = createReactOverlays({
    overlays: coreOverlays,
  });

  expect(coreOverlays.openModal).toHaveBeenCalledTimes(0);

  overlays.openModal(<div>bar</div>);

  expect(coreOverlays.openModal).toHaveBeenCalledTimes(1);
  const container = document.createElement('div');
  const mount = coreOverlays.openModal.mock.calls[0][0];
  mount(container);
  expect(container.innerHTML).toMatchInlineSnapshot(`"<div>bar</div>"`);
});

test('passes through flyout options when opening flyout', () => {
  const coreOverlays = overlayServiceMock.createStartContract();
  const overlays = createReactOverlays({
    overlays: coreOverlays,
  });

  overlays.openFlyout(<>foo</>, {
    'data-test-subj': 'foo',
    closeButtonAriaLabel: 'bar',
  });

  expect(coreOverlays.openFlyout.mock.calls[0][1]).toEqual({
    'data-test-subj': 'foo',
    closeButtonAriaLabel: 'bar',
  });
});

test('passes through modal options when opening modal', () => {
  const coreOverlays = overlayServiceMock.createStartContract();
  const overlays = createReactOverlays({
    overlays: coreOverlays,
  });

  overlays.openModal(<>foo</>, {
    'data-test-subj': 'foo2',
    closeButtonAriaLabel: 'bar2',
  });

  expect(coreOverlays.openModal.mock.calls[0][1]).toEqual({
    'data-test-subj': 'foo2',
    closeButtonAriaLabel: 'bar2',
  });
});
