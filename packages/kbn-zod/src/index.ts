/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import typeDetect from 'type-detect';
import * as z from './zod';

// const globalErrorMap: z.ZodErrorMap = (issue, ctx) => {
//   if (issue.code === z.ZodIssueCode.invalid_type) {
//     return {
//       message: `expected value of type [${issue.expected}] but got [${typeDetect(ctx.data)}]`,
//     };
//   }
//   return { message: ctx.defaultError };
// };
// z.setErrorMap(globalErrorMap);

export function instanceofZodType(type: any): type is z.ZodTypeAny {
  return !!type?._def?.typeName;
}

function prefixPath(path: Array<string | number>, message: string): string {
  return path.length ? `[${path.join('.')}]: ${message}` : message;
}

export function extractErrorMessage(error: z.ZodError): string {
  let message: string = '';
  if (error.issues.length > 1) {
    error.issues.forEach((issue) => {
      message = `${message ? message + '\n' : message} - ${prefixPath(issue.path, issue.message)}`;
    });
  } else {
    const [issue] = error.issues;
    message = prefixPath(issue.path, issue.message);
  }
  return message;
}

export { z };
