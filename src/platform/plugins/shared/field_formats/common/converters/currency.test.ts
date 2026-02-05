/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CurrencyFormat } from './currency';
import { FORMATS_UI_SETTINGS } from '../constants/ui_settings';
import type { FieldFormatsGetConfigFn } from '../types';
import { HTML_CONTEXT_TYPE, TEXT_CONTEXT_TYPE } from '../content_types';

describe('CurrencyFormat', () => {
  const config: { [key: string]: string } = {
    [FORMATS_UI_SETTINGS.FORMAT_CURRENCY_DEFAULT_PATTERN]: '($0,0.[00])',
  };

  const getConfig: FieldFormatsGetConfigFn = (key: string) => config[key];

  test('default pattern', () => {
    const formatter = new CurrencyFormat({}, getConfig);

    expect(formatter.convert(12000.23)).toBe('$12,000.23');
  });

  test('custom pattern', () => {
    const formatter = new CurrencyFormat({ pattern: '$0.[0]' }, getConfig);

    expect(formatter.convert('12000.23')).toBe('$12000.2');
  });

  test('missing value', () => {
    const formatter = new CurrencyFormat({ pattern: '$0.[0]' }, getConfig);

    expect(formatter.convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(formatter.convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(formatter.convert(null, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
    expect(formatter.convert(undefined, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
  });
});
