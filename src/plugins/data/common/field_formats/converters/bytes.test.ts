/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BytesFormat } from './bytes';
import { UI_SETTINGS } from '../../constants';

describe('BytesFormat', () => {
  const config: Record<string, any> = {};

  config[UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN] = '0,0.[000]b';

  const getConfig = (key: string) => config[key];

  test('default pattern', () => {
    const formatter = new BytesFormat({}, getConfig);

    expect(formatter.convert(5150000)).toBe('4.911MB');
  });

  test('custom pattern', () => {
    const formatter = new BytesFormat({ pattern: '0,0b' }, getConfig);

    expect(formatter.convert('5150000')).toBe('5MB');
  });
});
