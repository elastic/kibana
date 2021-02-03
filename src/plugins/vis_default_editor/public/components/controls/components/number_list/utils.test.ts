/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  getInitModelList,
  hasInvalidValues,
  parse,
  validateValue,
  getNextModel,
  getRange,
  getValidatedModels,
} from './utils';
import { NumberListRange } from './range';
import { NumberRowModel } from './number_row';

describe('NumberList utils', () => {
  let modelList: NumberRowModel[];
  let range: NumberListRange;
  let invalidEntry: NumberRowModel;

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
    invalidEntry = {
      value: expect.any(Number),
      isInvalid: true,
      error: expect.any(String),
      id: expect.any(String),
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

  describe('getValidatedModels', () => {
    test('should return model list when number list is empty', () => {
      const updatedModelList = getValidatedModels([], modelList, range);

      expect(updatedModelList).toEqual([{ value: 0, id: expect.any(String), isInvalid: false }]);
    });

    test('should not update model list when number list is the same', () => {
      const updatedModelList = getValidatedModels([1, 2], modelList, range);

      expect(updatedModelList).toEqual(modelList);
    });

    test('should update model list when number list was changed', () => {
      const updatedModelList = getValidatedModels([1, 3], modelList, range);
      modelList[1].value = 3;
      expect(updatedModelList).toEqual(modelList);
    });

    test('should update model list when number list increased', () => {
      const updatedModelList = getValidatedModels([1, 2, 3], modelList, range);
      expect(updatedModelList).toEqual([
        ...modelList,
        { value: 3, id: expect.any(String), isInvalid: false },
      ]);
    });

    test('should update model list when number list decreased', () => {
      const updatedModelList = getValidatedModels([2], modelList, range);
      expect(updatedModelList).toEqual([{ value: 2, id: '1', isInvalid: false }]);
    });

    test('should update model list when number list has undefined value', () => {
      const updatedModelList = getValidatedModels([1, undefined], modelList, range);
      modelList[1].value = '';
      modelList[1].isInvalid = true;
      expect(updatedModelList).toEqual(modelList);
    });

    test('should identify when a number is out of order', () => {
      const updatedModelList = getValidatedModels([1, 3, 2], modelList, range, true);
      expect(updatedModelList[2]).toEqual(invalidEntry);
    });

    test('should identify when many numbers are out of order', () => {
      const updatedModelList = getValidatedModels([1, 3, 2, 3, 4, 2], modelList, range, true);
      expect(updatedModelList[2]).toEqual(invalidEntry);
      expect(updatedModelList[5]).toEqual(invalidEntry);
    });

    test('should identify a duplicate', () => {
      const updatedModelList = getValidatedModels([1, 2, 3, 6, 2], modelList, range, false, true);
      expect(updatedModelList[4]).toEqual(invalidEntry);
    });

    test('should identify many duplicates', () => {
      const updatedModelList = getValidatedModels(
        [2, 2, 2, 3, 4, 5, 2, 2, 3],
        modelList,
        range,
        false,
        true
      );
      expect(updatedModelList[1]).toEqual(invalidEntry);
      expect(updatedModelList[2]).toEqual(invalidEntry);
      expect(updatedModelList[6]).toEqual(invalidEntry);
      expect(updatedModelList[7]).toEqual(invalidEntry);
      expect(updatedModelList[8]).toEqual(invalidEntry);
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
