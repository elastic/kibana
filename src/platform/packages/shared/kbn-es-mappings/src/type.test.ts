/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as mappings from './mappings';
import type { DocumentOf } from './types';

const typeTest: DocumentOf<
  {
    dynamic: false;
    test123: {
      properties: {
        keyword_no_enum: { type: 'keyword' };
        date_no_format: { type: 'date' };
        date_nanos: { type: 'date_nanos' };
        name: { type: 'text' };
        obj: {
          type: 'object';
          properties: { email: { type: 'keyword'; enum: ['test@test.com'] } };
        };
      };
    };
  },
  'test123'
> = {
  name: 'test',
  obj: { email: 'test@test.com' },
  date_no_format: '2021-01-01',
  date_nanos: '2021-01-01T00:00:00.000000000Z',
  keyword_no_enum: 'test',
};

expect(typeTest).toBeDefined();

// We define the mapping type to make sure it matches the mapping definition created by the mappings helpers
interface TestMappingDefinition {
  properties: {
    a: { type: 'keyword' };
    b: { type: 'text' };
    c: { type: 'integer' };
    d: { type: 'long' };
    e: { type: 'short' };
    f: { type: 'boolean' };
    g: { type: 'date' };
    h: { type: 'date_nanos' };
    i: { type: 'object'; properties: { a: { type: 'keyword' }; b: { type: 'long' } } };
  };
}

const testClient = {
  mappings: {
    dynamic: false,
    properties: {
      a: mappings.text(),
      b: mappings.integer(),
      c: mappings.long(),
      d: mappings.short(),
      e: mappings.boolean(),
      f: mappings.date(),
      g: mappings.dateNanos(),
      h: { properties: { a: mappings.keyword(), b: mappings.long() } },
    },
  },
};

// We type the document explicitly to make sure typescript infers the same types.
type TypedDocument = DocumentOf<typeof testClient>;

describe('createTypedMappings', () => {
  it('should create a typed mappings object', () => {
    // We create a mapping definition that matches the mapping definition created by the mappings helpers
    // Defined here as part of the TS where the typecheck would fail if it doesnt match anymore.
    const mappingDefinition: TestMappingDefinition = {};

    // We create a document that matches the mapping definition
    // Defined here as part of the TS where the typecheck would fail if it doesnt match anymore.
    const testDoc: TypedDocument = {
      a: 'test',
      b: 'test',
      c: 1,
      d: 1,
      e: 1,
      f: true,
      g: '2021-01-01',
      h: '2021-01-01',
      i: { a: 'test', b: 1 },
    };

    // nothing to test here, just make sure the types are inferred correctly
    expect(testDoc).toBeDefined();
    // nothing to test here, just make sure the types are inferred correctly
    expect(mappingDefinition).toBeDefined();
  });
});
