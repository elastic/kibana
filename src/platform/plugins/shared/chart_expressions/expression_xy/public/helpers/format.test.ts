/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';
import { BytesFormat, NumberFormat, PercentFormat } from '@kbn/field-formats-plugin/common';
import { getMaximumFractionDigits } from './format';

describe('getMaximumFractionDigits', () => {
  const getConfig = <T = unknown>() => undefined as unknown as T;

  it('maps decimals directly for unscaled number formats', () => {
    const format = new NumberFormat({ decimals: 2 }, getConfig);
    expect(getMaximumFractionDigits(format)).toBe(2);
  });

  it('adds 2 for percent formats since the value is multiplied by 100', () => {
    const format = new PercentFormat({ decimals: 0 }, getConfig);
    expect(getMaximumFractionDigits(format)).toBe(2);
  });

  it('adds 2 for percent formats with non-zero decimals', () => {
    const format = new PercentFormat({ decimals: 2 }, getConfig);
    expect(getMaximumFractionDigits(format)).toBe(4);
  });

  it('returns undefined for bytes/bits formats', () => {
    const format = new BytesFormat({ decimals: 0 }, getConfig);
    expect(getMaximumFractionDigits(format)).toBeUndefined();
  });

  it('returns undefined when no decimals param is set', () => {
    const format = new NumberFormat({}, getConfig);
    expect(getMaximumFractionDigits(format)).toBeUndefined();
  });

  it('returns undefined when decimals is not a number', () => {
    const format = new NumberFormat({ decimals: 'foo' } as FieldFormatParams, getConfig);
    expect(getMaximumFractionDigits(format)).toBeUndefined();
  });
});
