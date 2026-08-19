/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import moment from 'moment-timezone';
import { RelativeDateFormat } from './relative_date';
import { expectReactElementWithNull } from '../test_utils';

describe('Relative Date Format', () => {
  // Use a fixed date to avoid time-dependent output in array assertions
  const fixedDate = '2019-01-01T00:00:00.000Z';

  let convert: Function;
  let convertToReact: RelativeDateFormat['convertToReact'];

  beforeEach(() => {
    const relativeDate = new RelativeDateFormat({}, jest.fn());
    convert = relativeDate.convertToText.bind(relativeDate);
    convertToReact = relativeDate.convertToReact.bind(relativeDate);
  });

  test('decoding a missing value', () => {
    expect(convert(null)).toBe('(null)');
    expect(convert(undefined)).toBe('(null)');
    expectReactElementWithNull(convertToReact(null));
    expectReactElementWithNull(convertToReact(undefined));
  });

  test('decoding invalid date should echo invalid value', () => {
    expect(convert('not a valid date')).toBe('not a valid date');
    expect(convertToReact('not a valid date')).toBe('not a valid date');
  });

  test('should parse date values', () => {
    const val = '2017-08-13T20:24:09.904Z';
    expect(convert(val)).toBe(moment(val).fromNow());
    expect(convertToReact(val)).toBe(moment(val).fromNow());
  });

  test('convertToReact returns raw string for unhighlighted content (React escapes at render)', () => {
    expect(convertToReact('<script>alert("test")</script>')).toBe('<script>alert("test")</script>');
  });

  test('wraps a multi-value array with bracket notation', () => {
    const rel = moment(fixedDate).fromNow();
    expect(convert([fixedDate, fixedDate])).toBe(`["${rel}","${rel}"]`);
    // Use React.isValidElement to verify a React element is returned without
    // capturing the time-relative string value in the snapshot
    expect(React.isValidElement(convertToReact([fixedDate, fixedDate]))).toBe(true);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const rel = moment(fixedDate).fromNow();
    expect(convert([fixedDate])).toBe(`["${rel}"]`);
    expect(convertToReact([fixedDate])).toBe(rel);
  });
});
