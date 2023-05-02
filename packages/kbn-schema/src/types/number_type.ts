/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import z from 'zod';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';

export type NumberOptions = TypeOptions<number> & {
  min?: number;
  max?: number;
};

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.too_small) {
    return {
      message: `Value must be equal to or greater than [${issue.minimum}].`,
    };
  }
  if (issue.code === z.ZodIssueCode.too_big) {
    return {
      message: `Value must be equal to or lower than [${issue.maximum}].`,
    };
  }
  return {
    message: ctx.defaultError,
  };
};

export class NumberType extends Type<number> {
  constructor(options: NumberOptions = {}) {
    let schema = internals.number({ errorMap });
    if (options.min !== undefined) {
      schema = schema.min(options.min);
    }

    if (options.max !== undefined) {
      schema = schema.max(options.max);
    }

    super(schema, options);
  }
}
