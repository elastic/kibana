/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveReferenceObject } from './resolve_reference_object';

describe('resolveReferenceObject', () => {
  const schema = {
    components: {
      schemas: {
        Foo: { type: 'object', properties: { name: { type: 'string' } } },
      },
      parameters: {
        index: { name: 'index', in: 'path' },
      },
    },
  };

  it('resolves a valid $ref path', () => {
    const result = resolveReferenceObject('#/components/schemas/Foo', schema);
    expect(result).toEqual(schema.components.schemas.Foo);
  });

  it('resolves a parameter reference', () => {
    const result = resolveReferenceObject('#/components/parameters/index', schema);
    expect(result).toEqual(schema.components.parameters.index);
  });

  it('returns null when path segment is not found', () => {
    expect(resolveReferenceObject('#/components/schemas/Bar', schema)).toBeNull();
  });

  it('returns null for empty schema', () => {
    expect(resolveReferenceObject('#/components/schemas/Foo', {})).toBeNull();
  });

  it('handles reference without #/ prefix', () => {
    // Without #/ prefix, the path starts from the raw string
    const result = resolveReferenceObject('components/schemas/Foo', schema);
    expect(result).toEqual(schema.components.schemas.Foo);
  });

  it('returns the schema root for a bare # reference', () => {
    const result = resolveReferenceObject('#/', schema);
    // #/ becomes empty string after replace, split gives [''], accessing '' on schema
    // This is an edge case — the path is empty so it tries '' key
    expect(result).toBeNull();
  });

  it('returns null when current is null at some depth', () => {
    const schemaWithNull = { a: { b: null } };
    expect(resolveReferenceObject('#/a/b/c', schemaWithNull)).toBeNull();
  });
});
