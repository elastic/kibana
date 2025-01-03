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

describe('PercentFormat', () => {
  const config: { [key: string]: string } = {
    [FORMATS_UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN]: '0,0.[000]%',
  };

  const getConfig = (key: string) => config[key];

  test('default pattern', () => {
    const formatter = new PercentFormat({}, getConfig);

    expect(formatter.convert(0.99999)).toBe('99.999%');
  });

  test('custom pattern', () => {
    const formatter = new PercentFormat({ pattern: '0,0%' }, getConfig);

    expect(formatter.convert('0.99999')).toBe('100%');
  });
});
