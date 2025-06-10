/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { embeddableService } from '../../../services/kibana_services';
import { extractDashboardState } from './extract_dashboard_state';

describe('extractDashboardState', () => {
  describe('>= 8.19 state', () => {
    test('should extract labelPosition', async () => {
      const dashboardState = await extractDashboardState({
        state: {
          controlGroupInput: {
            labelPosition: 'twoLine',
          },
        },
        embeddableService,
      });
      expect(dashboardState.controlGroupInput?.labelPosition).toBe('twoLine');
    });

    test('should extract autoApplySelections', async () => {
      const dashboardState = await extractDashboardState({
        state: {
          controlGroupInput: {
            autoApplySelections: false,
          },
        },
        embeddableService,
      });
      expect(dashboardState.controlGroupInput?.autoApplySelections).toBe(false);
    });

    test('should extract controls', async () => {
      const dashboardState = await extractDashboardState({
        state: {
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
        },
        embeddableService,
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
    test('should convert controlGroupState to controlGroupInput', async () => {
      const dashboardState = await extractDashboardState({
        state: {
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
        },
        embeddableService,
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
    test('should convert controlStyle to labelPosition', async () => {
      const dashboardState = await extractDashboardState({
        state: {
          controlGroupInput: {
            controlStyle: 'twoLine',
          },
        },
        embeddableService,
      });
      expect(dashboardState.controlGroupInput?.labelPosition).toBe('twoLine');
    });

    test('should convert showApplySelections to autoApplySelections', async () => {
      const dashboardState = await extractDashboardState({
        state: {
          controlGroupInput: {
            showApplySelections: true,
          },
        },
        embeddableService,
      });
      expect(dashboardState.controlGroupInput?.autoApplySelections).toBe(false);
    });

    test('should convert panels to controls', async () => {
      const dashboardState = await extractDashboardState({
        state: {
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
        },
        embeddableService,
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
