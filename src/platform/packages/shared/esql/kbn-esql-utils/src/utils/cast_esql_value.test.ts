/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castESQLValue } from './cast_esql_value';

describe('castESQLValue', () => {
  it('casts by the column type when there is one', () => {
    expect(castESQLValue('42', 'long')).toBe(42);
    expect(castESQLValue('42', 'keyword')).toBe('42');
  });

  it('casts numeric-looking values when there is no column type', () => {
    expect(castESQLValue('42')).toBe(42);
    expect(castESQLValue('1.5')).toBe(1.5);
    expect(castESQLValue('web-1')).toBe('web-1');
  });
});
