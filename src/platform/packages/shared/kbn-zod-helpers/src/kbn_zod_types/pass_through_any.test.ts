/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z from '@kbn/zod';
import { PassThroughAny, isPassThroughAny } from './pass_through_any';

describe('PassThroughAny', () => {
  it('should validate any value', () => {
    const passThroughAny = PassThroughAny;
    expect(passThroughAny.safeParse({ foo: 'bar' })).toEqual({
      success: true,
      data: { foo: 'bar' },
    });
    expect(passThroughAny.safeParse('foo')).toEqual({ success: true, data: 'foo' });
    expect(passThroughAny.safeParse(123)).toEqual({ success: true, data: 123 });
    expect(passThroughAny.safeParse(true)).toEqual({ success: true, data: true });
    expect(passThroughAny.safeParse(null)).toEqual({ success: true, data: null });
    expect(passThroughAny.safeParse(undefined)).toEqual({ success: true, data: undefined });
  });

  it('has the default description', () => {
    expect(PassThroughAny.description).toBe('Pass through any value without validation.');
  });

  it('has the correct zod and kbn type', () => {
    expect(PassThroughAny instanceof z.ZodAny).toBe(true);
    expect(PassThroughAny._def.typeName).toBe(z.ZodFirstPartyTypeKind.ZodAny);
    expect(isPassThroughAny(PassThroughAny)).toBe(true);
  });
});
