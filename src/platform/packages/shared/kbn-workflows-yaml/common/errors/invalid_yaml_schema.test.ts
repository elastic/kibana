/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FormattedZodError } from './invalid_yaml_schema';
import { InvalidYamlSchemaError } from './invalid_yaml_schema';

describe('InvalidYamlSchemaError', () => {
  it('sets name and message', () => {
    const error = new InvalidYamlSchemaError('bad schema');
    expect(error.name).toBe('InvalidYamlSchemaError');
    expect(error.message).toBe('bad schema');
    expect(error).toBeInstanceOf(Error);
  });

  it('stores formattedZodError when provided', () => {
    const zodError: FormattedZodError = {
      message: 'validation failed',
      issues: [
        {
          code: 'invalid_literal' as const,
          message: 'wrong value',
          path: ['steps', '0', 'type'],
          received: 'foo',
        },
      ],
    };
    const error = new InvalidYamlSchemaError('bad schema', zodError);
    expect(error.formattedZodError).toBe(zodError);
  });

  it('leaves formattedZodError undefined when not provided', () => {
    const error = new InvalidYamlSchemaError('bad schema');
    expect(error.formattedZodError).toBeUndefined();
  });
});
