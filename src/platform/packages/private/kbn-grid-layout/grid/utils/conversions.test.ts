/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSampleLayout, getSampleOrderedLayout } from '../test_utils/sample_layout';
import { GridLayoutData, OrderedLayout } from '../types';
import { getGridLayout, getOrderedLayout } from './conversions';

describe('conversions', () => {
  describe('getGridLayout', () => {
    it('should convert an ordered layout to a grid layout', () => {
      const orderedLayout = getSampleOrderedLayout();
      const result = getGridLayout(orderedLayout);
      expect(result).toEqual(getSampleLayout());
    });

    it('should handle empty ordered layout', () => {
      const orderedLayout: OrderedLayout = {};
      const result = getGridLayout(orderedLayout);
      expect(result).toEqual({});
    });

    it('should handle a single panel in getGridLayout', () => {
      const orderedLayout: OrderedLayout = {
        'main-0': {
          id: 'main-0',
          panels: {
            panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3 },
          },
          order: 0,
          isMainSection: true,
        },
      };
      const expectedGridLayout: GridLayoutData = {
        panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3, type: 'panel' },
      };
      const result = getGridLayout(orderedLayout);
      expect(result).toEqual(expectedGridLayout);
    });

    it('should handle ordered layout with overlapping panels', () => {
      const orderedLayout: OrderedLayout = {
        'main-0': {
          id: 'main-0',
          panels: {
            panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3 },
            panel2: { id: 'panel2', row: 1, column: 0, height: 2, width: 3 }, // 0verlaps with panel1
          },
          order: 0,
          isMainSection: true,
        },
      };
      const result = getGridLayout(orderedLayout);
      expect(result).toEqual({
        panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3, type: 'panel' },
        panel2: { id: 'panel2', row: 2, column: 0, height: 2, width: 3, type: 'panel' }, // pushed down
      });
    });

    it('should handle ordered layout with invalid orders', () => {
      const orderedLayout: OrderedLayout = {
        'main-0': {
          id: 'main-0',
          panels: {
            panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3 },
          },
          order: 0,
          isMainSection: true,
        },
        section2: {
          id: 'section2',
          order: 1,
          isMainSection: false,
          isCollapsed: false,
          title: 'Some section',
          panels: {},
        },
        section1: {
          id: 'section1',
          order: 100,
          isMainSection: false,
          isCollapsed: true,
          title: 'Some floating section',
          panels: {},
        },
      };
      const result = getGridLayout(orderedLayout);
      expect(result).toEqual({
        panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3, type: 'panel' },
        section2: {
          id: 'section2',
          row: 2,
          isCollapsed: false,
          title: 'Some section',
          panels: {},
          type: 'section',
        },
        section1: {
          id: 'section1',
          row: 3,
          isCollapsed: true,
          title: 'Some floating section',
          panels: {},
          type: 'section',
        },
      });
    });

    it('should handle ordered layout with multiple main sections', () => {
      const orderedLayout: OrderedLayout = {
        'main-0': {
          id: 'main-0',
          panels: {
            panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3 },
          },
          order: 0,
          isMainSection: true,
        },
        section1: {
          id: 'section1',
          order: 1,
          isMainSection: false,
          isCollapsed: false,
          title: 'Some section',
          panels: {},
        },
        'main-2': {
          id: 'main-2',
          panels: {
            panel2: { id: 'panel2', row: 0, column: 0, height: 2, width: 3 },
          },
          order: 2,
          isMainSection: true,
        },
        section2: {
          id: 'section2',
          order: 3,
          isMainSection: false,
          isCollapsed: true,
          title: 'Some other section',
          panels: {
            panel2a: { id: 'panel2a', row: 0, column: 0, height: 2, width: 3 },
          },
        },
        'main-4': {
          id: 'main-4',
          panels: {
            panel3: { id: 'panel3', row: 0, column: 0, height: 2, width: 3 },
          },
          order: 4,
          isMainSection: true,
        },
      };
      const result = getGridLayout(orderedLayout);
      expect(result).toEqual({
        panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3, type: 'panel' },
        section1: {
          id: 'section1',
          row: 2,
          isCollapsed: false,
          title: 'Some section',
          panels: {},
          type: 'section',
        },
        panel2: { id: 'panel2', row: 3, column: 0, height: 2, width: 3, type: 'panel' },
        section2: {
          id: 'section2',
          row: 5,
          isCollapsed: true,
          title: 'Some other section',
          panels: { panel2a: { id: 'panel2a', row: 0, column: 0, height: 2, width: 3 } },
          type: 'section',
        },
        panel3: { id: 'panel3', row: 6, column: 0, height: 2, width: 3, type: 'panel' },
      });
    });
  });

  describe('getOrderedLayout', () => {
    it('should convert a grid layout to an ordered layout', () => {
      const gridLayout = getSampleLayout();
      const result = getOrderedLayout(gridLayout);
      expect(result).toEqual(getSampleOrderedLayout());
    });

    it('should handle empty grid layout', () => {
      const gridLayout: GridLayoutData = {};
      const result = getOrderedLayout(gridLayout);
      expect(result).toEqual({});
    });

    it('should handle a single panel in getOrderedLayout', () => {
      const gridLayout: GridLayoutData = {
        panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3, type: 'panel' },
      };
      const expectedOrderedLayout: OrderedLayout = {
        'main-0': {
          id: 'main-0',
          panels: {
            panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3 },
          },
          order: 0,
          isMainSection: true,
        },
      };
      const result = getOrderedLayout(gridLayout);
      expect(result).toEqual(expectedOrderedLayout);
    });

    it('should handle grid layout with overlapping sections and panels', () => {
      const gridLayout: GridLayoutData = {
        panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3, type: 'panel' },
        panel2: { id: 'panel2', row: 1, column: 0, height: 2, width: 3, type: 'panel' }, // overlaps with panel1
      };
      const result = getOrderedLayout(gridLayout);
      expect(result).toEqual({
        'main-0': {
          id: 'main-0',
          panels: {
            panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3 },
            panel2: { id: 'panel2', row: 2, column: 0, height: 2, width: 3 }, // pushed down
          },
          order: 0,
          isMainSection: true,
        },
      });
    });

    it('should handle grid layout with floating sections', () => {
      const gridLayout: GridLayoutData = {
        panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3, type: 'panel' },
        section1: {
          id: 'section1',
          row: 100,
          isCollapsed: true,
          title: 'Some floating section',
          panels: {},
          type: 'section',
        },
        section2: {
          id: 'section2',
          row: 2,
          isCollapsed: false,
          title: 'Some section',
          panels: {},
          type: 'section',
        },
      };
      const result = getOrderedLayout(gridLayout);
      expect(result).toEqual({
        'main-0': {
          id: 'main-0',
          panels: {
            panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3 },
          },
          order: 0,
          isMainSection: true,
        },
        section2: {
          id: 'section2',
          order: 1,
          isMainSection: false,
          isCollapsed: false,
          title: 'Some section',
          panels: {},
        },
        section1: {
          id: 'section1',
          order: 2,
          isMainSection: false,
          isCollapsed: true,
          title: 'Some floating section',
          panels: {},
        },
      });
    });

    it('should handle grid layout with sections mixed between sections', () => {
      const gridLayout: GridLayoutData = {
        panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3, type: 'panel' },
        section1: {
          id: 'section1',
          row: 2,
          isCollapsed: false,
          title: 'Some section',
          panels: {},
          type: 'section',
        },
        panel2: { id: 'panel2', row: 3, column: 0, height: 2, width: 3, type: 'panel' },
        section2: {
          id: 'section2',
          row: 5,
          isCollapsed: true,
          title: 'Some other section',
          panels: { panel2a: { id: 'panel2a', row: 0, column: 0, height: 2, width: 3 } },
          type: 'section',
        },
        panel3: { id: 'panel3', row: 6, column: 0, height: 2, width: 3, type: 'panel' },
      };
      const result = getOrderedLayout(gridLayout);
      expect(result).toEqual({
        'main-0': {
          id: 'main-0',
          panels: {
            panel1: { id: 'panel1', row: 0, column: 0, height: 2, width: 3 },
          },
          order: 0,
          isMainSection: true,
        },
        section1: {
          id: 'section1',
          order: 1,
          isMainSection: false,
          isCollapsed: false,
          title: 'Some section',
          panels: {},
        },
        'main-2': {
          id: 'main-2',
          panels: {
            panel2: { id: 'panel2', row: 0, column: 0, height: 2, width: 3 },
          },
          order: 2,
          isMainSection: true,
        },
        section2: {
          id: 'section2',
          order: 3,
          isMainSection: false,
          isCollapsed: true,
          title: 'Some other section',
          panels: {
            panel2a: { id: 'panel2a', row: 0, column: 0, height: 2, width: 3 },
          },
        },
        'main-4': {
          id: 'main-4',
          panels: {
            panel3: { id: 'panel3', row: 0, column: 0, height: 2, width: 3 },
          },
          order: 4,
          isMainSection: true,
        },
      });
    });
  });
});
