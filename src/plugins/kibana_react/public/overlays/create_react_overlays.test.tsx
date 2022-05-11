/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { createReactOverlays } from './create_react_overlays';
import { overlayServiceMock } from '@kbn/core/public/mocks';

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
