/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_METRIC_STYLE_TEMPLATE } from './constants';
import type { IconPosition } from './types';
import { getEffectiveIconAlign, inferStyleTemplate } from './utils';

describe('getEffectiveIconAlign', () => {
  it.each<{
    state: { icon?: string; iconAlign?: IconPosition };
    expected: IconPosition;
    scenario: string;
  }>([
    { state: {}, expected: 'right', scenario: 'no icon' },
    { state: { icon: 'empty' }, expected: 'right', scenario: 'icon cleared (empty)' },
    {
      state: { icon: 'sortUp' },
      expected: 'left',
      scenario: 'icon set but iconAlign omitted (legacy saved metrics)',
    },
    {
      state: { icon: 'sortUp', iconAlign: 'right' },
      expected: 'right',
      scenario: 'icon and explicit iconAlign right',
    },
    {
      state: { icon: 'sortUp', iconAlign: 'left' },
      expected: 'left',
      scenario: 'icon and explicit iconAlign left',
    },
    { state: { iconAlign: 'left' }, expected: 'left', scenario: 'only iconAlign set' },
  ])('$scenario → $expected', ({ state, expected }) => {
    expect(getEffectiveIconAlign(state)).toBe(expected);
  });
});

describe('inferStyleTemplate', () => {
  const bottom = LENS_METRIC_STYLE_TEMPLATE.bottom;

  it.each<{
    state: Parameters<typeof inferStyleTemplate>[0];
    expected: ReturnType<typeof inferStyleTemplate>;
    scenario: string;
  }>([
    { state: bottom, expected: 'bottom', scenario: 'state matches bottom preset' },
    {
      state: LENS_METRIC_STYLE_TEMPLATE.middle,
      expected: 'middle',
      scenario: 'state matches middle preset',
    },
    {
      state: LENS_METRIC_STYLE_TEMPLATE.top,
      expected: 'top',
      scenario: 'state matches top preset',
    },
    {
      state: {},
      expected: 'bottom',
      scenario: 'empty legacy state (all fields absent; defaults equal bottom preset)',
    },
    {
      state: { ...bottom, icon: 'empty' },
      expected: 'bottom',
      scenario: 'icon empty sentinel (no legacy icon fallback)',
    },
  ])('$scenario → $expected', ({ state, expected }) => {
    expect(inferStyleTemplate(state)).toBe(expected);
  });

  it.each<{
    state: Parameters<typeof inferStyleTemplate>[0];
    scenario: string;
  }>([
    {
      state: { ...bottom, primaryAlign: 'left' },
      scenario: 'layout breaks preset (primaryAlign does not match bottom)',
    },
    {
      state: { ...bottom, valueFontMode: 'fit' },
      scenario: 'non-default valueFontMode',
    },
    {
      state: { ...bottom, iconAlign: 'left' },
      scenario: 'non-default explicit iconAlign',
    },
    {
      state: { ...bottom, icon: 'sortUp' },
      scenario:
        'legacy icon without stored iconAlign (effective align is left, not preset default)',
    },
  ])('$scenario → custom', ({ state }) => {
    expect(inferStyleTemplate(state)).toBe('custom');
  });
});
