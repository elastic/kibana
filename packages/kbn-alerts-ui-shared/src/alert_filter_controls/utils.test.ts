/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlGroupInput, OptionsListEmbeddableInput } from '@kbn/controls-plugin/common';
import {
  getFilterItemObjListFromControlInput,
  mergeControls,
  reorderControlsWithDefaultControls,
  getFilterControlsComparator,
} from './utils';
import { initialInputData } from './mocks/data';
import type { FilterControlConfig } from './types';
import { isEqualWith } from 'lodash';

const defaultControls: FilterControlConfig[] = [
  {
    fieldName: 'first',
    hideActionBar: true,
    selectedOptions: ['val1', 'val2'],
  },

  {
    fieldName: 'second',
    hideActionBar: true,
    selectedOptions: ['val1', 'val2'],
    persist: true,
  },
];

const firstControlsSet: FilterControlConfig[] = [
  {
    fieldName: 'first',
    selectedOptions: ['firstVal'],
  },
];

const secondControlsSet: FilterControlConfig[] = [
  {
    fieldName: 'first',
    selectedOptions: ['secondVal1', 'secondVal2'],
    existsSelected: true,
  },
  {
    fieldName: 'second',
    hideActionBar: false,
    exclude: true,
  },
];

const thirdControlsSet: FilterControlConfig[] = [
  {
    fieldName: 'new',
    selectedOptions: [],
  },
];

const emptyControlSet: FilterControlConfig[] = [];

const defaultControlsObj = defaultControls.reduce((prev, current) => {
  prev[current.fieldName] = current;
  return prev;
}, {} as Record<string, FilterControlConfig>);
describe('utils', () => {
  describe('getFilterItemObjListFromControlOutput', () => {
    it('should return ordered filterItem where passed in order', () => {
      const filterItemObjList = getFilterItemObjListFromControlInput(
        initialInputData as ControlGroupInput
      );

      filterItemObjList.forEach((item, idx) => {
        const panelObj =
          initialInputData.panels[String(idx) as keyof typeof initialInputData.panels]
            .explicitInput;
        expect(item).toMatchObject({
          fieldName: panelObj.fieldName,
          selectedOptions: panelObj.selectedOptions,
          title: panelObj.title,
          existsSelected: panelObj.existsSelected,
          exclude: panelObj.exclude,
        });
      });
    });

    it('should return ordered filterItem where NOT passed in order', () => {
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['3'],
          '1': initialInputData.panels['0'],
        },
      };
      const filterItemObjList = getFilterItemObjListFromControlInput(
        newInputData as ControlGroupInput
      );

      let panelObj = newInputData.panels['1'].explicitInput as OptionsListEmbeddableInput;
      expect(filterItemObjList[0]).toMatchObject({
        fieldName: panelObj.fieldName,
        selectedOptions: panelObj.selectedOptions,
        title: panelObj.title,
        existsSelected: panelObj.existsSelected,
        exclude: panelObj.exclude,
      });

      panelObj = newInputData.panels['0'].explicitInput;
      expect(filterItemObjList[1]).toMatchObject({
        fieldName: panelObj.fieldName,
        selectedOptions: panelObj.selectedOptions,
        title: panelObj.title,
        existsSelected: panelObj.existsSelected,
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
          fieldName: 'first',
          selectedOptions: ['firstVal'],
          hideActionBar: true,
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
          fieldName: 'first',
          selectedOptions: ['secondVal1', 'secondVal2'],
          hideActionBar: true,
          existsSelected: true,
        },
        {
          fieldName: 'second',
          selectedOptions: ['val1', 'val2'],
          hideActionBar: false,
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
          fieldName: 'new',
        },
      ];

      const result = reorderControlsWithDefaultControls({
        controls: newControlsSet,
        defaultControls,
      });

      const expectedResult = [
        {
          fieldName: 'second',
          hideActionBar: true,
          selectedOptions: ['val1', 'val2'],
          persist: true,
        },
        {
          fieldName: 'new',
        },
      ];

      expect(result).toMatchObject(expectedResult);
    });
    it('should change controls order if they are available in the given controls', () => {
      const newControlsSet: FilterControlConfig[] = [
        {
          fieldName: 'new',
        },
        {
          fieldName: 'second',
          selectedOptions: ['val2'],
          hideActionBar: false,
        },
        {
          fieldName: 'first',
          selectedOptions: [],
        },
      ];

      const expectedResult = [
        {
          fieldName: 'second',
          selectedOptions: ['val2'],
          hideActionBar: false,
          persist: true,
        },
        {
          fieldName: 'new',
        },
        {
          fieldName: 'first',
          selectedOptions: [],
          hideActionBar: true,
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
      const comparator = getFilterControlsComparator('fieldName');
      const result = isEqualWith(defaultControls, secondControlsSet, comparator);

      expect(result).toBe(true);
    });
    it("should return false when given set of fields don't match ", () => {
      const comparator = getFilterControlsComparator('fieldName', 'selectedOptions');
      const result = isEqualWith(defaultControls, secondControlsSet, comparator);
      expect(result).toBe(false);
    });

    it('should return true when comparing empty set of filter controls', () => {
      const comparator = getFilterControlsComparator('fieldName', 'selectedOptions');
      const result = isEqualWith([], [], comparator);
      expect(result).toBe(true);
    });
    it('should return false when comparing one empty and one non-empty set of filter controls', () => {
      const comparator = getFilterControlsComparator('fieldName', 'selectedOptions');
      const result = isEqualWith(defaultControls, [], comparator);
      expect(result).toBe(false);
    });
  });
});
