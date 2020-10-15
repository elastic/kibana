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

import { coreMock } from '../../../../../core/public/mocks';
import { COLOR_MAPPING_SETTING } from '../../../common';
import { seedColors } from './seed_colors';
import { ColorsService } from './colors';

// Local state for config
const config = new Map<string, any>();

describe('Vislib Color Service', () => {
  const colors = new ColorsService();
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
    const colorsBad = new ColorsService();

    expect(() => colorsBad.createColorLookupFunction(arr, {})).toThrowError();
  });

  it('should throw an error if input is not an array', () => {
    expect(() => {
      colors.createColorLookupFunction(200);
    }).toThrowError();

    expect(() => {
      colors.createColorLookupFunction('help');
    }).toThrowError();

    expect(() => {
      colors.createColorLookupFunction(true);
    }).toThrowError();

    expect(() => {
      colors.createColorLookupFunction();
    }).toThrowError();

    expect(() => {
      colors.createColorLookupFunction(nullValue);
    }).toThrowError();

    expect(() => {
      colors.createColorLookupFunction(emptyObject);
    }).toThrowError();
  });

  describe('when array is not composed of numbers, strings, or undefined values', () => {
    it('should throw an error', () => {
      expect(() => {
        colors.createColorLookupFunction(arrayOfObjects);
      }).toThrowError();

      expect(() => {
        colors.createColorLookupFunction(arrayOfBooleans);
      }).toThrowError();

      expect(() => {
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
