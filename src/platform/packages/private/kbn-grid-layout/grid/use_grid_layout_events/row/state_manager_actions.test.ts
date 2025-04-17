/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGridLayoutStateManagerMock } from '../../test_utils/mocks';
import { getRowKeysInOrder } from '../../utils/resolve_grid_row';
import { moveAction } from './state_manager_actions';

describe('row state manager actions', () => {
  const gridLayoutStateManager = getGridLayoutStateManagerMock();

  describe('move action', () => {
    beforeAll(() => {
      gridLayoutStateManager.activeRowEvent$.next({
        id: 'second',
        startingPosition: {
          top: 100,
          left: 100,
        },
        translate: {
          top: 0,
          left: 0,
        },
        sensorType: 'mouse',
      });
      gridLayoutStateManager.rowRefs.current = {
        first: {} as any as HTMLDivElement,
        second: {} as any as HTMLDivElement,
        third: {} as any as HTMLDivElement,
      };
      gridLayoutStateManager.headerRefs.current = {
        second: {} as any as HTMLDivElement,
        third: {} as any as HTMLDivElement,
      };
    });

    it('adjusts row order based on positioning of row refs', () => {
      const currentRowOrder = getRowKeysInOrder(gridLayoutStateManager.gridLayout$.getValue());
      expect(currentRowOrder).toEqual(['first', 'second', 'third']);

      gridLayoutStateManager.rowRefs.current = {
        second: {
          getBoundingClientRect: jest.fn().mockReturnValue({ top: 100, height: 100 }),
        } as any as HTMLDivElement,
        third: {
          getBoundingClientRect: jest.fn().mockReturnValue({ top: 25, height: 100 }),
        } as any as HTMLDivElement,
      };
      moveAction(gridLayoutStateManager, { clientX: 0, clientY: 0 }, { clientX: 0, clientY: 0 });

      const newRowOrder = getRowKeysInOrder(gridLayoutStateManager.proposedGridLayout$.getValue()!);
      expect(newRowOrder).toEqual(['first', 'third', 'second']);
    });

    it('calculates translate based on old and new mouse position', () => {
      moveAction(
        gridLayoutStateManager,
        { clientX: 20, clientY: 150 },
        { clientX: 100, clientY: 10 }
      );
      expect(gridLayoutStateManager.activeRowEvent$.getValue()).toEqual({
        id: 'second',
        startingPosition: {
          top: 100,
          left: 100,
        },
        translate: {
          top: -140,
          left: 80,
        },
        sensorType: 'mouse',
      });
    });
  });
});
