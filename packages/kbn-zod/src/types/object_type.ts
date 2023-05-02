/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import z from 'zod';

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.unrecognized_keys) {
    if (issue.keys.length === 1) {
      return {
        message: `definition for [${issue.keys[0]}] key is missing`,
      };
    }
    return { message: `definition for these keys is missing: [${issue.keys.join(', ')}]` };
  }
  return { message: ctx.defaultError };
};

export const object: typeof z.object = (schema, options) =>
  z.object(schema, { errorMap, ...options });
