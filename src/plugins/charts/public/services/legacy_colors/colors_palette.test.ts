/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
