/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { buildWithParamsFromFormValues, getFieldsFromZodSchema } from './get_step_preview_fields';

describe('getFieldsFromZodSchema', () => {
  it('marks optional fields and extracts enum options', () => {
    const schema = z.object({
      mode: z.enum(['fast', 'accurate']).describe('Processing mode'),
      note: z.string().optional().describe('Optional note on the outer schema'),
    });

    expect(getFieldsFromZodSchema(schema)).toEqual([
      {
        name: 'mode',
        typeName: expect.any(String),
        description: 'Processing mode',
        required: true,
        enumOptions: ['fast', 'accurate'],
      },
      {
        name: 'note',
        typeName: 'STRING',
        description: 'Optional note on the outer schema',
        required: false,
        enumOptions: undefined,
      },
    ]);
  });
});

describe('buildWithParamsFromFormValues', () => {
  const fields = [
    { name: 'required_a', typeName: 'STRING', required: true },
    { name: 'optional_b', typeName: 'STRING', required: false },
    { name: 'optional_c', typeName: 'STRING', required: false },
  ];

  it('keeps empty required fields as empty strings and omits empty optional fields', () => {
    expect(
      buildWithParamsFromFormValues(fields, {
        required_a: '  ',
        optional_b: 'hello',
        optional_c: '',
      })
    ).toEqual({
      required_a: '',
      optional_b: 'hello',
    });
  });
});
