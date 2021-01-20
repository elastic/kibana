/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment-timezone';
import { RelativeDateFormat } from './relative_date';

describe('Relative Date Format', () => {
  let convert: Function;

  beforeEach(() => {
    const relativeDate = new RelativeDateFormat({}, jest.fn());
    convert = relativeDate.convert.bind(relativeDate);
  });

  test('decoding an undefined or null date should return a "-"', () => {
    expect(convert(null)).toBe('-');
    expect(convert(undefined)).toBe('-');
  });

  test('decoding invalid date should echo invalid value', () => {
    expect(convert('not a valid date')).toBe('not a valid date');
  });

  test('should parse date values', () => {
    const val = '2017-08-13T20:24:09.904Z';
    expect(convert(val)).toBe(moment(val).fromNow());
  });
});
