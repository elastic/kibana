/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { forOwn } from 'lodash';
import { ordinalSuffix } from './ordinal_suffix';

describe('ordinal suffix util', () => {
  const checks = {
    1: 'st',
    2: 'nd',
    3: 'rd',
    4: 'th',
    5: 'th',
    6: 'th',
    7: 'th',
    8: 'th',
    9: 'th',
    10: 'th',
    11: 'th',
    12: 'th',
    13: 'th',
    14: 'th',
    15: 'th',
    16: 'th',
    17: 'th',
    18: 'th',
    19: 'th',
    20: 'th',
    21: 'st',
    22: 'nd',
    23: 'rd',
    24: 'th',
    25: 'th',
    26: 'th',
    27: 'th',
    28: 'th',
    29: 'th',
    30: 'th',
  };

  forOwn(checks, (expected, num: any) => {
    const int = parseInt(num, 10);
    const float = int + Math.random();

    it('knowns ' + int, () => {
      expect(ordinalSuffix(num)).toBe(num + '' + expected);
    });

    it('knows ' + float, () => {
      expect(ordinalSuffix(num)).toBe(num + '' + expected);
    });
  });
});
