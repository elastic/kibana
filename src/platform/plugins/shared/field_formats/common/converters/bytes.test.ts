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
import type { FieldFormatsGetConfigFn } from '../types';
import { TEXT_CONTEXT_TYPE } from '../content_types';
import { expectReactElementWithNull, expectReactElementAsArray } from '../test_utils';

describe('BytesFormat', () => {
  const config: { [key: string]: string } = {
    [FORMATS_UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0,0.[000]b',
  };

  const getConfig: FieldFormatsGetConfigFn = (key: string) => config[key];

  test('default pattern', () => {
    const formatter = new BytesFormat({}, getConfig);

    expect(formatter.convert(5150000, TEXT_CONTEXT_TYPE)).toBe('4.911MB');
    expect(formatter.reactConvert(5150000)).toBe('4.911MB');
  });

  test('custom pattern', () => {
    const formatter = new BytesFormat({ pattern: '0,0b' }, getConfig);

    expect(formatter.convert('5150000', TEXT_CONTEXT_TYPE)).toBe('5MB');
    expect(formatter.reactConvert('5150000')).toBe('5MB');
  });

  test('missing value', () => {
    const formatter = new BytesFormat({}, getConfig);

    expect(formatter.convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(formatter.convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expectReactElementWithNull(formatter.reactConvert(null));
    expectReactElementWithNull(formatter.reactConvert(undefined));
  });

  test('wraps a multi-value array with bracket notation', () => {
    const formatter = new BytesFormat({}, getConfig);

    expect(formatter.convert([1024, 2048], TEXT_CONTEXT_TYPE)).toBe('["1KB","2KB"]');
    expectReactElementAsArray(formatter.reactConvert([1024, 2048]), ['1KB', '2KB']);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const formatter = new BytesFormat({}, getConfig);

    expect(formatter.convert([1024], TEXT_CONTEXT_TYPE)).toBe('["1KB"]');
    expect(formatter.reactConvert([1024])).toBe('1KB');
  });
});
