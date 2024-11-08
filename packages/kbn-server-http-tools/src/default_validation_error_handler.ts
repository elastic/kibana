/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Lifecycle, Request, ResponseToolkit, Utils } from '@hapi/hapi';
import { ValidationError } from 'joi';
import Hoek from '@hapi/hoek';

/**
 * Hapi extends the ValidationError interface to add this output key with more data.
 */
export interface HapiValidationError extends ValidationError {
  output: {
    statusCode: number;
    headers: Utils.Dictionary<string | string[]>;
    payload: {
      statusCode: number;
      error: string;
      message?: string;
      validation: {
        source: string;
        keys: string[];
      };
    };
  };
}

/**
 * Used to replicate Hapi v16 and below's validation responses. Should be used in the routes.validate.failAction key.
 */
export function defaultValidationErrorHandler(
  request: Request,
  h: ResponseToolkit,
  err?: Error
): Lifecycle.ReturnValue {
  // Newer versions of Joi don't format the key for missing params the same way. This shim
  // provides backwards compatibility. Unfortunately, Joi doesn't export it's own Error class
  // in JS so we have to rely on the `name` key before we can cast it.
  //
  // The Hapi code we're 'overwriting' can be found here:
  //     https://github.com/hapijs/hapi/blob/master/lib/validation.js#L102
  if (err && err.name === 'ValidationError' && Object.hasOwn(err, 'output')) {
    const validationError: HapiValidationError = err as HapiValidationError;
    const validationKeys: string[] = [];

    validationError.details.forEach((detail) => {
      if (detail.path.length > 0) {
        validationKeys.push(Hoek.escapeHtml(detail.path.join('.')));
      } else {
        // If no path, use the value sigil to signal the entire value had an issue.
        validationKeys.push('value');
      }
    });

    validationError.output.payload.validation.keys = validationKeys;
  }

  throw err;
}
