/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsLayout } from './types';
import {
  CONTROL_WIDTH_PIXELS,
  controlsLayoutToFlexLayout,
  flexLayoutToControlsLayout,
  getClosestControlWidth,
} from './utils';

const controlsLayout: ControlsLayout = {
  controls: {
    a: { type: 'options_list_control', order: 0, width: 'small', grow: true },
    b: { type: 'options_list_control', order: 1, width: 'large', grow: false },
  },
};

describe('controls <-> flex layout', () => {
  test('converts control widths to pixel widths', () => {
    expect(controlsLayoutToFlexLayout(controlsLayout)).toEqual({
      a: { type: 'panel', id: 'a', order: 0, grow: true, width: CONTROL_WIDTH_PIXELS.small },
      b: { type: 'panel', id: 'b', order: 1, grow: false, width: CONTROL_WIDTH_PIXELS.large },
    });
  });

  test('round trips without changes', () => {
    const flexLayout = controlsLayoutToFlexLayout(controlsLayout);
    expect(flexLayoutToControlsLayout(flexLayout, controlsLayout)).toEqual(controlsLayout);
  });

  test('applies reorders and snaps resized widths, preserving other state', () => {
    const flexLayout = controlsLayoutToFlexLayout(controlsLayout);
    const result = flexLayoutToControlsLayout(
      {
        a: { ...flexLayout.a, order: 1, width: 380 },
        b: { ...flexLayout.b, order: 0 },
      },
      controlsLayout
    );
    expect(result.controls.a).toEqual({ ...controlsLayout.controls.a, order: 1, width: 'medium' });
    expect(result.controls.b).toEqual({ ...controlsLayout.controls.b, order: 0 });
  });

  test('ignores flex panels without a matching control', () => {
    const flexLayout = controlsLayoutToFlexLayout(controlsLayout);
    const result = flexLayoutToControlsLayout(
      { ...flexLayout, c: { ...flexLayout.a, id: 'c' } },
      controlsLayout
    );
    expect(Object.keys(result.controls)).toEqual(['a', 'b']);
  });

  test('getClosestControlWidth snaps to the nearest option', () => {
    expect(getClosestControlWidth(100)).toBe('small');
    expect(getClosestControlWidth(320)).toBe('medium');
    expect(getClosestControlWidth(2000)).toBe('large');
  });
});
