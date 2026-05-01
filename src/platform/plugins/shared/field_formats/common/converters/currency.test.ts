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
import { expectReactElementWithNull, expectReactElementAsArray } from '../test_utils';

describe('CurrencyFormat', () => {
  const config: { [key: string]: string } = {
    [FORMATS_UI_SETTINGS.FORMAT_CURRENCY_DEFAULT_PATTERN]: '($0,0.[00])',
  };

  const getConfig: FieldFormatsGetConfigFn = (key: string) => config[key];

  test('default pattern', () => {
    const formatter = new CurrencyFormat({}, getConfig);

    expect(formatter.convert(12000.23)).toBe('$12,000.23');
    expect(formatter.convert(12000.23, HTML_CONTEXT_TYPE)).toBe('$12,000.23');
    expect(formatter.reactConvert(12000.23)).toBe('$12,000.23');
  });

  test('custom pattern', () => {
    const formatter = new CurrencyFormat({ pattern: '$0.[0]' }, getConfig);

    expect(formatter.convert('12000.23')).toBe('$12000.2');
    expect(formatter.convert('12000.23', HTML_CONTEXT_TYPE)).toBe('$12000.2');
    expect(formatter.reactConvert('12000.23')).toBe('$12000.2');
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
    expectReactElementWithNull(formatter.reactConvert(null));
    expectReactElementWithNull(formatter.reactConvert(undefined));
  });

  test('wraps a multi-value array with bracket notation', () => {
    const formatter = new CurrencyFormat({}, getConfig);

    expect(formatter.convert([100, 200], TEXT_CONTEXT_TYPE)).toBe('["$100","$200"]');
    expect(formatter.convert([100, 200], HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffArray__highlight">[</span>$100<span class="ffArray__highlight">,</span> $200<span class="ffArray__highlight">]</span>'
    );
    expectReactElementAsArray(formatter.reactConvert([100, 200]), ['$100', '$200']);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const formatter = new CurrencyFormat({}, getConfig);

    expect(formatter.convert([100], TEXT_CONTEXT_TYPE)).toBe('["$100"]');
    expect(formatter.convert([100], HTML_CONTEXT_TYPE)).toBe('$100');
    expect(formatter.reactConvert([100])).toBe('$100');
  });
});
