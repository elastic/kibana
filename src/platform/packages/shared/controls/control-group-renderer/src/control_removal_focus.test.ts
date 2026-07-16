/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsLayout } from '@kbn/controls-renderer';
import { getRemovalFocusTarget } from '@kbn/presentation-util';
import { getControlIdsInOrder, restoreFocusAfterControlRemoval } from './control_removal_focus';

const createLayout = (controls: ControlsLayout['controls']): ControlsLayout => ({ controls });

describe('control removal focus', () => {
  describe('getControlIdsInOrder', () => {
    it('orders controls by their order field', () => {
      expect(
        getControlIdsInOrder(
          createLayout({
            second: { order: 1, width: 'medium', grow: false, type: 'optionsListControl' },
            first: { order: 0, width: 'medium', grow: false, type: 'optionsListControl' },
          })
        )
      ).toEqual(['first', 'second']);
    });
  });

  describe('getRemovalFocusTarget', () => {
    it('prefers the predecessor', () => {
      expect(getRemovalFocusTarget(['first', 'removed', 'last'], 'removed')).toBe('first');
    });

    it('uses the next control when removing the first', () => {
      expect(getRemovalFocusTarget(['removed', 'next'], 'removed')).toBe('next');
    });

    it('returns undefined when removing the only control', () => {
      expect(getRemovalFocusTarget(['removed'], 'removed')).toBeUndefined();
    });
  });

  it('focuses the predecessor control container after removal', () => {
    jest.useFakeTimers();
    const layout = createLayout({
      previous: { order: 0, width: 'medium', grow: false, type: 'optionsListControl' },
      removed: { order: 1, width: 'medium', grow: false, type: 'optionsListControl' },
    });
    const previousControl = document.createElement('div');
    previousControl.id = 'panel-previous';
    previousControl.tabIndex = -1;
    document.body.appendChild(previousControl);

    restoreFocusAfterControlRemoval(layout, 'removed', () => null);
    jest.runAllTimers();

    expect(document.activeElement).toBe(previousControl);
    previousControl.remove();
    jest.useRealTimers();
  });

  it('focuses the supplied fallback after removing the only control', () => {
    jest.useFakeTimers();
    const layout = createLayout({
      removed: { order: 0, width: 'medium', grow: false, type: 'optionsListControl' },
    });
    const fallback = document.createElement('div');
    fallback.tabIndex = -1;
    document.body.appendChild(fallback);

    restoreFocusAfterControlRemoval(layout, 'removed', () => fallback);
    jest.runAllTimers();

    expect(document.activeElement).toBe(fallback);
    fallback.remove();
    jest.useRealTimers();
  });
});
