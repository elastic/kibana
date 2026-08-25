/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NullableMetricUnit } from '../../../types';
import { resolveMetricUnit } from './resolve_metric_unit';

describe('resolveMetricUnit', () => {
  it('should return undefined for an empty units array', () => {
    expect(resolveMetricUnit('system.cpu.total.norm.pct', [])).toBeUndefined();
  });

  it('should return undefined when all units are null', () => {
    expect(resolveMetricUnit('system.cpu.total.norm.pct', [null, null])).toBeUndefined();
  });

  it('should return the first non-null normalized unit', () => {
    const units = [null, 'byte', 'bytes'] as unknown as NullableMetricUnit[];
    expect(resolveMetricUnit('system.memory.usage', units)).toBe('bytes');
  });

  it('should normalize denormalized units like "byte" to "bytes"', () => {
    const units = ['byte'] as unknown as NullableMetricUnit[];
    expect(resolveMetricUnit('system.memory.usage', units)).toBe('bytes');
  });

  it('should return already-normalized units unchanged', () => {
    expect(resolveMetricUnit('system.memory.usage', ['bytes'])).toBe('bytes');
    expect(resolveMetricUnit('system.cpu.total.norm.pct', ['percent'])).toBe('percent');
  });

  it('should skip null entries and return the first valid unit', () => {
    expect(resolveMetricUnit('system.memory.usage', [null, null, 'bytes'])).toBe('bytes');
  });

  it('should normalize OTel unit abbreviations', () => {
    const units = ['by'] as unknown as NullableMetricUnit[];
    expect(resolveMetricUnit('system.memory.usage', units)).toBe('bytes');
  });

  it('should normalize percent symbol to percent', () => {
    const units = ['%'] as unknown as NullableMetricUnit[];
    expect(resolveMetricUnit('system.cpu.norm.pct', units)).toBe('percent');
  });
});
