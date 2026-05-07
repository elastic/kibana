/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z as zod } from '@kbn/zod';
import type { TypeOptions } from './type';
import { Type } from './type';
import {
  META_FIELD_X_OAS_AVAILABILITY,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_DISCONTINUED,
} from '../oas_meta_fields';

class MyType extends Type<any> {
  constructor(opts: TypeOptions<any> = {}) {
    super(zod.any(), opts);
  }
}

describe('meta', () => {
  it('sets meta when provided', () => {
    const type = new MyType({
      meta: { description: 'my description', deprecated: true },
    });
    const schema = type.getSchema();
    expect(schema.description).toBe('my description');
    expect(schema.meta()?.[META_FIELD_X_OAS_DEPRECATED]).toBe(true);
    expect(schema.meta()?.[META_FIELD_X_OAS_DISCONTINUED]).toBeUndefined();
  });

  it('sets discontinued metadata when provided', () => {
    const type = new MyType({
      meta: {
        deprecated: true,
        'x-discontinued': '9.0.0',
      },
    });
    const schema = type.getSchema();
    expect(schema.description).toBeUndefined();
    expect(schema.meta()?.[META_FIELD_X_OAS_DEPRECATED]).toBe(true);
    expect(schema.meta()?.[META_FIELD_X_OAS_DISCONTINUED]).toBe('9.0.0');
    expect(schema.meta()?.[META_FIELD_X_OAS_AVAILABILITY]).toBeUndefined();
  });

  it('sets availability metadata when provided', () => {
    const type = new MyType({
      meta: {
        availability: { stability: 'stable', since: '9.4.0' },
      },
    });
    const schema = type.getSchema();
    expect(schema.description).toBeUndefined();
    expect(schema.meta()?.[META_FIELD_X_OAS_DISCONTINUED]).toBeUndefined();
    expect(schema.meta()?.[META_FIELD_X_OAS_AVAILABILITY]).toEqual({
      stability: 'stable',
      since: '9.4.0',
    });
  });

  it('does not set meta when no provided', () => {
    const type = new MyType();
    const schema = type.getSchema();
    expect(schema.description).toBeUndefined();
    expect(schema.meta()).toBeUndefined();
  });
});
