/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { PassThroughAny, isPassThroughAny } from './pass_through_any';

describe('PassThroughAny', () => {
  it('should validate any value', () => {
    expect(PassThroughAny.safeParse({ foo: 'bar' })).toEqual({
      success: true,
      data: { foo: 'bar' },
    });
    expect(PassThroughAny.safeParse('foo')).toEqual({ success: true, data: 'foo' });
    expect(PassThroughAny.safeParse(123)).toEqual({ success: true, data: 123 });
    expect(PassThroughAny.safeParse(true)).toEqual({ success: true, data: true });
    expect(PassThroughAny.safeParse(null)).toEqual({ success: true, data: null });
    expect(PassThroughAny.safeParse(undefined)).toEqual({ success: true, data: undefined });
  });

  it('has the default description', () => {
    expect(PassThroughAny.description).toBe('Pass through any value without validation.');
  });

  it('has the correct zod and kbn type', () => {
    expect(PassThroughAny instanceof z.ZodAny).toBe(true);
    expect(isPassThroughAny(PassThroughAny)).toBe(true);
  });
});
