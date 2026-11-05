/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomBytes } from 'node:crypto';
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const registerBenchmarkRoute = (router: IRouter<RequestHandlerContext>) => {
  router.get(
    {
      path: '/api/benchmark',
      security: {
        authc: { enabled: false, reason: 'Benchmark endpoint for sidecar proxy testing.' },
        authz: { enabled: false, reason: 'Benchmark endpoint for sidecar proxy testing.' },
      },
      options: {
        access: 'public',
        excludeFromRateLimiter: true,
      },
      validate: {
        request: {
          query: schema.object({
            size: schema.number({ min: 0, max: MAX_SIZE, defaultValue: 1024 }),
          }),
        },
      },
    },
    async (_context, req, res) => {
      const { size } = req.query;
      const body = randomBytes(size).toString('base64url').slice(0, size);
      return res.ok({ body });
    }
  );
};
