/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import typeDetect from 'type-detect';
import z from 'zod';

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    return {
      message: `expected value of type [${issue.expected}] but got [${typeDetect(ctx.data)}]`,
    };
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(errorMap);

/**
 * To add custom types to Zod we can add them to the internals object here.
 */
export const internals = {
  ...z,
};
