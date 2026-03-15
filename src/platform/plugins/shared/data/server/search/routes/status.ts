/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import type { DataPluginRouter } from '../types';

export function registerStatusRoute(router: DataPluginRouter, logger: Logger): void {
  router.versioned
    .get({
      path: '/internal/data/_status',
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route provides a minimal status response for protocol detection and does not access sensitive data.',
        },
      },
      options: {
        excludeFromRateLimiter: true,
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {},
          response: {
            200: {
              description: 'Status endpoint is responding normally',
              body: () =>
                schema.object({
                  status: schema.literal('ok'),
                }),
            },
          },
        },
      },
      async (context, req, res) => {
        return res.ok({
          body: {
            status: 'ok',
          },
        });
      }
    );
}
