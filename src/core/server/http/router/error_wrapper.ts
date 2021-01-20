/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Boom from '@hapi/boom';
import { RequestHandlerWrapper } from './router';

export const wrapErrors: RequestHandlerWrapper = (handler) => {
  return async (context, request, response) => {
    try {
      return await handler(context, request, response);
    } catch (e) {
      if (Boom.isBoom(e)) {
        return response.customError({
          body: e.output.payload,
          statusCode: e.output.statusCode,
          headers: e.output.headers as { [key: string]: string },
        });
      }
      throw e;
    }
  };
};
