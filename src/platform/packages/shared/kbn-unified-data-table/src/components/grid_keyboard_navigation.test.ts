/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGridPosition, getNextGridPosition } from './grid_keyboard_navigation';

describe('grid keyboard navigation', () => {
  const bounds = { firstRow: 1, lastRow: 5, colCount: 3 };

  describe('getNextGridPosition', () => {
    it.each([
      ['ArrowUp', false, { row: 2, col: 2 }, { row: 1, col: 2 }],
      ['ArrowDown', false, { row: 2, col: 2 }, { row: 3, col: 2 }],
      ['ArrowLeft', false, { row: 2, col: 2 }, { row: 2, col: 1 }],
      ['ArrowRight', false, { row: 2, col: 2 }, { row: 2, col: 3 }],
      ['Home', false, { row: 2, col: 2 }, { row: 2, col: 1 }],
      ['End', false, { row: 2, col: 2 }, { row: 2, col: 3 }],
      ['Home', true, { row: 4, col: 2 }, { row: 1, col: 1 }],
      ['End', true, { row: 2, col: 2 }, { row: 5, col: 3 }],
    ])('maps %s (ctrl: %s)', (key, ctrlKey, from, expected) => {
      expect(getNextGridPosition(from, { key, ctrlKey }, bounds)).toEqual(expected);
    });

    it('moves by pages with PageUp and PageDown when a page size is set', () => {
      const withPages = { ...bounds, lastRow: 50, pageSize: 10 };
      expect(
        getNextGridPosition({ row: 5, col: 2 }, { key: 'PageDown', ctrlKey: false }, withPages)
      ).toEqual({ row: 15, col: 2 });
      expect(
        getNextGridPosition({ row: 5, col: 2 }, { key: 'PageUp', ctrlKey: false }, withPages)
      ).toEqual({ row: 1, col: 2 });
      expect(
        getNextGridPosition({ row: 45, col: 2 }, { key: 'PageDown', ctrlKey: false }, withPages)
      ).toEqual({ row: 50, col: 2 });
      expect(
        getNextGridPosition({ row: 5, col: 2 }, { key: 'PageDown', ctrlKey: false }, bounds)
      ).toBeUndefined();
    });

    it('leaves Alt combinations to the cells', () => {
      expect(
        getNextGridPosition(
          { row: 2, col: 2 },
          { key: 'ArrowRight', ctrlKey: false, altKey: true },
          bounds
        )
      ).toBeUndefined();
    });

    it('stays within the grid bounds', () => {
      expect(
        getNextGridPosition({ row: 1, col: 1 }, { key: 'ArrowUp', ctrlKey: false }, bounds)
      ).toEqual({ row: 1, col: 1 });
      expect(
        getNextGridPosition({ row: 5, col: 3 }, { key: 'ArrowRight', ctrlKey: false }, bounds)
      ).toEqual({ row: 5, col: 3 });
    });

    it('ignores other keys', () => {
      expect(
        getNextGridPosition({ row: 1, col: 1 }, { key: 'a', ctrlKey: false }, bounds)
      ).toBeUndefined();
    });
  });

  describe('getGridPosition', () => {
    it('reads the position from the closest cell and row', () => {
      document.body.innerHTML = `
        <div role="row" aria-rowindex="4">
          <div role="gridcell" aria-colindex="2"><button id="inner"></button></div>
        </div>`;
      expect(getGridPosition(document.getElementById('inner'))).toEqual({ row: 4, col: 2 });
    });

    it('returns undefined outside of a cell', () => {
      document.body.innerHTML = '<div id="outside"></div>';
      expect(getGridPosition(document.getElementById('outside'))).toBeUndefined();
      expect(getGridPosition(null)).toBeUndefined();
    });
  });
});
