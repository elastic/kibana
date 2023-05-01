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

export function extractExpectedUnionValues(
  issue: z.ZodInvalidUnionIssue,
  values: string[] = []
): string[] {
  issue.unionErrors.forEach((e) => {
    e.issues.forEach((i) => {
      if (i.code === z.ZodIssueCode.invalid_type || i.code === z.ZodIssueCode.invalid_literal) {
        if (i.path.length) {
          const path = i.path.join('.');
          values.push(`{ [${path}]: ${i.expected} } but got { [${path}]: ${i.received} }`);
        } else {
          values.push(`[${i.expected}] but got [${i.received}]`);
        }
      } else if (i.code === z.ZodIssueCode.invalid_union) {
        extractExpectedUnionValues(i, values);
      }
    });
  });
  return values;
}

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_union) {
    return {
      message: `expected one of:
  ${extractExpectedUnionValues(issue)
    .map((s) => `| ${s}`)
    .join('\n  ')}
`,
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
