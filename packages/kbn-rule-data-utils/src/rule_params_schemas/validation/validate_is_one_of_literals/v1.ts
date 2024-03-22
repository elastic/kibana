/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER, RefinementCtx, ZodIssueCode } from 'zod';

export const validateIsOneOfLiterals = (
  arrayOfLiterals: Readonly<string[]>
) => (
  value: string, 
  zodRefinementCtx: RefinementCtx
) =>{
  if (!arrayOfLiterals.includes(value)) {
    zodRefinementCtx.addIssue({
      code: ZodIssueCode.custom,
      message: `must be one of ${arrayOfLiterals.join(' | ')}`,
      fatal: true,
    });

    return NEVER;
  }
};
