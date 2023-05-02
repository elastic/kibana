/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import z from 'zod';

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  const value = ctx.data as unknown[];
  if (issue.code === z.ZodIssueCode.too_small) {
    return {
      message: `array size is [${value.length}], but cannot be smaller than [${issue.minimum}]`,
    };
  }
  if (issue.code === z.ZodIssueCode.too_big) {
    return {
      message: `array size is [${value.length}], but cannot be greater than [${issue.maximum}]`,
    };
  }
  return { message: ctx.defaultError };
};

export const array: typeof z.array = (schema, options) => z.array(schema, { errorMap, ...options });
