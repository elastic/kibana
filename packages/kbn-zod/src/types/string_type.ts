/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import z from 'zod';

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  const value = ctx.data as string;
  if (issue.code === z.ZodIssueCode.too_small) {
    return {
      message: `value has length [${value.length}] but it must have a minimum length of [${issue.minimum}].`,
    };
  }
  if (issue.code === z.ZodIssueCode.too_big) {
    return {
      message: `value has length [${value.length}] but it must have a maximum length of [${issue.maximum}].`,
    };
  }
  return { message: ctx.defaultError };
};

export const string: typeof z.string = (options) => z.string({ errorMap, ...options });
