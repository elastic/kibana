/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnRequestValidationError } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import { logRequest } from '@kbn/as-code-utils';
import { ZodError } from '@kbn/zod';
import { formatValidationError } from './format_validation_error';

/** Formats and logs request validation errors while preserving messages from non-Zod validators. */
export const createOnRequestValidationError =
  (logger: Logger): OnRequestValidationError =>
  ({ message, rawError }, request, response) => {
    const formattedMessage =
      rawError instanceof ZodError ? formatValidationError(rawError.issues) : message;

    logRequest(logger, request, 'warn', formattedMessage);

    return response.badRequest({ body: { message: formattedMessage } });
  };
