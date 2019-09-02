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

test('throws if no overlays service provided', () => {
  const overlays = createReactOverlays({});
  expect(() => overlays.openFlyout(null)).toThrowErrorMatchingInlineSnapshot(
    `"Could not show overlay as overlays service is not available."`
  );
});

test('creates wrapped overlays service', () => {
  const overlays = createReactOverlays({
    overlays: {
      openFlyout: jest.fn(),
      openModal: jest.fn(),
    },
  });

  expect(typeof overlays.openFlyout).toBe('function');
  expect(typeof overlays.openModal).toBe('function');
});

test('can open flyout with React element', () => {
  const openFlyout = jest.fn();
  const overlays = createReactOverlays({
    overlays: {
      openFlyout,
      openModal: jest.fn(),
    },
  });

  expect(openFlyout).toHaveBeenCalledTimes(0);

  overlays.openFlyout(<div>foo</div>);

  expect(openFlyout).toHaveBeenCalledTimes(1);
  expect(openFlyout.mock.calls[0][0]).toMatchInlineSnapshot(`
        <React.Fragment>
          <div>
            foo
          </div>
        </React.Fragment>
    `);
});

test('can open modal with React element', () => {
  const openFlyout = jest.fn();
  const openModal = jest.fn();
  const overlays = createReactOverlays({
    overlays: {
      openFlyout,
      openModal,
    },
  });

  expect(openModal).toHaveBeenCalledTimes(0);

  overlays.openModal(<div>bar</div>);

  expect(openModal).toHaveBeenCalledTimes(1);
  expect(openModal.mock.calls[0][0]).toMatchInlineSnapshot(`
        <React.Fragment>
          <div>
            bar
          </div>
        </React.Fragment>
    `);
});

test('passes through flyout options when opening flyout', () => {
  const openFlyout = jest.fn();
  const overlays = createReactOverlays({
    overlays: {
      openFlyout,
      openModal: jest.fn(),
    },
  });

  overlays.openFlyout(<>foo</>, {
    'data-test-subj': 'foo',
    closeButtonAriaLabel: 'bar',
  });

  expect(openFlyout.mock.calls[0][1]).toEqual({
    'data-test-subj': 'foo',
    closeButtonAriaLabel: 'bar',
  });
});

test('passes through modal options when opening modal', () => {
  const openModal = jest.fn();
  const overlays = createReactOverlays({
    overlays: {
      openFlyout: jest.fn(),
      openModal,
    },
  });

  overlays.openModal(<>foo</>, {
    'data-test-subj': 'foo2',
    closeButtonAriaLabel: 'bar2',
  });

  expect(openModal.mock.calls[0][1]).toEqual({
    'data-test-subj': 'foo2',
    closeButtonAriaLabel: 'bar2',
  });
});
