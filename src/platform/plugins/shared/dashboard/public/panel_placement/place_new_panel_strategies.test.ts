/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMockLayout, getMockLayoutWithSections } from '../mocks';
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
      const panels = getMockLayout().panels;
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
          const originalGridData = panels[panelId].grid;
          return {
            ...prev,
            [panelId]: {
              ...panels[panelId],
              grid: {
                ...originalGridData,
                y: originalGridData.y + 6, // panel was pushed down by height of new panel
              },
            },
          };
        }, {})
      );
    });

    it('ignores panels in other sections', () => {
      const panels = getMockLayoutWithSections().panels;
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
          const originalGridData = panels[panelId].grid;
          return {
            ...prev,
            [panelId]: {
              ...panels[panelId],
              grid: {
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
      const panels = {
        ...getMockLayout().panels,
        '1': {
          grid: { x: 6, y: 0, w: 6, h: 6, i: '1' },
          type: 'lens',
        },
      };

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
      const panels = {
        ...getMockLayoutWithSections().panels,
        '5': {
          grid: { x: 6, y: 0, w: 42, h: 6, i: '5' },
          type: 'lens',
        },
      };
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
      const panels = {
        ...getMockLayoutWithSections().panels,
        '1': {
          grid: { x: 0, y: 0, w: 6, h: 100, i: '1' },
          type: 'lens',
        },
        '2': {
          grid: { x: 6, y: 6, w: 42, h: 100, i: '2' },
          type: 'lens',
        },
        '6': {
          grid: { x: 0, y: 6, w: 6, h: 6, i: '6', sectionId: 'section1' },
          type: 'lens',
        },
        '7': {
          grid: { x: 6, y: 0, w: 42, h: 12, i: '7', sectionId: 'section1' },
          type: 'lens',
        },
      };
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
