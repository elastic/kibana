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

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_union) {
    return {
      message: `types that failed validation:
${issue.unionErrors
  .map((e, idx) => {
    return `- [${issue.path.join('.')}.${idx}]: ${e.errors[0].message}`;
  })
  .join('\n')}`,
    };
  }
  return { message: ctx.defaultError };
};

export class UnionType<RTS extends Array<Type<any>>, T> extends Type<T> {
  constructor(types: RTS, options?: TypeOptions<T>) {
    const ts = types.map((type) => type.getSchema()) as [
      z.ZodTypeAny,
      z.ZodTypeAny,
      ...z.ZodTypeAny[]
    ];
    const schema = internals.union(ts, { errorMap });
    super(schema, options);
  }
}
