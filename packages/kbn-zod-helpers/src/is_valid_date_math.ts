/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as z from 'zod';
import dateMath from '@kbn/datemath';

function validateDateMath(time: string): boolean {
  const isValidDateString = !isNaN(Date.parse(time));
  if (isValidDateString) {
    return true;
  }
  const isDateMath = time.trim().startsWith('now');
  if (isDateMath) {
    return Boolean(dateMath.parse(time));
  }
  return false;
}

export function isValidDateMath(input: string, ctx: z.RefinementCtx) {
  if (!validateDateMath(input)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Failed to parse date-math expression',
    });
  }
}
