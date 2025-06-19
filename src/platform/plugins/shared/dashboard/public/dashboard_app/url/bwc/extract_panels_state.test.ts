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
  describe('< 8.19 panels state', () => {
    test('should move id and title to panelConfig', () => {
      const dashboardState = extractPanelsState({
        panels: [
          {
            embeddableConfig: {
              timeRange: {
                from: 'now-7d/d',
                to: 'now',
              },
            },
            gridData: {},
            id: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
            panelIndex: 'c505cc42-fbde-451d-8720-302dc78d7e0d',
            title: 'Custom title',
            type: 'map',
          },
        ],
      });
      expect(dashboardState.panels).toEqual([
        {
          panelConfig: {
            savedObjectId: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
            timeRange: {
              from: 'now-7d/d',
              to: 'now',
            },
            title: 'Custom title',
          },
          panelIndex: 'c505cc42-fbde-451d-8720-302dc78d7e0d',
          gridData: {},
          type: 'map',
        },
      ]);
    });
  });

  describe('< 8.17 panels state', () => {
    test('should convert embeddableConfig to panelConfig', () => {
      const dashboardState = extractPanelsState({
        panels: [
          {
            embeddableConfig: {
              timeRange: {
                from: 'now-7d/d',
                to: 'now',
              },
            },
            gridData: {},
            panelIndex: 'c505cc42-fbde-451d-8720-302dc78d7e0d',
            type: 'map',
          },
        ],
      });
      expect(dashboardState.panels).toEqual([
        {
          panelConfig: {
            timeRange: {
              from: 'now-7d/d',
              to: 'now',
            },
          },
          panelIndex: 'c505cc42-fbde-451d-8720-302dc78d7e0d',
          gridData: {},
          type: 'map',
        },
      ]);
    });
  });

  describe('< 7.3 panels state', () => {
    test('should ignore state and notify user', () => {
      const dashboardState = extractPanelsState({
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
      expect(dashboardState).toEqual({});
      expect(coreServices.notifications.toasts.addWarning).toHaveBeenCalled();
    });
  });
});
