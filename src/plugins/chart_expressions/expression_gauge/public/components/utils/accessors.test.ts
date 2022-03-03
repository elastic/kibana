/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getValueFromAccessor, getMaxValue, getMinValue, getGoalValue } from './accessors';

describe('expression gauge utils', () => {
  describe('getValueFromAccessor', () => {
    const row = {
      metric: 2,
      min: [10, 20],
    };
    const accessors = {
      metric: 'metric',
      min: 'min',
    };
    it('returns accessor value for number', () => {
      expect(getValueFromAccessor(accessors.metric, row)).toEqual(2);
    });
    it('returns accessor value for array', () => {
      expect(getValueFromAccessor(accessors.min, row)).toEqual(20);
    });
    it('returns undefined for not number', () => {
      expect(getValueFromAccessor('max', row)).toEqual(undefined);
    });
  });
  describe('getMaxValue', () => {
    const accessors = {
      metric: 'metric',
      min: 'min',
    };
    it('returns correct value for existing max', () => {
      const row = {
        metric: 2,
        min: 0,
        max: 5,
      };
      expect(getMaxValue(row, { ...accessors, max: 'max' })).toEqual(5);
    });
    it('returns fallback value', () => {
      const localAccessors = { ...accessors, max: 'max' };
      expect(getMaxValue({ min: 0 }, localAccessors)).toEqual(100);
      expect(getMaxValue({}, localAccessors)).toEqual(100);
    });
    it('returns correct value for multiple cases', () => {
      const localAccessors = { ...accessors, max: 'max' };
      expect(getMaxValue({ metric: 10 }, localAccessors)).toEqual(15);
      expect(getMaxValue({ min: 0, metric: 2 }, localAccessors)).toEqual(4);
      expect(getMaxValue({ min: -100, metric: 2 }, localAccessors)).toEqual(50);
      expect(getMaxValue({ min: -0.001, metric: 0 }, localAccessors)).toEqual(1);
      expect(getMaxValue({ min: -2000, metric: -1000 }, localAccessors)).toEqual(-500);
      expect(getMaxValue({ min: 0.5, metric: 1.5 }, localAccessors)).toEqual(2);
    });
  });
  describe('getMinValue', () => {
    it('returns 0 for max values greater than 0', () => {
      const accessors = {
        metric: 'metric',
        min: 'min',
      };
      const localAccessors = { ...accessors, max: 'max' };
      expect(getMinValue({ max: 1000, metric: 1.5 }, localAccessors)).toEqual(0);
      expect(getMinValue({ max: 5, metric: 2 }, localAccessors)).toEqual(0);
    });
    it('returns correct value for negative values', () => {
      const accessors = {
        metric: 'metric',
        min: 'min',
      };
      const localAccessors = { ...accessors, max: 'max' };
      expect(getMinValue({ metric: 0 }, localAccessors)).toEqual(-10);
      expect(getMinValue({ metric: -1000 }, localAccessors)).toEqual(-1010);
      expect(getMinValue({ max: 1000, metric: 1.5 }, localAccessors)).toEqual(0);
    });
  });
  describe('getGoalValue', () => {
    it('returns correct value', () => {
      const accessors = {
        metric: 'metric',
        min: 'min',
        max: 'max',
      };
      expect(getGoalValue({ max: 1000, min: 0 }, accessors)).toEqual(750);
      expect(getGoalValue({ min: 3, max: 6 }, accessors)).toEqual(5);
    });
  });
});
