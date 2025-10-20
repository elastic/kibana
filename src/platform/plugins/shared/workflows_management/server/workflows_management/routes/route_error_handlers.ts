/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';
import {
  InvalidYamlSchemaError,
  InvalidYamlSyntaxError,
  isWorkflowValidationError,
} from '../../../common/lib/errors';

/**
 * Unified error handler for workflow management routes
 * @param response - The response object from the route handler
 * @param error - The error that occurred
 * @param options - Optional configuration for error handling
 * @returns Appropriate error response
 */
export function handleRouteError(
  response: unknown,
  error: unknown,
  options?: { checkNotFound?: boolean }
) {
  const res = response as {
    notFound: () => unknown;
    badRequest: (args: { body: unknown }) => unknown;
    customError: (args: { statusCode: number; body: unknown }) => unknown;
  };
  // Check for specific error types that need special handling
  if (options?.checkNotFound && error instanceof WorkflowExecutionNotFoundError) {
    return res.notFound();
  }

  if (error instanceof InvalidYamlSyntaxError || error instanceof InvalidYamlSchemaError) {
    return res.badRequest({
      body: {
        message: `Invalid workflow yaml: ${error.message}`,
      },
    });
  }

  if (isWorkflowValidationError(error)) {
    return res.badRequest({
      body: error.toJSON(),
    });
  }

  // Generic error handler
  return res.customError({
    statusCode: 500,
    body: {
      message: `Internal server error: ${error}`,
    },
  });
}
