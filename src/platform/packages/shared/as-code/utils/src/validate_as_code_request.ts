/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnRequestValidationError, VersionedRouteValidation } from '@kbn/core-http-server';
import { ZodError } from '@kbn/zod';
import { formatValidationError } from './format_validation_error';

/** Formats request validation messages while leaving request and response schemas unchanged. */
export const validateAsCodeRequest = <
  Validation extends VersionedRouteValidation<unknown, unknown, unknown>
>(
  validation: Validation
): Validation & { onRequestValidationError: OnRequestValidationError } => ({
  ...validation,
  onRequestValidationError: ({ message, rawError }, _request, response) => {
    if (!(rawError instanceof ZodError)) return response.badRequest({ body: { message } });
    return response.badRequest({
      body: {
        message: formatValidationError(rawError.issues),
        attributes: { issues: rawError.issues },
      },
    });
  },
});
