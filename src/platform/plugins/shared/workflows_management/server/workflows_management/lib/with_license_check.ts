/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandler, RouteMethod } from '@kbn/core/server';
import type { WorkflowsRequestHandlerContext } from '../../types';

/**
 * Wraps a request handler with a check for the Enterprise license.
 * If the license is not valid, it will return a 403 error with a message.
 */
export const withLicenseCheck = <
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = never
>(
  handler: RequestHandler<P, Q, B, WorkflowsRequestHandlerContext, Method>
): RequestHandler<P, Q, B, WorkflowsRequestHandlerContext, Method> => {
  return async (context, request, response) => {
    const { licensing } = await context.resolve(['licensing']);

    if (!licensing.license.isAvailable || !licensing.license.isActive) {
      return response.forbidden({
        body: {
          message: 'License information is not available or license is inactive.',
        },
      });
    }

    if (!licensing.license.hasAtLeast('enterprise')) {
      return response.forbidden({
        body: {
          message:
            'Your license does not support Workflows Management. Please upgrade to an Enterprise license.',
        },
      });
    }

    return handler(context, request, response);
  };
};
