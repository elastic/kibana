/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from '../../../services/kibana_services';
import { extractPanelsState } from './extract_panels_state';

describe('extractPanelsState', () => {
  describe('< 9.3 panels state', () => {
    test('should move gridData to grid', () => {
      const { panels } = extractPanelsState({
        panels: [
          {
            gridData: { x: 0, y: 0, w: 24, h: 15 },
            type: 'lens',
            config: {},
          },
        ],
      });
      expect(panels).toEqual([
        {
          config: {},
          grid: { x: 0, y: 0, w: 24, h: 15 },
          type: 'lens',
        },
      ]);
    });
    test('should move panelIndex to uid', () => {
      const { panels } = extractPanelsState({
        panels: [
          {
            grid: { x: 0, y: 0, w: 24, h: 15 },
            type: 'lens',
            panelIndex: 'fizz',
            config: {},
          },
        ],
      });
      expect(panels).toEqual([
        {
          config: {},
          grid: { x: 0, y: 0, w: 24, h: 15 },
          type: 'lens',
          uid: 'fizz',
        },
      ]);
    });
    test('should move panelConfig to config', () => {
      const { panels } = extractPanelsState({
        panels: [
          {
            panelConfig: {
              timeRange: {
                from: 'now-7d/d',
                to: 'now',
              },
            },
            grid: {},
            type: 'map',
          },
        ],
      });
      expect(panels).toEqual([
        {
          config: {
            timeRange: {
              from: 'now-7d/d',
              to: 'now',
            },
          },
          grid: {},
          type: 'map',
        },
      ]);
    });
  });
  describe('< 9.2 panels state', () => {
    test('should create saved object reference', () => {
      const { savedObjectReferences } = extractPanelsState({
        panels: [
          {
            embeddableConfig: {
              savedObjectId: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
            },
            grid: {},
            panelIndex: 'c505cc42-fbde-451d-8720-302dc78d7e0d',
            type: 'links',
          },
        ],
      });
      expect(savedObjectReferences).toEqual([
        {
          id: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
          name: 'c505cc42-fbde-451d-8720-302dc78d7e0d:savedObjectRef',
          type: 'links',
        },
      ]);
    });
  });

  describe('< 8.19 panels state', () => {
    test('should move id and title to config', () => {
      const { panels } = extractPanelsState({
        panels: [
          {
            embeddableConfig: {
              timeRange: {
                from: 'now-7d/d',
                to: 'now',
              },
            },
            grid: {},
            id: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
            panelIndex: 'c505cc42-fbde-451d-8720-302dc78d7e0d',
            title: 'Custom title',
            type: 'map',
          },
        ],
      });
      expect(panels).toEqual([
        {
          config: {
            savedObjectId: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
            timeRange: {
              from: 'now-7d/d',
              to: 'now',
            },
            title: 'Custom title',
          },
          grid: {},
          type: 'map',
          uid: 'c505cc42-fbde-451d-8720-302dc78d7e0d',
        },
      ]);
    });
  });

  describe('< 8.17 panels state', () => {
    test('should convert embeddableConfig to config', () => {
      const { panels } = extractPanelsState({
        panels: [
          {
            embeddableConfig: {
              timeRange: {
                from: 'now-7d/d',
                to: 'now',
              },
            },
            grid: {},
            panelIndex: 'c505cc42-fbde-451d-8720-302dc78d7e0d',
            type: 'map',
          },
        ],
      });
      expect(panels).toEqual([
        {
          config: {
            timeRange: {
              from: 'now-7d/d',
              to: 'now',
            },
          },
          grid: {},
          type: 'map',
          uid: 'c505cc42-fbde-451d-8720-302dc78d7e0d',
        },
      ]);
    });
  });

  describe('< 7.3 panels state', () => {
    test('should ignore state and notify user', () => {
      const { panels } = extractPanelsState({
        panels: [
          {
            col: 1,
            id: 'Visualization-MetricChart',
            panelIndex: 1,
            row: 1,
            size_x: 6,
            size_y: 3,
            type: 'visualization',
          },
          {
            col: 7,
            id: 'Visualization-PieChart',
            panelIndex: 2,
            row: 1,
            size_x: 6,
            size_y: 3,
            type: 'visualization',
          },
        ],
      });
      expect(panels).toBeUndefined();
      expect(coreServices.notifications.toasts.addWarning).toHaveBeenCalled();
    });
  });
});
