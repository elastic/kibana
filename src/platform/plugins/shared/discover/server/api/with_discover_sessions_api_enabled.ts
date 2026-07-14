/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandler, RequestHandlerContext, RouteMethod } from '@kbn/core/server';
import {
  DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_DEFAULT,
  DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_KEY,
} from '../../common/constants';

export const withDiscoverSessionsApiEnabled =
  <P, Q, B, Context extends RequestHandlerContext, Method extends RouteMethod>(
    handler: RequestHandler<P, Q, B, Context, Method>
  ): RequestHandler<P, Q, B, Context, Method> =>
  async (context, request, response) => {
    const { featureFlags } = await context.core;
    const isEnabled = await featureFlags.getBooleanValue(
      DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_KEY,
      DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_DEFAULT
    );

    if (!isEnabled) {
      return response.notFound();
    }

    return handler(context, request, response);
  };
