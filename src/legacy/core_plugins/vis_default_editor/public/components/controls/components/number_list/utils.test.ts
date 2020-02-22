/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  getInitModelList,
  getUpdatedModels,
  validateOrder,
  hasInvalidValues,
  parse,
  validateValue,
  getNextModel,
  getRange,
} from './utils';
import { NumberListRange } from './range';
import { NumberRowModel } from './number_row';

describe('NumberList utils', () => {
  let modelList: NumberRowModel[];
  let range: NumberListRange;

  beforeEach(() => {
    modelList = [
      { value: 1, id: '1', isInvalid: false },
      { value: 2, id: '2', isInvalid: false },
    ];
    range = {
      min: 1,
      max: 10,
      minInclusive: true,
      maxInclusive: true,
      within: jest.fn(() => true),
    };
  });

  describe('getInitModelList', () => {
    test('should return list with default model when number list is empty', () => {
      const models = getInitModelList([]);

      expect(models).toEqual([{ value: 0, id: expect.any(String), isInvalid: false }]);
    });

    test('should return model list', () => {
      const models = getInitModelList([1, undefined]);

      expect(models).toEqual([
        { value: 1, id: expect.any(String), isInvalid: false },
        { value: '', id: expect.any(String), isInvalid: false },
      ]);
    });
  });

  describe('getUpdatedModels', () => {
    test('should return model list when number list is empty', () => {
      const updatedModelList = getUpdatedModels([], modelList, range);

      expect(updatedModelList).toEqual([{ value: 0, id: expect.any(String), isInvalid: false }]);
    });

    test('should not update model list when number list is the same', () => {
      const updatedModelList = getUpdatedModels([1, 2], modelList, range);

      expect(updatedModelList).toEqual(modelList);
    });

    test('should update model list when number list was changed', () => {
      const updatedModelList = getUpdatedModels([1, 3], modelList, range);
      modelList[1].value = 3;
      expect(updatedModelList).toEqual(modelList);
    });

    test('should update model list when number list increased', () => {
      const updatedModelList = getUpdatedModels([1, 2, 3], modelList, range);
      expect(updatedModelList).toEqual([
        ...modelList,
        { value: 3, id: expect.any(String), isInvalid: false },
      ]);
    });

    test('should update model list when number list decreased', () => {
      const updatedModelList = getUpdatedModels([2], modelList, range);
      expect(updatedModelList).toEqual([{ value: 2, id: '1', isInvalid: false }]);
    });

    test('should update model list when number list has undefined value', () => {
      const updatedModelList = getUpdatedModels([1, undefined], modelList, range);
      modelList[1].value = '';
      modelList[1].isInvalid = true;
      expect(updatedModelList).toEqual(modelList);
    });

    test('should update model list when number order is invalid', () => {
      const updatedModelList = getUpdatedModels([1, 3, 2], modelList, range, 2);
      expect(updatedModelList).toEqual([
        modelList[0],
        { ...modelList[1], value: 3 },
        { value: 2, id: expect.any(String), isInvalid: true },
      ]);
    });
  });

  describe('validateOrder', () => {
    test('should return true when order is valid', () => {
      expect(validateOrder([1, 2])).toEqual({
        isValidOrder: true,
      });
    });

    test('should return true when a number is undefined', () => {
      expect(validateOrder([1, undefined])).toEqual({
        isValidOrder: true,
      });
    });

    test('should return false when order is invalid', () => {
      expect(validateOrder([2, 1])).toEqual({
        isValidOrder: false,
        modelIndex: 1,
      });
    });
  });

  describe('hasInvalidValues', () => {
    test('should return false when there are no invalid models', () => {
      expect(hasInvalidValues(modelList)).toBeFalsy();
    });

    test('should return true when there is an invalid model', () => {
      modelList[1].isInvalid = true;
      expect(hasInvalidValues(modelList)).toBeTruthy();
    });
  });

  describe('parse', () => {
    test('should return a number', () => {
      expect(parse('3')).toBe(3);
    });

    test('should return an empty string when value is invalid', () => {
      expect(parse('')).toBe('');
      expect(parse('test')).toBe('');
      expect(parse('NaN')).toBe('');
    });
  });

  describe('validateValue', () => {
    test('should return valid', () => {
      expect(validateValue(3, range)).toEqual({ isInvalid: false });
    });

    test('should return invalid', () => {
      range.within = jest.fn(() => false);
      expect(validateValue(11, range)).toEqual({ isInvalid: true, error: expect.any(String) });
    });
  });

  describe('getNextModel', () => {
    test('should return 3 as next value', () => {
      expect(getNextModel(modelList, range)).toEqual({
        value: 3,
        id: expect.any(String),
        isInvalid: false,
      });
    });

    test('should return 1 as next value', () => {
      expect(getNextModel([{ value: '', id: '2', isInvalid: false }], range)).toEqual({
        value: 1,
        id: expect.any(String),
        isInvalid: false,
      });
    });

    test('should return 9 as next value', () => {
      expect(getNextModel([{ value: 11, id: '2', isInvalid: false }], range)).toEqual({
        value: 9,
        id: expect.any(String),
        isInvalid: false,
      });
    });
  });

  describe('getRange', () => {
    test('should return default range', () => {
      expect(getRange()).toEqual({
        min: 0,
        max: Infinity,
        maxInclusive: false,
        minInclusive: true,
      });
    });

    test('should return parsed range', () => {
      expect(getRange('(-Infinity, 100]')).toEqual({
        min: -Infinity,
        max: 100,
        maxInclusive: true,
        minInclusive: false,
      });
    });

    test('should throw an error', () => {
      expect(() => getRange('test')).toThrowError();
    });
  });
});
