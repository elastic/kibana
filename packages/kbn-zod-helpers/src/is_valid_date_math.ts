/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as z from 'zod';
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';

export function isValidDateMath(input: string, ctx: z.RefinementCtx) {
  const parsedInput = parseScheduleDates(input);
  if (parsedInput == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Failed to parse date-math expression',
    });
  }
}
