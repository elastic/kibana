/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getValueFromAccessor, getMaxValue, getMinValue, getGoalValue } from './utils';

describe('expression gauge utils', () => {
  describe('getValueFromAccessor', () => {
    const row = {
      metric: 2,
      min: [10, 20],
    };
    const state = {
      metricAccessor: 'metric',
      minAccessor: 'min',
    };
    it('returns accessor value for number', () => {
      expect(getValueFromAccessor('metricAccessor', row, state)).toEqual(2);
    });
    it('returns accessor value for array', () => {
      expect(getValueFromAccessor('minAccessor', row, state)).toEqual(20);
    });
    it('returns undefined for not number', () => {
      expect(getValueFromAccessor('maxAccessor', row, state)).toEqual(undefined);
    });
  });
  describe('getMaxValue', () => {
    const state = {
      metricAccessor: 'metric',
      minAccessor: 'min',
    };
    it('returns correct value for existing maxAccessor', () => {
      const row = {
        metric: 2,
        min: 0,
        max: 5,
      };
      expect(getMaxValue(row, { ...state, maxAccessor: 'max' })).toEqual(5);
    });
    it('returns fallback value', () => {
      const localState = { ...state, maxAccessor: 'max' };
      expect(getMaxValue({ min: 0 }, localState)).toEqual(100);
      expect(getMaxValue({}, localState)).toEqual(100);
    });
    it('returns correct value for multiple cases', () => {
      const localState = { ...state, maxAccessor: 'max' };
      expect(getMaxValue({ metric: 10 }, localState)).toEqual(15);
      expect(getMaxValue({ min: 0, metric: 2 }, localState)).toEqual(4);
      expect(getMaxValue({ min: -100, metric: 2 }, localState)).toEqual(50);
      expect(getMaxValue({ min: -0.001, metric: 0 }, localState)).toEqual(1);
      expect(getMaxValue({ min: -2000, metric: -1000 }, localState)).toEqual(-500);
      expect(getMaxValue({ min: 0.5, metric: 1.5 }, localState)).toEqual(2);
    });
  });
  describe('getMinValue', () => {
    it('returns 0 for max values greater than 0', () => {
      const state = {
        metricAccessor: 'metric',
        minAccessor: 'min',
      };
      const localState = { ...state, maxAccessor: 'max' };
      expect(getMinValue({ max: 1000, metric: 1.5 }, localState)).toEqual(0);
      expect(getMinValue({ max: 5, metric: 2 }, localState)).toEqual(0);
    });
    it('returns correct value for negative values', () => {
      const state = {
        metricAccessor: 'metric',
        minAccessor: 'min',
      };
      const localState = { ...state, maxAccessor: 'max' };
      expect(getMinValue({ metric: 0 }, localState)).toEqual(-10);
      expect(getMinValue({ metric: -1000 }, localState)).toEqual(-1010);
      expect(getMinValue({ max: 1000, metric: 1.5 }, localState)).toEqual(0);
    });
  });
  describe('getGoalValue', () => {
    it('returns correct value', () => {
      const state = {
        metricAccessor: 'metric',
        minAccessor: 'min',
        maxAccessor: 'max',
      };
      expect(getGoalValue({ max: 1000, min: 0 }, state)).toEqual(750);
      expect(getGoalValue({ min: 3, max: 6 }, state)).toEqual(5);
    });
  });
});
