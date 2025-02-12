/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BytesFormat } from './bytes';
import { FORMATS_UI_SETTINGS } from '../constants/ui_settings';
import { FieldFormatsGetConfigFn } from '../types';

describe('BytesFormat', () => {
  const config: { [key: string]: string } = {
    [FORMATS_UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0,0.[000]b',
  };

  const getConfig: FieldFormatsGetConfigFn = (key: string) => config[key];

  test('default pattern', () => {
    const formatter = new BytesFormat({}, getConfig);

    expect(formatter.convert(5150000)).toBe('4.911MB');
  });

  test('custom pattern', () => {
    const formatter = new BytesFormat({ pattern: '0,0b' }, getConfig);

    expect(formatter.convert('5150000')).toBe('5MB');
  });
});
