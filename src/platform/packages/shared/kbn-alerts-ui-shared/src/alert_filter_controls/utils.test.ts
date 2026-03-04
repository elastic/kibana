/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getFilterItemObjListFromControlState,
  mergeControls,
  reorderControlsWithDefaultControls,
  getFilterControlsComparator,
} from './utils';
import { initialInputData } from './mocks/data';
import type { FilterControlConfig } from './types';
import { isEqualWith } from 'lodash';

const defaultControls: FilterControlConfig[] = [
  {
    field_name: 'first',
    display_settings: { hide_action_bar: true },
    selected_options: ['val1', 'val2'],
  },

  {
    field_name: 'second',
    display_settings: { hide_action_bar: true },
    selected_options: ['val1', 'val2'],
    persist: true,
  },
];

const firstControlsSet: FilterControlConfig[] = [
  {
    field_name: 'first',
    selected_options: ['firstVal'],
  },
];

const secondControlsSet: FilterControlConfig[] = [
  {
    field_name: 'first',
    selected_options: ['secondVal1', 'secondVal2'],
    exists_selected: true,
  },
  {
    field_name: 'second',
    display_settings: { hide_action_bar: false },
    exclude: true,
  },
];

const thirdControlsSet: FilterControlConfig[] = [
  {
    field_name: 'new',
    selected_options: [],
  },
];

const emptyControlSet: FilterControlConfig[] = [];

const defaultControlsObj = defaultControls.reduce((prev, current) => {
  prev[current.field_name] = current;
  return prev;
}, {} as Record<string, FilterControlConfig>);
describe('utils', () => {
  describe('getFilterItemObjListFromControlOutput', () => {
    it('should return ordered filterItem where passed in order', () => {
      const filterItemObjList = getFilterItemObjListFromControlState(initialInputData);

      filterItemObjList.forEach((item, idx) => {
        const panelObj = initialInputData.initialChildControlState[
          String(idx) as keyof typeof initialInputData.initialChildControlState
        ] as FilterControlConfig;
        expect(item).toMatchObject({
          field_name: panelObj.field_name,
          selected_options: panelObj.selected_options,
          title: panelObj.title,
          exists_selected: panelObj.exists_selected,
          exclude: panelObj.exclude,
        });
      });
    });

    it('should return ordered filterItem where NOT passed in order', () => {
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          '0': initialInputData.initialChildControlState['3'],
          '1': initialInputData.initialChildControlState['0'],
        },
      };
      const filterItemObjList = getFilterItemObjListFromControlState(newInputData);

      let panelObj = newInputData.initialChildControlState['1'] as FilterControlConfig;
      expect(filterItemObjList[0]).toMatchObject({
        field_name: panelObj.field_name,
        selected_options: panelObj.selected_options,
        title: panelObj.title,
        exists_selected: panelObj.exists_selected,
        exclude: panelObj.exclude,
      });

      panelObj = newInputData.initialChildControlState['0'] as FilterControlConfig;
      expect(filterItemObjList[1]).toMatchObject({
        field_name: panelObj.field_name,
        selected_options: panelObj.selected_options,
        title: panelObj.title,
        exists_selected: panelObj.exists_selected,
        exclude: panelObj.exclude,
      });
    });
  });

  describe('mergeControls', () => {
    it('should return first controls set when it is not empty', () => {
      const result = mergeControls({
        controlsWithPriority: [firstControlsSet, secondControlsSet],
        defaultControlsObj,
      });

      const expectedResult = [
        {
          field_name: 'first',
          selected_options: ['firstVal'],
          display_settings: { hide_action_bar: true },
        },
      ];

      expect(result).toMatchObject(expectedResult);
    });

    it('should return second controls set when first one is empty', () => {
      const result = mergeControls({
        controlsWithPriority: [emptyControlSet, secondControlsSet],
        defaultControlsObj,
      });

      const expectedResult = [
        {
          field_name: 'first',
          selected_options: ['secondVal1', 'secondVal2'],
          display_settings: { hide_action_bar: true },
          exists_selected: true,
        },
        {
          field_name: 'second',
          selected_options: ['val1', 'val2'],
          display_settings: { hide_action_bar: false },
          exclude: true,
          persist: true,
        },
      ];

      expect(result).toMatchObject(expectedResult);
    });

    it('should return controls as it is when default control for a field does not exist', () => {
      const result = mergeControls({
        controlsWithPriority: [emptyControlSet, emptyControlSet, thirdControlsSet],
        defaultControlsObj,
      });
      const expectedResult = thirdControlsSet;
      expect(result).toMatchObject(expectedResult);
    });

    it('should return default controls if no priority controls are given', () => {
      const result = mergeControls({
        controlsWithPriority: [emptyControlSet, emptyControlSet, emptyControlSet],
        defaultControlsObj,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('reorderControls', () => {
    it('should add persist controls in order if they are not available in the given controls', () => {
      const newControlsSet: FilterControlConfig[] = [
        {
          field_name: 'new',
        },
      ];

      const result = reorderControlsWithDefaultControls({
        controls: newControlsSet,
        defaultControls,
      });

      const expectedResult = [
        {
          field_name: 'second',
          display_settings: { hide_action_bar: true },
          selected_options: ['val1', 'val2'],
          persist: true,
        },
        {
          field_name: 'new',
        },
      ];

      expect(result).toMatchObject(expectedResult);
    });
    it('should change controls order if they are available in the given controls', () => {
      const newControlsSet: FilterControlConfig[] = [
        {
          field_name: 'new',
        },
        {
          field_name: 'second',
          selected_options: ['val2'],
          display_settings: { hide_action_bar: false },
        },
        {
          field_name: 'first',
          selected_options: [],
        },
      ];

      const expectedResult = [
        {
          field_name: 'second',
          selected_options: ['val2'],
          display_settings: { hide_action_bar: false },
          persist: true,
        },
        {
          field_name: 'new',
        },
        {
          field_name: 'first',
          selected_options: [],
          display_settings: { hide_action_bar: true },
        },
      ];

      const result = reorderControlsWithDefaultControls({
        controls: newControlsSet,
        defaultControls,
      });

      expect(result).toMatchObject(expectedResult);
    });
  });

  describe('getFilterControlsComparator', () => {
    it('should return true when controls are equal and and list of field is empty', () => {
      const comparator = getFilterControlsComparator();
      const result = isEqualWith(defaultControls, defaultControls, comparator);

      expect(result).toBe(true);
    });
    it('should return false when arrays of different length', () => {
      const comparator = getFilterControlsComparator();
      const result = isEqualWith(defaultControls, thirdControlsSet, comparator);

      expect(result).toBe(false);
    });
    it('should return true when given set of fields match ', () => {
      const comparator = getFilterControlsComparator('field_name');
      const result = isEqualWith(defaultControls, secondControlsSet, comparator);

      expect(result).toBe(true);
    });
    it("should return false when given set of fields don't match ", () => {
      const comparator = getFilterControlsComparator('field_name', 'selected_options');
      const result = isEqualWith(defaultControls, secondControlsSet, comparator);
      expect(result).toBe(false);
    });

    it('should return true when comparing empty set of filter controls', () => {
      const comparator = getFilterControlsComparator('field_name', 'selected_options');
      const result = isEqualWith([], [], comparator);
      expect(result).toBe(true);
    });
    it('should return false when comparing one empty and one non-empty set of filter controls', () => {
      const comparator = getFilterControlsComparator('field_name', 'selected_options');
      const result = isEqualWith(defaultControls, [], comparator);
      expect(result).toBe(false);
    });
  });
});
