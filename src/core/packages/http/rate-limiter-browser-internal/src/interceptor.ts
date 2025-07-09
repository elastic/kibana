/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type HttpInterceptor } from '@kbn/core-http-browser';
import { getRetryAfter, isRateLimiterError } from './utils';

const MAX_ATTEMPTS = 3;

export const rateLimiterInterceptor: HttpInterceptor = {
  async fetch(next, options, controller) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await next(options);
      } catch (error) {
        if (attempt >= MAX_ATTEMPTS || !isRateLimiterError(error)) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, getRetryAfter(error) * 1000));

        if (controller.halted) {
          throw error;
        }
      }
    }
  },
};
