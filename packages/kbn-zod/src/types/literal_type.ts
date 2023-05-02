/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import z from 'zod';

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_literal) {
    return { message: `expected value to equal [${issue.expected}]` };
  }
  return { message: ctx.defaultError };
};

export const literal: typeof z.literal = (value, options) =>
  z.literal(value, { errorMap, ...options });
