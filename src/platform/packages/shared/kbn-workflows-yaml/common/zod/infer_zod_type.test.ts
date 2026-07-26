/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectZodSchemaEqual } from '@kbn/workflows/common/utils/zod/test_utils/expect_zod_schema_equal';
import { z } from '@kbn/zod/v4';
import { inferZodType } from './infer_zod_type';

describe('inferZodType', () => {
  it('should return the correct type', () => {
    expectZodSchemaEqual(
      inferZodType({ a: 'b', c: 1, d: true, e: [1, 2, 3], f: { g: 'h' } }),
      z.object({
        a: z.string(),
        c: z.number(),
        d: z.boolean(),
        e: z.array(z.number()).length(3),
        f: z.object({ g: z.string() }),
      })
    );
  });
});
