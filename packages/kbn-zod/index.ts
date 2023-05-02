/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import z from 'zod';
import type ZodTypes from 'zod';
import typeDetect from 'type-detect';
import * as customTypes from './src/types';

const globalErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    return {
      message: `expected value of type [${issue.expected}] but got [${typeDetect(ctx.data)}]`,
    };
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(globalErrorMap);

const internal = {
  ...z,
  ...customTypes,
};

export const instanceofZodType = (type: any): type is z.ZodTypeAny => {
  return !!type?._def?.typeName;
};

export { internal as z, ZodTypes };
