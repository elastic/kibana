/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import z from 'zod';
import { internals } from '../internals';
import { Type } from './type';

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_literal) {
    return { message: `expected value to equal [${issue.expected}]` };
  }
  return { message: ctx.defaultError };
};

export class LiteralType<T extends z.Primitive> extends Type<T> {
  constructor(value: T) {
    super(internals.literal(value, { errorMap }));
  }
}
