/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import type { ActivePanelEvent, GridPanelData } from '../../grid_panel';
import { getGridLayoutStateManagerMock } from '../../test_utils/mocks';
import { getSampleOrderedLayout } from '../../test_utils/sample_layout';
import { moveAction } from './state_manager_actions';

describe('panel state manager actions', () => {
  const gridLayoutStateManager = getGridLayoutStateManagerMock();
  const lastRequestedPanelPosition: MutableRefObject<GridPanelData | undefined> = {
    current: { id: 'panel1', height: 5, width: 5, column: 0, row: 0 },
  };

  beforeEach(() => {
    gridLayoutStateManager.panelRefs.current = {
      panel1: {
        getBoundingClientRect: jest
          .fn()
          .mockReturnValue({ top: 0, left: 0, right: 50, bottom: 50, height: 50, width: 50 }),
        scrollIntoView: jest.fn(),
      } as any as HTMLDivElement,
    };
    gridLayoutStateManager.sectionRefs.current = {
      'main-0': {
        getBoundingClientRect: jest.fn().mockReturnValue({ top: 0, height: 100, bottom: 100 }),
      } as any as HTMLDivElement,
    };
    gridLayoutStateManager.layoutRef.current = {
      getBoundingClientRect: jest
        .fn()
        .mockReturnValue({ top: 0, height: 100, bottom: 100, left: 0, width: 200, right: 200 }),
    } as any as HTMLDivElement;
  });

  describe('moveAction', () => {
    describe('resize', () => {
      beforeEach(() => {
        // prepare the active panel event
        gridLayoutStateManager.activePanelEvent$.next({
          id: 'panel1',
          type: 'resize',
          targetSection: 'main-0',
          panelDiv: gridLayoutStateManager.panelRefs.current.panel1!,
          sensorOffsets: {
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
          sensorType: 'mouse',
          position: {
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
        });
      });

      it('can resize panel', () => {
        // bring the mouse **way** to the top and to the left to try to make the panel as small as possible
        moveAction(
          new MouseEvent('pointerdown', { clientX: 0, clientY: 0 }),
          gridLayoutStateManager,
          {
            clientX: 0,
            clientY: 0,
          },
          lastRequestedPanelPosition
        );
        // the panel must take up at least 1 column and 1 row
        const panel = gridLayoutStateManager.gridLayout$.getValue()['main-0'].panels.panel1;
        expect(panel.height).toBe(1);
        expect(panel.width).toBe(1);
      });

      it('cannot make panel larger than maxWidth + maxHeight', () => {
        // set up the panel with a max width and height
        const sampleLayout = getSampleOrderedLayout();
        sampleLayout['main-0'].panels.panel1 = {
          ...sampleLayout['main-0'].panels.panel1,
          resizeOptions: {
            maxWidth: 10,
            maxHeight: 10,
          },
        };
        gridLayoutStateManager.gridLayout$.next(sampleLayout);

        // bring the mouse **way** down and to the right to try to make the panel as big as possible
        moveAction(
          new MouseEvent('pointerdown', { clientX: 0, clientY: 0 }),
          gridLayoutStateManager,
          {
            clientX: 5000,
            clientY: 5000,
          },
          lastRequestedPanelPosition
        );
        // the panel does not resize past the max width and height despite mouse position
        const panel = gridLayoutStateManager.gridLayout$.getValue()['main-0'].panels.panel1;
        expect(panel.height).toBe(10);
        expect(panel.width).toBe(10);
      });

      it('cannot make panel smaller than minWidth + minHeight', () => {
        // set up the panel with a min width and height
        const sampleLayout = getSampleOrderedLayout();
        sampleLayout['main-0'].panels.panel1 = {
          ...sampleLayout['main-0'].panels.panel1,
          resizeOptions: {
            minWidth: 2,
            minHeight: 2,
          },
        };
        gridLayoutStateManager.gridLayout$.next(sampleLayout);

        // bring the mouse **way** to the top and to the left to try to make the panel as small as possible
        moveAction(
          new MouseEvent('pointerdown', { clientX: 0, clientY: 0 }),
          gridLayoutStateManager,
          {
            clientX: 0,
            clientY: 0,
          },
          lastRequestedPanelPosition
        );
        // the panel does not resize past the min width and height despite mouse position
        const panel = gridLayoutStateManager.gridLayout$.getValue()['main-0'].panels.panel1;
        expect(panel.height).toBe(2);
        expect(panel.width).toBe(2);
      });

      it('can extend panel to the full width of the layout when it is offset', () => {
        gridLayoutStateManager.layoutRef.current = {
          getBoundingClientRect: jest.fn().mockReturnValue({
            top: 0,
            height: 100,
            bottom: 100,
            left: 100, // offset the layout by 100 pixels
            width: 200,
            right: 100 + 872, // 872 = the width of the layout when column pixel width is 10
          }),
        } as any as HTMLDivElement;
        gridLayoutStateManager.panelRefs.current.panel1 = {
          getBoundingClientRect: jest.fn().mockReturnValue({
            top: 0,
            left: 100, // offset the panel by 100 pixels to the left as well
            right: 150,
            bottom: 50,
            height: 50,
            width: 50,
          }),
          scrollIntoView: jest.fn(),
        } as any as HTMLDivElement;

        // update the active panel event
        gridLayoutStateManager.activePanelEvent$.next({
          ...(gridLayoutStateManager.activePanelEvent$.getValue() as ActivePanelEvent),
          panelDiv: gridLayoutStateManager.panelRefs.current.panel1!,
        });

        // bring the mouse **way** to the right to try to make the panel as big as possible
        moveAction(
          new MouseEvent('pointerdown', { clientX: 0, clientY: 0 }),
          gridLayoutStateManager,
          {
            clientX: 10000,
            clientY: 0,
          },
          lastRequestedPanelPosition
        );

        // the panel reaches the end of the layout
        const panel = gridLayoutStateManager.gridLayout$.getValue()['main-0'].panels.panel1;
        expect(panel.width).toBe(48);
      });
    });
  });
});
