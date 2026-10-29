/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

import { expectPrettyError } from './expect_pretty_error';

describe('expectPrettyError', () => {
  it('should return a pretty error', () => {
    const result = z.object({ name: z.string() }).safeParse({ name: 123 });
    expectPrettyError(result).toMatchInlineSnapshot(`
      "✖ Invalid input: expected string, received number
        → at name"
    `);
  });
});
