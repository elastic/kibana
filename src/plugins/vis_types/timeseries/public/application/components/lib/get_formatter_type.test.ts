/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATA_FORMATTERS } from '../../../../common/enums';
import { getFormatterType } from './get_formatter_type';

describe('getFormatterType(formatter)', () => {
  it('should return bytes formatter for "bytes"', () => {
    const actual = getFormatterType(DATA_FORMATTERS.BYTES);

    expect(actual).toBe(DATA_FORMATTERS.BYTES);
  });

  it('should return duration formatter for duration format string', () => {
    const actual = getFormatterType('ns,ms,2');

    expect(actual).toBe(DATA_FORMATTERS.DURATION);
  });

  it('should return custom formatter for Numeral.js pattern', () => {
    const actual = getFormatterType('$ 0.00');

    expect(actual).toBe(DATA_FORMATTERS.CUSTOM);
  });
});
