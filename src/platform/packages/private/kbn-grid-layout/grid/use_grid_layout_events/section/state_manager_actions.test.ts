/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CollapsibleSection } from '../../grid_section';
import { getGridLayoutStateManagerMock } from '../../test_utils/mocks';
import { getSampleOrderedLayout } from '../../test_utils/sample_layout';
import { getSectionsInOrder } from '../../utils/resolve_grid_section';
import { moveAction } from './state_manager_actions';

describe('row state manager actions', () => {
  const gridLayoutStateManager = getGridLayoutStateManagerMock();

  describe('move action', () => {
    beforeAll(() => {
      gridLayoutStateManager.gridLayout$.next({
        ...gridLayoutStateManager.gridLayout$.getValue(),
        second: {
          ...gridLayoutStateManager.gridLayout$.getValue().second,
          isCollapsed: true,
        } as CollapsibleSection,
      });
      gridLayoutStateManager.activeSectionEvent$.next({
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
        targetSection: undefined,
      });
      gridLayoutStateManager.sectionRefs.current = {
        'main-0': {
          getBoundingClientRect: jest.fn().mockReturnValue({ top: 0, height: 100, bottom: 100 }),
        } as any as HTMLDivElement,
        third: {
          getBoundingClientRect: jest.fn().mockReturnValue({ top: 200, height: 100, bottom: 300 }),
        } as any as HTMLDivElement,
      };
      gridLayoutStateManager.headerRefs.current = {
        second: {
          getBoundingClientRect: jest.fn().mockReturnValue({ top: 100, height: 50, bottom: 150 }),
        } as any as HTMLDivElement,
        third: {
          getBoundingClientRect: jest.fn().mockReturnValue({ top: 150, height: 50, bottom: 200 }),
        } as any as HTMLDivElement,
      };
    });

    it('calculates translate based on old and new mouse position', () => {
      moveAction(
        gridLayoutStateManager,
        { clientX: 20, clientY: 150 },
        { clientX: 100, clientY: 10 }
      );
      expect(gridLayoutStateManager.activeSectionEvent$.getValue()).toEqual(
        expect.objectContaining({
          id: 'second',
          startingPosition: {
            top: 100,
            left: 100,
          },
          translate: {
            top: -140,
            left: 80,
          },
        })
      );
      gridLayoutStateManager.gridLayout$.next(getSampleOrderedLayout());
    });

    describe('re-ordering sections', () => {
      beforeAll(() => {
        const currentRowOrder = getSectionsInOrder(
          gridLayoutStateManager.gridLayout$.getValue()
        ).map(({ id }) => id);
        expect(currentRowOrder).toEqual(['main-0', 'second', 'third']);
      });

      it('no target section id', () => {
        // "move" the second section up so that it overlaps with nothing
        gridLayoutStateManager.headerRefs.current.second = {
          getBoundingClientRect: jest.fn().mockReturnValue({ top: -100, height: 50, bottom: -50 }),
        } as any as HTMLDivElement;
        moveAction(gridLayoutStateManager, { clientX: 0, clientY: 0 }, { clientX: 0, clientY: 0 });

        // second section gets dropped at the top
        const newRowOrder = getSectionsInOrder(gridLayoutStateManager.gridLayout$.getValue()).map(
          ({ id }) => id
        );
        expect(newRowOrder).toEqual(['second', 'main-0', 'third']);
      });

      it('targeting a non-main section', () => {
        // "move" the second section so that it overlaps the third section
        gridLayoutStateManager.headerRefs.current.second = {
          getBoundingClientRect: jest.fn().mockReturnValue({ top: 260, height: 50, bottom: 310 }),
        } as any as HTMLDivElement;
        moveAction(gridLayoutStateManager, { clientX: 0, clientY: 0 }, { clientX: 0, clientY: 0 });

        // second section gets dropped after the third section
        const newRowOrder = getSectionsInOrder(gridLayoutStateManager.gridLayout$.getValue()).map(
          ({ id }) => id
        );
        expect(newRowOrder).toEqual(['main-0', 'third', 'second']);
      });

      it('targeting a main section', () => {
        // "move" the second section so that it overlaps the first main section
        gridLayoutStateManager.headerRefs.current.second = {
          getBoundingClientRect: jest.fn().mockReturnValue({ top: 50, height: 50, bottom: 100 }),
        } as any as HTMLDivElement;
        moveAction(gridLayoutStateManager, { clientX: 0, clientY: 0 }, { clientX: 0, clientY: 0 });

        // second section gets dropped between panels and creates a new section
        const newRowOrder = getSectionsInOrder(gridLayoutStateManager.gridLayout$.getValue()).map(
          ({ id }) => id
        );
        expect(newRowOrder).toEqual(['main-0', 'second', 'main-2', 'third']);
        expect(gridLayoutStateManager.gridLayout$.getValue()).toEqual({
          'main-0': expect.objectContaining({
            order: 0,
            panels: {
              panel1: expect.objectContaining({
                row: 0,
              }),
              panel5: expect.objectContaining({
                row: 0,
              }),
            },
          }),
          second: expect.objectContaining({
            order: 1,
          }),
          'main-2': expect.objectContaining({
            order: 2,
            panels: {
              panel2: expect.objectContaining({
                row: 0,
              }),
              panel3: expect.objectContaining({
                row: 0,
              }),
              panel4: expect.objectContaining({
                row: 4,
              }),
              panel6: expect.objectContaining({
                row: 0,
              }),
              panel7: expect.objectContaining({
                row: 0,
              }),
              panel8: expect.objectContaining({
                row: 2,
              }),
            },
          }),
          third: expect.objectContaining({
            order: 3,
          }),
        });
      });
    });
  });
});
