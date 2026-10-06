/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadOperations } from './load_operations';
import { getSchemaValidator } from './schema_compiler';

const validatorFor = (openapi: string) => {
  const [{ spec, responses }] = loadOperations({
    openapi,
    info: { title: 'Test', version: '1' },
    paths: {
      '/pair': {
        get: {
          responses: {
            '200': {
              description: 'ok',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Pair' } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Pair: { type: 'array', prefixItems: [{ $ref: '#/components/schemas/Id' }] },
        Id: { type: 'integer', format: 'int32' },
      },
    },
  });
  const schema = responses[0].contents[0].schema;
  if (!schema) {
    throw new Error('missing schema');
  }
  return getSchemaValidator(spec, schema);
};

describe('getSchemaValidator', () => {
  it('compiles schemas in place, resolving refs against the document', () => {
    const validate = validatorFor('3.1.0');

    expect(validate([1])).toBe(true);
    expect(validate(['a'])).toBe(false);
    expect(validatorFor('3.1.0')).not.toBe(validate);
  });

  it('validates OpenAPI 3.1 as draft 2020-12 and OpenAPI 3.0 as draft-07', () => {
    // `prefixItems` only exists in draft 2020-12; draft-07 ignores it.
    expect(validatorFor('3.0.3')(['a'])).toBe(true);
  });
});
