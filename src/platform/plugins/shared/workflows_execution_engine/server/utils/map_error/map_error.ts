/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExecutionError } from '@kbn/workflows';
import { ExecutionErrorSchema } from '@kbn/workflows';

export function mapError(error: Error | ExecutionError | string | unknown): ExecutionError {
  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
    };
  } else if (typeof error === 'string') {
    return {
      type: 'Error',
      message: error,
    };
  } else if (
    typeof error === 'object' &&
    ExecutionErrorSchema.safeParse(error as ExecutionError).success
  ) {
    return error as ExecutionError;
  }

  return {
    type: 'UnknownError',
    message: 'An unknown error occurred',
    details: error,
  };
}
