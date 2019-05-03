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

import getUnitValue, { parseInterval, convertIntervalToUnit, getSuitableUnit } from './unit_to_seconds';

describe('unit_to_seconds', () => {
  describe('parseInterval()', () => {
    test('should parse interval (positive tests)', () => {
      expect(parseInterval('1m')).toEqual({
        value: 1,
        unit: 'm',
      });

      expect(parseInterval('134d')).toEqual({
        value: 134,
        unit: 'd',
      });

      expect(parseInterval('30M')).toEqual({
        value: 30,
        unit: 'M',
      });
    });

    test('should parse interval (negative tests)', () => {
      expect(parseInterval('gm')).toEqual({
        value: undefined,
        unit: undefined,
      });

      expect(parseInterval('-1d')).toEqual({
        value: undefined,
        unit: undefined,
      });

      expect(parseInterval('M')).toEqual({
        value: undefined,
        unit: undefined,
      });
    });
  });

  describe('convertIntervalToUnit()', () => {
    test('should convert interval to unit (positive tests)', () => {
      expect(convertIntervalToUnit('30m', 'h')).toEqual({
        value: 0.5,
        unit: 'h',
      });
      expect(convertIntervalToUnit('1h', 'm')).toEqual({
        value: 60,
        unit: 'm',
      });
      expect(convertIntervalToUnit('1h', 'ms')).toEqual({
        value: 3600000,
        unit: 'ms',
      });
    });

    test('should convert interval to unit (negative tests)', () => {
      expect(convertIntervalToUnit('30m', 'o')).toEqual({
        value: undefined,
        unit: undefined,
      });

      expect(convertIntervalToUnit('m', 's')).toEqual({
        value: undefined,
        unit: undefined,
      });
    });
  });

  describe('getSuitableUnit()', () => {
    test('should return suitable unit (positive tests)', () => {
      const oneDayInSeconds = getUnitValue('d') * 1;
      expect(getSuitableUnit(oneDayInSeconds)).toBe('d');

      const twoDaysInSeconds = getUnitValue('d') * 2;
      expect(getSuitableUnit(twoDaysInSeconds)).toBe('d');

      const aroundOneYearInSeconds = getUnitValue('d') * 370;
      expect(getSuitableUnit(aroundOneYearInSeconds)).toBe('y');

      const threeWeeksInSeconds = getUnitValue('w') * 3;
      expect(getSuitableUnit(threeWeeksInSeconds)).toBe('w');

      const twoYearsInSeconds = getUnitValue('y') * 2;
      expect(getSuitableUnit(twoYearsInSeconds)).toBe('y');
    });

    test('should return suitable unit (negative tests)', () => {
      const negativeNumber = -12;
      expect(getSuitableUnit(negativeNumber)).toBeUndefined();

      const stringValue = 'string';
      expect(getSuitableUnit(stringValue)).toBeUndefined();

      const stringValue1 = '-12';
      expect(getSuitableUnit(stringValue1)).toBeUndefined();

      const nothing = undefined;
      expect(getSuitableUnit(nothing)).toBeUndefined();
    });
  });
});
