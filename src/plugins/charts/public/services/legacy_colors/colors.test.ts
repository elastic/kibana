/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { COLOR_MAPPING_SETTING } from '../../../common';
import { seedColors } from '../../static/colors';
import { LegacyColorsService } from './colors';

// Local state for config
const config = new Map<string, any>();

describe('Vislib Color Service', () => {
  const colors = new LegacyColorsService();
  const mockUiSettings = coreMock.createSetup().uiSettings;
  mockUiSettings.get.mockImplementation((a) => config.get(a));
  mockUiSettings.set.mockImplementation((...a) => config.set(...a) as any);
  colors.init(mockUiSettings);

  let color: any;
  let previousConfig: any;

  const arr = ['good', 'better', 'best', 'never', 'let', 'it', 'rest'];
  const arrayOfNumbers = [1, 2, 3, 4, 5];
  const arrayOfUndefinedValues = [undefined, undefined, undefined];
  const arrayOfObjects = [{}, {}, {}];
  const arrayOfBooleans = [true, false, true];
  const arrayOfNullValues = [null, null, null];
  const emptyObject = {};
  const nullValue = null;

  beforeEach(() => {
    previousConfig = config.get(COLOR_MAPPING_SETTING);
    config.set(COLOR_MAPPING_SETTING, {});
    color = colors.createColorLookupFunction(arr, {});
  });

  afterEach(() => {
    config.set(COLOR_MAPPING_SETTING, previousConfig);
  });

  it('should throw error if not initialized', () => {
    const colorsBad = new LegacyColorsService();

    expect(() => colorsBad.createColorLookupFunction(arr, {})).toThrowError();
  });

  it('should throw an error if input is not an array', () => {
    expect(() => {
      // @ts-expect-error
      colors.createColorLookupFunction(200);
    }).toThrowError();

    expect(() => {
      // @ts-expect-error
      colors.createColorLookupFunction('help');
    }).toThrowError();

    expect(() => {
      // @ts-expect-error
      colors.createColorLookupFunction(true);
    }).toThrowError();

    expect(() => {
      colors.createColorLookupFunction();
    }).toThrowError();

    expect(() => {
      // @ts-expect-error
      colors.createColorLookupFunction(nullValue);
    }).toThrowError();

    expect(() => {
      // @ts-expect-error
      colors.createColorLookupFunction(emptyObject);
    }).toThrowError();
  });

  describe('when array is not composed of numbers, strings, or undefined values', () => {
    it('should throw an error', () => {
      expect(() => {
        // @ts-expect-error
        colors.createColorLookupFunction(arrayOfObjects);
      }).toThrowError();

      expect(() => {
        // @ts-expect-error
        colors.createColorLookupFunction(arrayOfBooleans);
      }).toThrowError();

      expect(() => {
        // @ts-expect-error
        colors.createColorLookupFunction(arrayOfNullValues);
      }).toThrowError();
    });
  });

  describe('when input is an array of strings, numbers, or undefined values', () => {
    it('should not throw an error', () => {
      expect(() => {
        colors.createColorLookupFunction(arr);
      }).not.toThrowError();

      expect(() => {
        colors.createColorLookupFunction(arrayOfNumbers);
      }).not.toThrowError();

      expect(() => {
        // @ts-expect-error
        colors.createColorLookupFunction(arrayOfUndefinedValues);
      }).not.toThrowError();
    });
  });

  it('should be a function', () => {
    expect(typeof colors.createColorLookupFunction).toBe('function');
  });

  it('should return a function', () => {
    expect(typeof color).toBe('function');
  });

  it('should return the first hex color in the seed colors array', () => {
    expect(color(arr[0])).toBe(seedColors[0]);
  });

  it('should return the value from the mapped colors', () => {
    expect(color(arr[1])).toBe(colors.mappedColors.get(arr[1]));
  });

  it('should return the value from the specified color mapping overrides', () => {
    const colorFn = colors.createColorLookupFunction(arr, { good: 'red' });
    expect(colorFn('good')).toBe('red');
  });
});
