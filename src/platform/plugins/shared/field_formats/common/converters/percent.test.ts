/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PercentFormat } from './percent';
import { FORMATS_UI_SETTINGS } from '../constants/ui_settings';
import { TEXT_CONTEXT_TYPE } from '../content_types';
import { expectReactElementWithNull, expectReactElementAsArray } from '../test_utils';

describe('PercentFormat', () => {
  const config: { [key: string]: string } = {
    [FORMATS_UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN]: '0,0.[000]%',
  };

  const getConfig = (key: string) => config[key];

  test('default pattern', () => {
    const formatter = new PercentFormat({}, getConfig);

    expect(formatter.convert(0.99999, TEXT_CONTEXT_TYPE)).toBe('99.999%');
    expect(formatter.reactConvert(0.99999)).toBe('99.999%');
  });

  test('custom pattern', () => {
    const formatter = new PercentFormat({ pattern: '0,0%' }, getConfig);

    expect(formatter.convert('0.99999', TEXT_CONTEXT_TYPE)).toBe('100%');
    expect(formatter.reactConvert('0.99999')).toBe('100%');
  });

  test('missing value', () => {
    const formatter = new PercentFormat({ pattern: '0,0%' }, getConfig);

    expect(formatter.convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(formatter.convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expectReactElementWithNull(formatter.reactConvert(null));
    expectReactElementWithNull(formatter.reactConvert(undefined));
  });

  test('wraps a multi-value array with bracket notation', () => {
    const formatter = new PercentFormat({}, getConfig);

    expect(formatter.convert([0.5, 0.75], TEXT_CONTEXT_TYPE)).toBe('["50%","75%"]');
    expectReactElementAsArray(formatter.reactConvert([0.5, 0.75]), ['50%', '75%']);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const formatter = new PercentFormat({}, getConfig);

    expect(formatter.convert([0.5], TEXT_CONTEXT_TYPE)).toBe('["50%"]');
    expect(formatter.reactConvert([0.5])).toBe('50%');
  });
});
