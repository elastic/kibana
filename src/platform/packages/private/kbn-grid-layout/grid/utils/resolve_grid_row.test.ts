/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveGridRow } from './resolve_grid_row';

describe('resolve grid row', () => {
  test('does nothing if grid row has no collisions', () => {
    const gridRow = {
      title: 'Test',
      isCollapsed: false,
      panels: {
        panel1: { id: 'panel1', row: 3, column: 0, height: 1, width: 7 },
        panel2: { id: 'panel2', row: 4, column: 0, height: 1, width: 7 },
        panel3: { id: 'panel3', row: 5, column: 0, height: 1, width: 7 },
        panel4: { id: 'panel4', row: 0, column: 6, height: 3, width: 1 },
      },
    };
    const result = resolveGridRow(gridRow);
    expect(result).toEqual(gridRow);
  });

  test('resolves grid row if it has collisions without drag event', () => {
    const result = resolveGridRow({
      title: 'Test',
      isCollapsed: false,
      panels: {
        panel1: { id: 'panel1', row: 0, column: 0, height: 3, width: 4 },
        panel2: { id: 'panel2', row: 3, column: 0, height: 2, width: 2 },
        panel3: { id: 'panel3', row: 3, column: 2, height: 2, width: 2 },
        panel4: { id: 'panel4', row: 0, column: 3, height: 5, width: 4 },
      },
    });
    expect(result).toEqual({
      title: 'Test',
      isCollapsed: false,
      panels: {
        panel1: { id: 'panel1', row: 0, column: 0, height: 3, width: 4 },
        panel2: { id: 'panel2', row: 3, column: 0, height: 2, width: 2 },
        panel3: { id: 'panel3', row: 8, column: 2, height: 2, width: 2 }, // pushed down
        panel4: { id: 'panel4', row: 3, column: 3, height: 5, width: 4 }, // pushed down
      },
    });
  });

  test('drag causes no collision', () => {
    const result = resolveGridRow(
      {
        title: 'Test',
        isCollapsed: false,
        panels: {
          panel1: { id: 'panel1', row: 0, column: 0, height: 1, width: 7 },
          panel2: { id: 'panel2', row: 1, column: 0, height: 1, width: 7 },
          panel3: { id: 'panel3', row: 2, column: 0, height: 1, width: 7 },
        },
      },
      { id: 'panel4', row: 0, column: 7, height: 3, width: 1 }
    );

    expect(result).toEqual({
      title: 'Test',
      isCollapsed: false,
      panels: {
        panel1: { id: 'panel1', row: 0, column: 0, height: 1, width: 7 },
        panel2: { id: 'panel2', row: 1, column: 0, height: 1, width: 7 },
        panel3: { id: 'panel3', row: 2, column: 0, height: 1, width: 7 },
        panel4: { id: 'panel4', row: 0, column: 7, height: 3, width: 1 },
      },
    });
  });

  test('drag causes collision with one panel that pushes down others', () => {
    const result = resolveGridRow(
      {
        title: 'Test',
        isCollapsed: false,
        panels: {
          panel1: { id: 'panel1', row: 0, column: 0, height: 1, width: 7 },
          panel2: { id: 'panel2', row: 1, column: 0, height: 1, width: 7 },
          panel3: { id: 'panel3', row: 2, column: 0, height: 1, width: 8 },
          panel4: { id: 'panel4', row: 3, column: 4, height: 3, width: 4 },
        },
      },
      { id: 'panel5', row: 2, column: 0, height: 3, width: 3 }
    );

    expect(result).toEqual({
      title: 'Test',
      isCollapsed: false,
      panels: {
        panel1: { id: 'panel1', row: 0, column: 0, height: 1, width: 7 },
        panel2: { id: 'panel2', row: 1, column: 0, height: 1, width: 7 },
        panel3: { id: 'panel3', row: 5, column: 0, height: 1, width: 8 }, // pushed down
        panel4: { id: 'panel4', row: 6, column: 4, height: 3, width: 4 }, // pushed down
        panel5: { id: 'panel5', row: 2, column: 0, height: 3, width: 3 },
      },
    });
  });

  test('drag causes collision with multiple panels', () => {
    const result = resolveGridRow(
      {
        title: 'Test',
        isCollapsed: false,
        panels: {
          panel1: { id: 'panel1', row: 0, column: 0, height: 3, width: 4 },
          panel2: { id: 'panel2', row: 3, column: 0, height: 2, width: 2 },
          panel3: { id: 'panel3', row: 3, column: 2, height: 2, width: 2 },
        },
      },
      { id: 'panel4', row: 0, column: 3, height: 5, width: 4 }
    );
    expect(result).toEqual({
      title: 'Test',
      isCollapsed: false,
      panels: {
        panel1: { id: 'panel1', row: 5, column: 0, height: 3, width: 4 }, // pushed down
        panel2: { id: 'panel2', row: 8, column: 0, height: 2, width: 2 }, // pushed down
        panel3: { id: 'panel3', row: 8, column: 2, height: 2, width: 2 }, // pushed down
        panel4: { id: 'panel4', row: 0, column: 3, height: 5, width: 4 },
      },
    });
  });

  test('drag causes collision with every panel', () => {
    const result = resolveGridRow(
      {
        title: 'Test',
        isCollapsed: false,
        panels: {
          panel1: { id: 'panel1', row: 0, column: 0, height: 1, width: 7 },
          panel2: { id: 'panel2', row: 1, column: 0, height: 1, width: 7 },
          panel3: { id: 'panel3', row: 2, column: 0, height: 1, width: 7 },
        },
      },
      { id: 'panel4', row: 0, column: 6, height: 3, width: 1 }
    );

    expect(result).toEqual({
      title: 'Test',
      isCollapsed: false,
      panels: {
        panel1: { id: 'panel1', row: 3, column: 0, height: 1, width: 7 },
        panel2: { id: 'panel2', row: 4, column: 0, height: 1, width: 7 },
        panel3: { id: 'panel3', row: 5, column: 0, height: 1, width: 7 },
        panel4: { id: 'panel4', row: 0, column: 6, height: 3, width: 1 },
      },
    });
  });
});
