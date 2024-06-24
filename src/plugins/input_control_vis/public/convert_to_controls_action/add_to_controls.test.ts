/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { Vis } from '@kbn/visualizations-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { CONTROL_TYPES } from '../editor_utils';
import { InputControlVisParams } from '../types';
import { addToControls } from './add_to_controls';

describe('addToControls', () => {
  const mockControlGroupApi = {
    addOptionsListControl: jest.fn(),
    addRangeSliderControl: jest.fn(),
  } as unknown as ControlGroupApi;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('option list', () => {
    const LEGACY_OPTION_LIST_CONTROL_ID = '1234';
    const vis = {
      params: {
        controls: [
          {
            id: LEGACY_OPTION_LIST_CONTROL_ID,
            fieldName: 'machine.os.keyword',
            indexPattern: '90943e30-9a47-11e8-b64d-95841ca0b247',
            label: 'Machine OS',
            options: {
              multiselect: false,
            },
            type: CONTROL_TYPES.LIST,
          },
        ],
      },
    } as unknown as Vis<InputControlVisParams>;

    test('should add option list control', () => {
      const mockDataService = dataPluginMock.createStartContract();
      mockDataService.query.filterManager.getFilters = () => [];
      addToControls(mockControlGroupApi, vis, mockDataService);
      expect(mockControlGroupApi.addOptionsListControl.mock.calls).toHaveLength(1);
      expect(mockControlGroupApi.addOptionsListControl.mock.calls[0][0]).toEqual({
        controlId: LEGACY_OPTION_LIST_CONTROL_ID,
        dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
        fieldName: 'machine.os.keyword',
        singleSelect: true,
        title: 'Machine OS',
      });
    });

    test('should remove legacy control filter and set selected options of option list control', () => {
      const mockDataService = dataPluginMock.createStartContract();
      mockDataService.query.filterManager.getFilters = () => [
        {
          meta: {
            controlledBy: LEGACY_OPTION_LIST_CONTROL_ID,
          },
          query: {
            match_phrase: {
              ['machine.os.keyword']: 'ios',
            },
          },
        },
      ];
      addToControls(mockControlGroupApi, vis, mockDataService);
      expect(mockControlGroupApi.addOptionsListControl.mock.calls).toHaveLength(1);
      expect(mockControlGroupApi.addOptionsListControl.mock.calls[0][0].selectedOptions).toEqual([
        'ios',
      ]);
      expect(mockDataService.query.filterManager.removeFilter.mock.calls).toHaveLength(1);
    });
  });

  describe('range slider', () => {
    const LEGACY_RANGE_CONTROL_ID = '1234';
    const vis = {
      params: {
        controls: [
          {
            id: LEGACY_RANGE_CONTROL_ID,
            fieldName: 'bytes',
            indexPattern: '90943e30-9a47-11e8-b64d-95841ca0b247',
            label: 'My bytes',
            options: {
              step: 1024,
            },
            type: CONTROL_TYPES.RANGE,
          },
        ],
      },
    } as unknown as Vis<InputControlVisParams>;

    test('should add range slider control', () => {
      const mockDataService = dataPluginMock.createStartContract();
      mockDataService.query.filterManager.getFilters = () => [];
      addToControls(mockControlGroupApi, vis, mockDataService);
      expect(mockControlGroupApi.addRangeSliderControl.mock.calls).toHaveLength(1);
      expect(mockControlGroupApi.addRangeSliderControl.mock.calls[0][0]).toEqual({
        controlId: LEGACY_RANGE_CONTROL_ID,
        dataViewId: '90943e30-9a47-11e8-b64d-95841ca0b247',
        fieldName: 'bytes',
        step: 1024,
        title: 'My bytes',
      });
    });

    test('should remove legacy control filter and set value of range slider control', () => {
      const mockDataService = dataPluginMock.createStartContract();
      mockDataService.query.filterManager.getFilters = () => [
        {
          meta: {
            controlledBy: LEGACY_RANGE_CONTROL_ID,
          },
          query: {
            range: {
              bytes: {
                gte: 7014,
                lte: 13103,
              },
            },
          },
        },
      ];
      addToControls(mockControlGroupApi, vis, mockDataService);
      expect(mockControlGroupApi.addRangeSliderControl.mock.calls).toHaveLength(1);
      expect(mockControlGroupApi.addRangeSliderControl.mock.calls[0][0].value).toEqual([
        '7014',
        '13103',
      ]);
      expect(mockDataService.query.filterManager.removeFilter.mock.calls).toHaveLength(1);
    });
  });
});
