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
  describe('>= 8.19 state', () => {
    test('should extract labelPosition', () => {
      const dashboardState = extractDashboardState({
        controlGroupInput: {
          labelPosition: 'twoLine',
        },
      });
      expect(dashboardState.controlGroupInput?.labelPosition).toBe('twoLine');
    });

    test('should extract autoApplySelections', () => {
      const dashboardState = extractDashboardState({
        controlGroupInput: {
          autoApplySelections: false,
        },
      });
      expect(dashboardState.controlGroupInput?.autoApplySelections).toBe(false);
    });

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
              order: 0,
              type: 'optionsListControl',
              width: 'small',
            },
          ],
        },
      });
      expect(dashboardState.controlGroupInput?.controls).toEqual([
        {
          controlConfig: {
            dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            fieldName: 'machine.os.keyword',
            selectedOptions: ['win 7'],
          },
          grow: true,
          order: 0,
          type: 'optionsListControl',
          width: 'small',
        },
      ]);
    });
  });

  describe('>= 8.16 to < 8.19 state', () => {
    test('should convert controlGroupState to controlGroupInput', () => {
      const dashboardState = extractDashboardState({
        controlGroupState: {
          autoApplySelections: false,
          initialChildControlState: {
            ['6c4f5ff4-92ff-4b40-bcc7-9aea6b06d693']: {
              dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
              fieldName: 'machine.os.keyword',
              grow: false,
              selectedOptions: ['win 7'],
            },
          },
          labelPosition: 'twoLine',
        },
      });
      expect(dashboardState.controlGroupInput?.autoApplySelections).toBe(false);
      expect(dashboardState.controlGroupInput?.labelPosition).toBe('twoLine');
      expect(dashboardState.controlGroupInput?.controls).toEqual([
        {
          controlConfig: {
            dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            fieldName: 'machine.os.keyword',
            selectedOptions: ['win 7'],
          },
          grow: false,
          id: '6c4f5ff4-92ff-4b40-bcc7-9aea6b06d693',
        },
      ]);
    });
  });

  describe('< 8.16 state', () => {
    test('should convert controlStyle to labelPosition', () => {
      const dashboardState = extractDashboardState({
        controlGroupInput: {
          controlStyle: 'twoLine',
        },
      });
      expect(dashboardState.controlGroupInput?.labelPosition).toBe('twoLine');
    });

    test('should convert showApplySelections to autoApplySelections', () => {
      const dashboardState = extractDashboardState({
        controlGroupInput: {
          showApplySelections: true,
        },
      });
      expect(dashboardState.controlGroupInput?.autoApplySelections).toBe(false);
    });

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
              order: 0,
              type: 'optionsListControl',
              width: 'small',
            },
          },
        },
      });
      expect(dashboardState.controlGroupInput?.controls).toEqual([
        {
          controlConfig: {
            dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            fieldName: 'machine.os.keyword',
            selectedOptions: ['win 7'],
          },
          grow: true,
          order: 0,
          type: 'optionsListControl',
          width: 'small',
        },
      ]);
    });
  });
});
