/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { typeMatch } from '.';

describe('type_match', () => {
  test('ip -> ip is true', () => {
    expect(typeMatch('ip', 'ip')).toEqual(true);
  });

  test('keyword -> keyword is true', () => {
    expect(typeMatch('keyword', 'keyword')).toEqual(true);
  });

  test('text -> text is true', () => {
    expect(typeMatch('text', 'text')).toEqual(true);
  });

  test('ip_range -> ip is true', () => {
    expect(typeMatch('ip_range', 'ip')).toEqual(true);
  });

  test('date_range -> date is true', () => {
    expect(typeMatch('date_range', 'date')).toEqual(true);
  });

  test('double_range -> double is true', () => {
    expect(typeMatch('double_range', 'double')).toEqual(true);
  });

  test('float_range -> float is true', () => {
    expect(typeMatch('float_range', 'float')).toEqual(true);
  });

  test('integer_range -> integer is true', () => {
    expect(typeMatch('integer_range', 'integer')).toEqual(true);
  });

  test('long_range -> long is true', () => {
    expect(typeMatch('long_range', 'long')).toEqual(true);
  });

  test('ip -> date is false', () => {
    expect(typeMatch('ip', 'date')).toEqual(false);
  });

  test('long -> float is false', () => {
    expect(typeMatch('long', 'float')).toEqual(false);
  });

  test('integer -> long is false', () => {
    expect(typeMatch('integer', 'long')).toEqual(false);
  });
});
