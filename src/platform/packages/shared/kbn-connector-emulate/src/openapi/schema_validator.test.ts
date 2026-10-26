/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadOperations } from './load_operations';
import { getSchemaValidator } from './schema_validator';

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
        Pair: { type: 'array', items: { $ref: '#/components/schemas/Id%20Value', maximum: 9 } },
        'Id Value': { type: 'integer', format: 'int32', example: { id: 'not-a-schema' } },
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
  it('validates schemas in place, resolving refs against the document', () => {
    const validate = validatorFor('3.1.0');

    expect(validate([1])).toEqual([]);
    expect(validate(['a'])).toContainEqual(
      expect.objectContaining({ keyword: 'type', instanceLocation: '#/0' })
    );
  });

  it('validates OpenAPI 3.1 as draft 2020-12 and OpenAPI 3.0 as draft-07', () => {
    // Draft-07, like OpenAPI 3.0, ignores keywords next to `$ref`; draft 2020-12 applies them.
    expect(validatorFor('3.0.3')([10])).toEqual([]);
    expect(validatorFor('3.1.0')([10])).toContainEqual(
      expect.objectContaining({ keyword: 'maximum', instanceLocation: '#/0' })
    );
  });
});
