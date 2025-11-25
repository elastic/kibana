/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ZodIssueCode, z } from '@kbn/zod';

// @kbn/config-schema objects and records supports a json string as input if it can be
// safely parsed using JSON.parse and if the resulting value is a plain object.
// https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-config-schema/README.md#schemaobject
// this is not built into zod objects so we need to add it as a preprocessor
const parseJsonPreprocessor = (value: any, ctx: z.RefinementCtx) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: (e as Error).message,
      });
    }
  }

  return value;
};

export const Coerced = (objSchema: z.ZodType) => {
  return z.preprocess(parseJsonPreprocessor, objSchema);
};
