/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import z from 'zod';
import { SchemaError } from '.';

function prefixPath(
  namespace: undefined | string,
  path: Array<string | number>,
  message: string
): string {
  const fullPath = namespace ? [namespace, ...path] : path;
  return fullPath.length ? `[${fullPath.join('.')}]: ${message}` : message;
}

export class ValidationError extends SchemaError {
  private static extractMessage(error: z.ZodError, namespace?: string, level?: number) {
    let message: string = '';
    if (error.issues.length > 1) {
      error.issues.forEach((issue) => {
        message = `${message ? message + '\n' : message} - ${prefixPath(
          namespace,
          issue.path,
          issue.message
        )}`;
      });
    } else {
      const [issue] = error.issues;
      message = prefixPath(namespace, issue.path, issue.message);
    }

    return message!;
  }

  constructor(error: z.ZodError, namespace?: string) {
    super(ValidationError.extractMessage(error, namespace), error);

    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
