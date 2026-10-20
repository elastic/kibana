/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMinimapNodeColor } from './minimap_node_color';

const colors = {
  danger: 'red',
  success: 'green',
  dangerText: 'darkred',
  accent: 'pink',
  primary: 'blue',
};

describe('getMinimapNodeColor', () => {
  it('hides bypass lane placeholders', () => {
    expect(getMinimapNodeColor({ type: 'bypassLane' }, colors)).toBe('transparent');
  });

  it('colours by execution status', () => {
    expect(getMinimapNodeColor({ data: { stepExecution: { status: 'failed' } } }, colors)).toBe(
      'red'
    );
    expect(getMinimapNodeColor({ data: { stepExecution: { status: 'completed' } } }, colors)).toBe(
      'green'
    );
  });

  it('prefers failed over the fallback tint', () => {
    expect(
      getMinimapNodeColor(
        { data: { fallbackOf: 'step', stepExecution: { status: 'failed' } } },
        colors
      )
    ).toBe('red');
  });

  it('tints fallback-lane nodes that have not failed', () => {
    expect(getMinimapNodeColor({ data: { fallbackOf: 'step' } }, colors)).toBe('darkred');
  });

  it('uses the accent for trigger nodes and primary for other steps', () => {
    expect(getMinimapNodeColor({ data: { isTrigger: true } }, colors)).toBe('pink');
    expect(getMinimapNodeColor({ data: { stepType: 'manual' } }, colors)).toBe('pink');
    expect(getMinimapNodeColor({ data: { stepType: 'http' } }, colors)).toBe('blue');
    expect(getMinimapNodeColor({ data: {} }, colors)).toBe('blue');
    expect(getMinimapNodeColor({}, colors)).toBe('blue');
  });
});
