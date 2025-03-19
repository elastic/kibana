/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';
import { META_FIELD_X_OAS_DEPRECATED, META_FIELD_X_OAS_DISCONTINUED } from '../oas_meta_fields';

class MyType extends Type<any> {
  constructor(opts: TypeOptions<any> = {}) {
    super(internals.any(), opts);
  }
}

describe('meta', () => {
  it('sets meta when provided', () => {
    const type = new MyType({
      meta: { description: 'my description', deprecated: true },
    });
    const meta = type.getSchema().describe();
    expect(get(meta, 'flags.description')).toBe('my description');
    expect(get(meta, `metas[0].${META_FIELD_X_OAS_DEPRECATED}`)).toBe(true);
    expect(get(meta, `metas[1].${META_FIELD_X_OAS_DISCONTINUED}`)).toBeUndefined();
  });

  it('sets meta with all fields provided', () => {
    const type = new MyType({
      meta: { description: 'my description', deprecated: true, 'x-discontinued': '9.0.0' },
    });
    const meta = type.getSchema().describe();
    expect(get(meta, 'flags.description')).toBe('my description');

    expect(get(meta, `metas[0].${META_FIELD_X_OAS_DEPRECATED}`)).toBe(true);

    expect(get(meta, `metas[1].${META_FIELD_X_OAS_DISCONTINUED}`)).toBe('9.0.0');
  });

  it('does not set meta when no provided', () => {
    const type = new MyType();
    const meta = type.getSchema().describe();
    expect(get(meta, 'flags.description')).toBeUndefined();
    expect(get(meta, 'metas')).toBeUndefined();
  });
});
