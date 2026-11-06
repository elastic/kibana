/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema as configSchema } from '@kbn/config-schema';
import {
  executionIdParamSchema,
  hasSearchAfterCursor,
  idParamSchema,
  validatePaginationWindow,
  workflowIdParamSchema,
} from './schemas';

describe.each([
  { parameter: 'id', schema: idParamSchema },
  { parameter: 'executionId', schema: executionIdParamSchema },
  { parameter: 'workflowId', schema: workflowIdParamSchema },
])('$parameter route parameter', ({ parameter, schema }) => {
  it('accepts an ID at the length limit', () => {
    const params = { [parameter]: 'a'.repeat(255) };
    expect(schema.validate(params)).toEqual(params);
  });

  it('rejects an ID above the length limit', () => {
    expect(() => schema.validate({ [parameter]: 'a'.repeat(256) })).toThrow(
      'value has length [256] but it must have a maximum length of [255]'
    );
  });
});

describe('validatePaginationWindow', () => {
  const querySchema = configSchema.object(
    {
      page: configSchema.maybe(configSchema.number({ min: 1 })),
      size: configSchema.maybe(configSchema.number({ min: 1 })),
    },
    { validate: validatePaginationWindow(100) }
  );

  it('accepts the last page inside the result window', () => {
    expect(querySchema.validate({ page: 100, size: 100 })).toEqual({ page: 100, size: 100 });
  });

  it('rejects a page past the result window', () => {
    expect(() => querySchema.validate({ page: 101, size: 100 })).toThrow(
      'page * size must not exceed 10000'
    );
  });

  it('uses the default size when size is omitted', () => {
    expect(() => querySchema.validate({ page: 101 })).toThrow('page * size must not exceed 10000');
  });

  it('accepts a request without a page', () => {
    expect(querySchema.validate({ size: 100 })).toEqual({ size: 100 });
  });
});

describe('hasSearchAfterCursor', () => {
  it.each([
    ['[1700000000000,"id"]', true],
    ['[]', false],
    ['not json', false],
    ['{}', false],
    [undefined, false],
  ])('returns %s -> %s', (searchAfter, expected) => {
    expect(hasSearchAfterCursor(searchAfter)).toBe(expected);
  });
});
