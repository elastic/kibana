/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NumberRangeFormat } from './number_range';
import { FORMATS_UI_SETTINGS } from '../constants/ui_settings';
import type { FieldFormatsGetConfigFn } from '../types';

describe('NumberRangeFormat', () => {
  const config: { [key: string]: string } = {
    [FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN]: '0,0.[000]',
  };

  const getConfig: FieldFormatsGetConfigFn = (key: string) => config[key];

  test('formats a range with the default number pattern', () => {
    const formatter = new NumberRangeFormat({}, getConfig);

    expect(formatter.convertToText('500.0..550.0')).toBe('500 – 550');
    expect(formatter.convertToText('0.0..1000.0')).toBe('0 – 1,000');
    expect(formatter.convertToText('0.35000000000000003..0.4')).toBe('0.35 – 0.4');
    expect(formatter.convertToText('-10.0..-5.0')).toBe('-10 – -5');
  });

  test('returns values that are not ranges as they are', () => {
    const formatter = new NumberRangeFormat({}, getConfig);

    expect(formatter.convertToText('not a range')).toBe('not a range');
  });
});
