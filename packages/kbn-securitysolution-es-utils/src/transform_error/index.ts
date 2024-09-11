/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { stringifyZodError } from '@kbn/zod-helpers';
import { ZodError } from '@kbn/zod';
import { BadRequestError } from '../bad_request_error';

export interface OutputError {
  message: string;
  statusCode: number;
}

export const transformError = (err: Error & Partial<errors.ResponseError>): OutputError => {
  if (Boom.isBoom(err)) {
    return {
      message: err.output.payload.message,
      statusCode: err.output.statusCode,
    };
  } else if (err instanceof ZodError) {
    const message = stringifyZodError(err);

    return {
      message,
      // These errors can occur when handling requests after validation and can
      // indicate of issues in business logic, so they are 500s instead of 400s
      statusCode: 500,
    };
  } else {
    if (err.statusCode != null) {
      if (err.body != null && err.body.error != null) {
        return {
          statusCode: err.statusCode,
          message: `${err.body.error.type}: ${err.body.error.reason}`,
        };
      } else {
        return {
          statusCode: err.statusCode,
          message: err.message,
        };
      }
    } else if (err instanceof BadRequestError) {
      // allows us to throw request validation errors in the absence of Boom
      return {
        message: err.message,
        statusCode: 400,
      };
    } else {
      // natively return the err and allow the regular framework
      // to deal with the error when it is a non Boom
      return {
        message: err.message != null ? err.message : '(unknown error message)',
        statusCode: 500,
      };
    }
  }
};
