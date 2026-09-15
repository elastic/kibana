/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getFieldsFromZodSchema } from './get_step_preview_fields';

describe('getFieldsFromZodSchema', () => {
  it('marks optional fields and extracts descriptions', () => {
    const schema = z.object({
      mode: z.enum(['fast', 'accurate']).describe('Processing mode'),
      note: z.string().describe('Optional note').optional(),
    });

    expect(getFieldsFromZodSchema(schema)).toEqual([
      {
        name: 'mode',
        typeName: expect.any(String),
        description: 'Processing mode',
        required: true,
      },
      {
        name: 'note',
        typeName: 'STRING',
        description: 'Optional note',
        required: false,
      },
    ]);
  });
});
