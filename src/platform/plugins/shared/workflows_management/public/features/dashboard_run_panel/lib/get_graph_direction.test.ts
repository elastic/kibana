/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGraphDirection } from './get_graph_direction';

const wide = { width: 600, height: 150 };
const tall = { width: 300, height: 500 };

// A chain of steps: long along the flow, narrow across it.
const graphSizes = {
  LR: { width: 3000, height: 100 },
  TB: { width: 300, height: 1000 },
};

describe('getGraphDirection', () => {
  it('uses the chosen direction whatever the panel shape', () => {
    expect(getGraphDirection('horizontal', tall, { graphSizes })).toBe('LR');
    expect(getGraphDirection('vertical', wide, { graphSizes })).toBe('TB');
  });

  it('follows the panel shape when the graph size is unknown', () => {
    expect(getGraphDirection('auto', wide)).toBe('LR');
    expect(getGraphDirection(undefined, tall)).toBe('TB');
  });

  it('picks the direction that draws the graph largest', () => {
    // Slightly wide, yet the chain is drawn larger top to bottom.
    expect(getGraphDirection('auto', { width: 480, height: 380 }, { graphSizes })).toBe('TB');
    // Wide enough for the chain to read better left to right.
    expect(getGraphDirection(undefined, { width: 1900, height: 200 }, { graphSizes })).toBe('LR');
  });

  it('gives panels of the same size the same direction whatever they showed before', () => {
    const panel = { width: 1080, height: 320 };
    expect(getGraphDirection('auto', panel, { graphSizes, current: 'TB' })).toBe('LR');
    expect(getGraphDirection('auto', panel, { graphSizes, current: 'LR' })).toBe('LR');
  });

  it('follows the panel shape when both directions draw the graph at full size', () => {
    const small = { LR: { width: 200, height: 50 }, TB: { width: 50, height: 200 } };
    expect(getGraphDirection('auto', { width: 900, height: 400 }, { graphSizes: small })).toBe(
      'LR'
    );
  });

  it('keeps the current direction while held, such as when a flyout narrows the panel', () => {
    const narrowed = { width: 480, height: 380 };
    expect(getGraphDirection('auto', narrowed, { graphSizes, current: 'LR', hold: true })).toBe(
      'LR'
    );
    expect(getGraphDirection('auto', narrowed, { graphSizes, current: 'LR' })).toBe('TB');
    expect(getGraphDirection('vertical', narrowed, { current: 'LR', hold: true })).toBe('TB');
  });

  it('keeps the current direction while the panel is not measured', () => {
    expect(getGraphDirection('auto', { width: 0, height: 0 }, { graphSizes, current: 'LR' })).toBe(
      'LR'
    );
  });
});
