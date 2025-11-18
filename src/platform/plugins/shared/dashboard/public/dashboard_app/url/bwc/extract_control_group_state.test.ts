/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractDashboardState } from './extract_dashboard_state';

describe('extractDashboardState', () => {
  describe('>=9.3 state', () => {
    test('should extract controls', () => {
      const controlGroupInput93 = {
        controls: [
          {
            config: {
              dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
              fieldName: 'machine.os.keyword',
              selectedOptions: ['win 7'],
            },
            grow: true,
            type: 'optionsListControl',
            width: 'small',
          },
          {
            config: {
              dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
              fieldName: 'name.keyword',
              selectedOptions: ['US'],
            },
            grow: false,
            type: 'optionsListControl',
            width: 'medium',
          },
        ],
      };
      const dashboardState = extractDashboardState({
        controlGroupInput: controlGroupInput93,
      });
      expect(dashboardState.controlGroupInput?.controls).toEqual(controlGroupInput93.controls);
    });
  });

  describe('>= 8.19 to <9.3 state', () => {
    test('should extract controls', () => {
      const dashboardState = extractDashboardState({
        controlGroupInput: {
          controls: [
            {
              controlConfig: {
                dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
                fieldName: 'machine.os.keyword',
                selectedOptions: ['win 7'],
              },
              grow: true,
              type: 'optionsListControl',
              width: 'small',
            },
          ],
        },
      });
      expect(dashboardState.controlGroupInput?.controls).toEqual([
        {
          config: {
            dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            fieldName: 'machine.os.keyword',
            selectedOptions: ['win 7'],
          },
          grow: true,
          type: 'optionsListControl',
          width: 'small',
        },
      ]);
    });
  });

  describe('>= 8.16 to < 8.19 state', () => {
    test('should convert controlGroupState to controlGroupInput and preserve order', () => {
      const dashboardState = extractDashboardState({
        controlGroupState: {
          autoApplySelections: false,
          initialChildControlState: {
            ['6c4f5ff4-92ff-4b40-bcc7-9aea6b06d693']: {
              dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
              fieldName: 'machine.os.keyword',
              grow: false,
              selectedOptions: ['win 7'],
              type: 'optionsListControl',
              order: 2,
            },
            ['d3d7af60-4c81-11e8-b3d7-01146121b73d']: {
              dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
              fieldName: 'name.keyword',
              grow: true,
              width: 'small',
              selectedOptions: ['US', 'Canada'],
              type: 'optionsListControl',
              order: 1,
            },
          },
          labelPosition: 'twoLine',
        },
      });

      expect(dashboardState.controlGroupInput?.controls).toEqual([
        {
          config: {
            dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            fieldName: 'name.keyword',
            selectedOptions: ['US', 'Canada'],
          },
          type: 'optionsListControl',
          grow: true,
          width: 'small',
          uid: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        },
        {
          config: {
            dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            fieldName: 'machine.os.keyword',
            selectedOptions: ['win 7'],
          },
          type: 'optionsListControl',
          grow: false,
          uid: '6c4f5ff4-92ff-4b40-bcc7-9aea6b06d693',
        },
      ]);
    });
  });

  describe('< 8.16 state', () => {
    test('should convert panels to controls', () => {
      const dashboardState = extractDashboardState({
        controlGroupInput: {
          panels: {
            ['8311639d-92e5-4aa5-99a4-9502b10eead5']: {
              explicitInput: {
                dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
                fieldName: 'machine.os.keyword',
                selectedOptions: ['win 7'],
              },
              grow: true,
              type: 'optionsListControl',
              width: 'small',
            },
          },
        },
      });
      expect(dashboardState.controlGroupInput?.controls).toEqual([
        {
          config: {
            dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            fieldName: 'machine.os.keyword',
            selectedOptions: ['win 7'],
          },
          grow: true,
          type: 'optionsListControl',
          width: 'small',
        },
      ]);
    });
  });
});
