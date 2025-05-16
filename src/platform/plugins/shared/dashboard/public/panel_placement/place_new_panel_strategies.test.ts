/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMockDashboardPanels } from '../mocks';
import { PanelPlacementStrategy } from '../plugin_constants';
import { runPanelPlacementStrategy } from './place_new_panel_strategies';

describe('new panel placement strategies', () => {
  describe('place at top', () => {
    it('no other panels', () => {
      const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
        PanelPlacementStrategy.placeAtTop,
        { width: 6, height: 6, currentPanels: {} }
      );
      expect(newPanelPlacement).toEqual({
        x: 0,
        y: 0,
        w: 6,
        h: 6,
      });
      expect(otherPanels).toEqual({});
    });

    it('push other panels down', () => {
      const { panels } = getMockDashboardPanels();
      const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
        PanelPlacementStrategy.placeAtTop,
        { width: 6, height: 6, currentPanels: panels }
      );
      expect(newPanelPlacement).toEqual({
        x: 0,
        y: 0,
        w: 6,
        h: 6,
      });
      expect(otherPanels).toEqual(
        Object.keys(panels).reduce((prev, panelId) => {
          const originalGridData = panels[panelId].gridData;
          return {
            ...prev,
            [panelId]: {
              ...panels[panelId],
              gridData: {
                ...originalGridData,
                y: originalGridData.y + 6, // panel was pushed down by height of new panel
              },
            },
          };
        }, {})
      );
    });

    it('ignores panels in other sections', () => {
      const { panels } = getMockDashboardPanels(true);
      const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
        PanelPlacementStrategy.placeAtTop,
        { width: 6, height: 6, currentPanels: panels, sectionId: 'section1' }
      );
      expect(newPanelPlacement).toEqual({
        x: 0,
        y: 0,
        w: 6,
        h: 6,
      });
      expect(otherPanels).toEqual(
        Object.keys(panels).reduce((prev, panelId) => {
          const originalGridData = panels[panelId].gridData;
          return {
            ...prev,
            [panelId]: {
              ...panels[panelId],
              gridData: {
                ...originalGridData,
                // only panels in the targetted section should get pushed down
                ...(originalGridData.sectionId === 'section1' && {
                  y: originalGridData.y + 6,
                }),
              },
            },
          };
        }, {})
      );
    });
  });

  describe('Find top left most open space', () => {
    it('no other panels', () => {
      const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
        PanelPlacementStrategy.findTopLeftMostOpenSpace,
        { width: 6, height: 6, currentPanels: {} }
      );
      expect(newPanelPlacement).toEqual({
        x: 0,
        y: 0,
        w: 6,
        h: 6,
      });
      expect(otherPanels).toEqual({});
    });

    it('top left most space is available', () => {
      const { panels } = getMockDashboardPanels(false, {
        panels: {
          '1': {
            gridData: { x: 6, y: 0, w: 6, h: 6, i: '1' },
            type: 'lens',
            explicitInput: { id: '1' },
          },
        },
      });

      const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
        PanelPlacementStrategy.findTopLeftMostOpenSpace,
        { width: 6, height: 6, currentPanels: panels }
      );
      expect(newPanelPlacement).toEqual({
        x: 0, // placed in the first available spot
        y: 0,
        w: 6,
        h: 6,
      });
      expect(otherPanels).toEqual(panels); // other panels don't move with this strategy
    });

    it('panel must be pushed down', () => {
      const { panels } = getMockDashboardPanels(true, {
        panels: {
          '5': {
            gridData: { x: 6, y: 0, w: 42, h: 6, i: '5' },
            type: 'lens',
            explicitInput: { id: '1' },
          },
        },
      });
      const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
        PanelPlacementStrategy.findTopLeftMostOpenSpace,
        { width: 6, height: 6, currentPanels: panels }
      );
      expect(newPanelPlacement).toEqual({
        x: 0,
        y: 6,
        w: 6,
        h: 6,
      });
      expect(otherPanels).toEqual(panels); // other panels don't move with this strategy
    });

    it('ignores panels in other sections', () => {
      const { panels } = getMockDashboardPanels(true, {
        panels: {
          '1': {
            gridData: { x: 0, y: 0, w: 6, h: 100, i: '1' },
            type: 'lens',
            explicitInput: { id: '1' },
          },
          '2': {
            gridData: { x: 6, y: 6, w: 42, h: 100, i: '2' },
            type: 'lens',
            explicitInput: { id: '2' },
          },
          '6': {
            gridData: { x: 0, y: 6, w: 6, h: 6, i: '6', sectionId: 'section1' },
            type: 'lens',
            explicitInput: { id: '1' },
          },
          '7': {
            gridData: { x: 6, y: 0, w: 42, h: 12, i: '7', sectionId: 'section1' },
            type: 'lens',
            explicitInput: { id: '1' },
          },
        },
      });
      const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(
        PanelPlacementStrategy.findTopLeftMostOpenSpace,
        { width: 6, height: 6, currentPanels: panels, sectionId: 'section1' }
      );
      expect(newPanelPlacement).toEqual({
        x: 0,
        y: 12, // maxY is 12 for section1; maxY of 100 in section 0 is ignored
        w: 6,
        h: 6,
      });
      expect(otherPanels).toEqual(panels); // other panels don't move with this strategy
    });
  });
});
