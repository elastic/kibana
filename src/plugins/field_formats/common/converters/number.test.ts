/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NumberFormat } from './number';
import { FORMATS_UI_SETTINGS } from '../constants/ui_settings';

describe('NumberFormat', () => {
  const config: { [key: string]: string } = {
    [FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN]: '0,0.[000]',
  };

  const getConfig = (key: string) => config[key];

  test('default pattern', () => {
    const formatter = new NumberFormat({}, getConfig);

    expect(formatter.convert(12.345678)).toBe('12.346');
  });

  test('custom pattern', () => {
    const formatter = new NumberFormat({ pattern: '0,0' }, getConfig);

    expect(formatter.convert('12.345678')).toBe('12');
  });

  test('object input', () => {
    const formatter = new NumberFormat({}, getConfig);
    expect(
      formatter.convert({ min: 150, max: 1000, sum: 5000, value_count: 10 })
    ).toMatchInlineSnapshot(`"{\\"min\\":150,\\"max\\":1000,\\"sum\\":5000,\\"value_count\\":10}"`);
    expect(formatter.convert({ min: 150, max: 1000, sum: 5000, value_count: 10 }, 'html'))
      .toMatchInlineSnapshot(`
    "{
      \\"min\\": 150,
      \\"max\\": 1000,
      \\"sum\\": 5000,
      \\"value_count\\": 10
    }"
  `);
  });
});
