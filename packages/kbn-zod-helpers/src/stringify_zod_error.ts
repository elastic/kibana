/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ZodError } from 'zod';

export function stringifyZodError(err: ZodError<any>) {
  return err.issues
    .map((issue) => {
      // If the path is empty, the error is for the root object
      if (issue.path.length === 0) {
        return issue.message;
      }
      return `${issue.path.join('.')}: ${issue.message}`;
    })
    .join(', ');
}
