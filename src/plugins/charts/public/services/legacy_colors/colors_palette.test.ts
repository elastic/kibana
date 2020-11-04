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

import { seedColors } from '../../static/colors';
import { createColorPalette } from '../../static/colors';

describe('Color Palette', () => {
  const num1 = 45;
  const num2 = 72;
  const num3 = 90;
  const string = 'Welcome';
  const bool = true;
  const nullValue = null;
  const emptyArr: [] = [];
  const emptyObject = {};
  let colorPalette: string[];

  beforeEach(() => {
    colorPalette = createColorPalette(num1);
  });

  it('should throw an error if input is not a number', () => {
    expect(() => {
      // @ts-expect-error
      createColorPalette(string);
    }).toThrowError();

    expect(() => {
      // @ts-expect-error
      createColorPalette(bool);
    }).toThrowError();

    expect(() => {
      // @ts-expect-error
      createColorPalette(nullValue);
    }).toThrowError();

    expect(() => {
      // @ts-expect-error
      createColorPalette(emptyArr);
    }).toThrowError();

    expect(() => {
      // @ts-expect-error
      createColorPalette(emptyObject);
    }).toThrowError();

    expect(() => {
      // @ts-expect-error
      createColorPalette();
    }).toThrowError();
  });

  it('should be a function', () => {
    expect(typeof createColorPalette).toBe('function');
  });

  it('should return an array', () => {
    expect(colorPalette).toBeInstanceOf(Array);
  });

  it('should return an array of the same length as the input', () => {
    expect(colorPalette.length).toBe(num1);
  });

  it('should return the seed color array when input length is 72', () => {
    expect(createColorPalette(num2)[71]).toBe(seedColors[71]);
  });

  it('should return an array of the same length as the input when input is greater than 72', () => {
    expect(createColorPalette(num3).length).toBe(num3);
  });

  it('should create new darker colors when input is greater than 72', () => {
    expect(createColorPalette(num3)[72]).not.toEqual(seedColors[0]);
  });

  it('should create new colors and convert them correctly', () => {
    expect(createColorPalette(num3)[72]).toEqual('#404ABF');
  });
});
